const express = require('express');
const cors = require('cors');
// The validator is its own package, in ../validator, with no dependencies.
const validator = require('../../validator');
const { checkDsn, MEMBER_RE, profileProblem, format, keywordHelp } = validator;

const MAX_LIBRARY = 50;
const {
    ZOS_LEVELS,
    DEFAULT_ZOS_LEVEL,
    JES_TYPES,
    JES3_LAST_LEVEL,
    DEFAULT_JES,
    isZosLevel,
    isJes,
    jesAvailable
} = validator;
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
                    analytics.record({ path: `api/jes/${res.locals.jes}`, title: `Direct API JES: ${res.locals.jes}`, ...client });
                }
            });
        }

        next();
    };
}

// Why a request's library can't be used, or null when it can.
function libraryProblem(library) {
    if (library === undefined) {
        return null;
    }

    if (!Array.isArray(library)) {
        return 'library must be a list of { dsn, member, source } entries.';
    }

    if (library.length > MAX_LIBRARY) {
        return `The library can hold at most ${MAX_LIBRARY} members; found ${library.length}.`;
    }

    for (const [i, entry] of library.entries()) {
        const name = `library entry ${i + 1}${entry && typeof entry.member === 'string' ? ` (${entry.member})` : ''}`;
        if (!entry || typeof entry.source !== 'string' || typeof entry.member !== 'string' || !MEMBER_RE.test(entry.member)) {
            return `${name} needs a member name of 1-8 letters, digits or $#@ starting with a letter or $#@, and its text.`;
        }

        const dsnProblems = [];
        if (entry.dsn !== undefined && entry.dsn !== '' && entry.dsn !== null) {
            if (typeof entry.dsn !== 'string') {
                return `${name} has a library name that isn't text.`;
            }

            checkDsn(entry.dsn, 1, 1, dsnProblems);
        }

        if (dsnProblems.length) {
            return `${name} has an invalid library name '${entry.dsn}'.`;
        }
    }

    return null;
}

// Why a request's zosLevel/jes can't be used, or null when they can.
function optionsProblem(zosLevel, jes) {
    if (zosLevel !== undefined && !isZosLevel(zosLevel)) {
        return `Unknown z/OS level. Supported levels: ${ZOS_LEVELS.join(', ')}.`;
    }

    if (jes !== undefined && !isJes(jes)) {
        return `Unknown JES. Supported values: ${JES_TYPES.join(', ')}.`;
    }

    const level = zosLevel === undefined ? DEFAULT_ZOS_LEVEL : zosLevel;
    if (jes !== undefined && !jesAvailable(jes, level)) {
        return `JES3 was removed in z/OS 3.1, so it can only be checked at z/OS ${JES3_LAST_LEVEL} or earlier (requested ${level}).`;
    }

    return null;
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
        const { zosLevel, jes, library, profile } = req.body || {};
        const problem = optionsProblem(zosLevel, jes) || libraryProblem(library) || profileProblem(profile);
        if (problem) {
            return res.status(400).json({ error: 'bad_request', message: problem });
        }

        try {
            const source = req.body && typeof req.body.source === 'string' ? req.body.source : '';
            const result = validator.validate(source, {
                zosLevel,
                jes,
                library: (library || []).map(({ dsn, member, source: text }) => ({ dsn: dsn || null, member, source: text })),
                profile
            });
            res.locals.zosLevel = result.zosLevel;
            res.locals.jes = result.jes;
            res.json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'internal_error', message: err.message });
        }
    });

    // Lays the JCL out in the usual columns (feature 39); the text isn't kept.
    app.post('/api/format', countDirectUse(analytics, 'format'), (req, res) => {
        const source = req.body && req.body.source;
        if (typeof source !== 'string') {
            return res.status(400).json({ error: 'bad_request', message: 'Expected "source" to be the JCL text.' });
        }

        try {
            res.json(format(source));
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

    // Keyword descriptions for the workbench's hover explanations (feature 40).
    app.get('/api/keywords', (req, res) => {
        const zosLevel = req.query.zos === undefined ? DEFAULT_ZOS_LEVEL : req.query.zos;
        if (!isZosLevel(zosLevel)) {
            return res.status(400).json({ error: 'bad_request', message: `Unknown z/OS level. Supported levels: ${ZOS_LEVELS.join(', ')}.` });
        }

        res.json(keywordHelp(zosLevel));
    });

    // The workbench's level picker reads this, so it never keeps its own copy.
    app.get('/api/levels', (req, res) => {
        res.json({
            levels: ZOS_LEVELS.map(level => ({ level, jes3: jesAvailable('JES3', level) })),
            defaultLevel: DEFAULT_ZOS_LEVEL,
            defaultJes: DEFAULT_JES
        });
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
