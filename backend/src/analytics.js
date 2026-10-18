// Anonymous usage counting through GoatCounter's API.
//
// Hits are queued and sent in batches off the request path, so a slow or
// unreachable GoatCounter can never delay or break an API response. Without a
// token nothing is queued or sent.

const GOATCOUNTER_SITE_URL = 'https://jclcheck.goatcounter.com';
const SEND_TIMEOUT_MS = 5000;

const CODE = /^JCL[A-Z][0-9]{3}$/;
const SEMVER = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const MAJOR = /^\d{1,3}$/;

// Event names the CLI may report through POST /api/usage (feature 38).
const CLI_EVENTS = {
    'cli/run': null,
    'cli/version': d => SEMVER.test(d),
    'cli/node': d => MAJOR.test(d),
    'cli/os': ['linux', 'darwin', 'win32'],
    'cli/files': ['1', '2-10', '11-100', '100+'],
    'cli/result': ['clean', 'warnings', 'errors'],
    'cli/format': ['text', 'json', 'sarif'],
    'cli/option': ['zos', 'jes', 'library', 'profile', 'max-warnings'],
    'cli/ci': ['github', 'gitlab', 'jenkins', 'other', 'none'],
    'cli/diag': d => CODE.test(d)
};

const MAX_USAGE_EVENTS = 30;

function isAllowedCliEvent(name) {
    if (typeof name !== 'string') {
        return false;
    }

    if (Object.prototype.hasOwnProperty.call(CLI_EVENTS, name)) {
        return CLI_EVENTS[name] === null;
    }

    const slash = name.lastIndexOf('/');
    const base = name.slice(0, slash);
    const detail = name.slice(slash + 1);
    const rule = CLI_EVENTS[base];
    if (!rule || detail === '') {
        return false;
    }

    return Array.isArray(rule) ? rule.includes(detail) : rule(detail);
}

/**
 * @param {{ token?: string, siteUrl?: string, send?: Function, intervalMs?: number, maxBatch?: number, timeoutMs?: number }} options
 * @returns {{ enabled: boolean, record: (hit: object) => void, flush: () => Promise<void>, stop: () => void }}
 */
function createAnalytics({
    token,
    siteUrl = GOATCOUNTER_SITE_URL,
    send = (...args) => fetch(...args),
    intervalMs = 10000,
    maxBatch = 100,
    timeoutMs = SEND_TIMEOUT_MS
} = {}) {
    if (!token) {
        return {
            enabled: false,
            record() {},
            async flush() {},
            stop() {}
        };
    }

    let queue = [];

    async function post(hits) {
        try {
            await send(`${siteUrl}/api/v0/count`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                // no_sessions: hits without a user agent (some scripts send
                // none) are recorded instead of rejected.
                body: JSON.stringify({ no_sessions: true, hits }),
                signal: AbortSignal.timeout(timeoutMs)
            });
        } catch {
            // Dropped: counting must never affect the API.
        }
    }

    async function flush() {
        const pending = queue;
        queue = [];
        const batches = [];
        for (let i = 0; i < pending.length; i += maxBatch) {
            batches.push(post(pending.slice(i, i + maxBatch)));
        }

        await Promise.all(batches);
    }

    const timer = setInterval(flush, intervalMs);
    timer.unref();

    return {
        enabled: true,
        record({ path, title, ip, userAgent }) {
            queue.push({
                path,
                title,
                event: true,
                ip,
                user_agent: userAgent
            });
        },
        flush,
        stop() {
            clearInterval(timer);
        }
    };
}

module.exports = {
    GOATCOUNTER_SITE_URL,
    MAX_USAGE_EVENTS,
    createAnalytics,
    isAllowedCliEvent
};
