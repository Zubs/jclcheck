const express = require('express');
const cors = require('cors');
const validator = require('./validator');
const { ZOS_LEVELS, isZosLevel } = require('./levels');
const {
    GOATCOUNTER_SITE_URL,
    MAX_USAGE_EVENTS,
    createAnalytics,
    isAllowedCliEvent
} = require('./analytics');

const WORKBENCH_CLIENT = 'workbench';

function trustProxySetting(value) {
    if (value === undefined || value === '') {
        return false;
    }

    return /^\d+$/.test(value) ? Number(value) : value;
}

function optedOut(req) {
    return req.get('DNT') === '1' || req.get('Sec-GPC') === '1';
}

function resultOf(status) {
    if (status >= 500) {
        return 'error';
    }

    return status >= 400 ? 'bad-request' : 'ok';
}

// Counts API use that doesn't come from the workbench, which counts its own
// checks in the browser. Recorded after the response, so it never delays it.
function countDirectUse(analytics, endpoint) {
    return (req, res, next) => {
        if (analytics.enabled && req.get('X-JCLcheck-Client') !== WORKBENCH_CLIENT && !optedOut(req)) {
            res.on('finish', () => {
                const client = { ip: req.ip, userAgent: req.get('user-agent') };
                const result = resultOf(res.statusCode);
                analytics.record({ path: `api/${endpoint}/direct`, title: `Direct API use: ${endpoint}`, ...client });
                analytics.record({ path: `api/result/${result}`, title: `Direct API result: ${result}`, ...client });
                if (res.locals.zosLevel) {
                    const level = res.locals.zosLevel;
                    analytics.record({ path: `api/level/${level}`, title: `Direct API z/OS level: ${level}`, ...client });
                }
            });
        }

        next();
    };
}

function createApp({
    analytics = createAnalytics(),
    trustProxy = process.env.TRUST_PROXY
} = {}) {
    const app = express();
    app.set('trust proxy', trustProxySetting(trustProxy));
    app.use(cors());
    app.use(express.json({ limit: '2mb' }));

    app.post('/api/validate', countDirectUse(analytics, 'validate'), (req, res) => {
        const zosLevel = req.body ? req.body.zosLevel : undefined;
        if (zosLevel !== undefined && !isZosLevel(zosLevel)) {
            return res.status(400).json({
                error: 'bad_request',
                message: `Unknown z/OS level. Supported levels: ${ZOS_LEVELS.join(', ')}.`
            });
        }

        try {
            const source = req.body && typeof req.body.source === 'string' ? req.body.source : '';
            const result = validator.validate(source, { zosLevel });
            res.locals.zosLevel = result.zosLevel;
            res.json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'internal_error', message: err.message });
        }
    });

    // Opt-in usage reports from the CLI (feature 38), forwarded to GoatCounter.
    app.post('/api/usage', (req, res) => {
        if (optedOut(req)) {
            return res.status(204).end();
        }

        const events = req.body && req.body.events;
        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'bad_request', message: 'Expected a non-empty "events" list.' });
        }

        if (events.length > MAX_USAGE_EVENTS) {
            return res.status(400).json({ error: 'bad_request', message: `At most ${MAX_USAGE_EVENTS} events are allowed per request.` });
        }

        const rejected = events.find(e => !isAllowedCliEvent(e));
        if (rejected !== undefined) {
            return res.status(400).json({ error: 'bad_request', message: `Event not allowed: ${String(rejected).slice(0, 100)}` });
        }

        for (const name of events) {
            analytics.record({ path: name, title: `CLI: ${name}`, ip: req.ip, userAgent: req.get('user-agent') });
        }

        res.status(202).json({ status: 'accepted' });
    });

    app.get('/api/health', (req, res) => {
        res.json({ ok: true });
    });

    return app;
}

if (require.main === module) {
    const analytics = createAnalytics({
        token: process.env.GOATCOUNTER_TOKEN,
        // Only tests point this elsewhere; production always uses the real site.
        siteUrl: process.env.GOATCOUNTER_SITE_URL || GOATCOUNTER_SITE_URL
    });
    const app = createApp({ analytics });
    const PORT = process.env.PORT || 4000;
    const server = app.listen(PORT, () => {
        console.log(`JCL validation API listening on http://localhost:${server.address().port}`);
    });

    // Hosts such as Render stop the service with SIGTERM (on deploys and when an
    // idle free-tier service spins down). Send queued hits before exiting.
    let stopping = false;
    const shutdown = async () => {
        if (stopping) {
            return;
        }

        stopping = true;
        server.close();
        analytics.stop();
        await analytics.flush();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

module.exports = {
    app: createApp(),
    createApp
};
