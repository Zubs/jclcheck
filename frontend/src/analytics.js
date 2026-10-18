// The only place that talks to GoatCounter. Components call pageview() and
// track(); both do nothing unless counting is on, so the site works the same
// when the script is blocked, on localhost and previews, or when the browser
// asks not to be tracked.

import { EVENTS, isAllowed } from './analyticsEvents.js';

const SCRIPT_SRC = 'https://gc.zgo.at/count.js';
const PRODUCTION_HOST = 'jclcheck.xyz';
const KEPT_QUERY = /^(zos|jes|ref|utm_.+)$/;

let state = idle();

function idle() {
    return {
        enabled: false,
        goatcounter: null,
        queue: [],
        pageviews: 0
    };
}

function trackingRefused(nav) {
    return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

/**
 * Loads GoatCounter when it is configured, on the production site, and the
 * browser hasn't asked not to be tracked. `env` is for tests.
 */
export function initAnalytics(env = {}) {
    const {
        url = import.meta.env.VITE_GOATCOUNTER_URL,
        location = window.location,
        navigator = window.navigator,
        document = window.document,
        win = window
    } = env;

    state = idle();
    if (!url || location.hostname !== PRODUCTION_HOST || trackingRefused(navigator)) {
        return false;
    }

    state.enabled = true;
    // Count pages ourselves (the router counts each one, the first included).
    win.goatcounter = { no_onload: true };

    const script = document.createElement('script');
    script.async = true;
    script.src = SCRIPT_SRC;
    script.dataset.goatcounter = url;
    script.addEventListener('load', () => {
        if (!state.enabled || typeof win.goatcounter?.count !== 'function') {
            state = idle();
            return;
        }

        state.goatcounter = win.goatcounter;
        const queued = state.queue;
        state.queue = [];
        queued.forEach(send);
    });
    script.addEventListener('error', () => {
        // Blocked or offline: stop counting quietly.
        state = idle();
    });
    document.head.appendChild(script);
    return true;
}

function send(vars) {
    if (!state.enabled) {
        return;
    }

    if (!state.goatcounter) {
        state.queue.push(vars);
        return;
    }

    try {
        state.goatcounter.count(vars);
    } catch {
        // Never let counting break the page.
    }
}

/**
 * The path to count for a route: its path plus only the zos, jes, ref and
 * utm_* query parameters, never the hash. Unknown pages count as /404.
 */
export function countedPath(route) {
    if (route.name === 'not-found') {
        return '/404';
    }

    const fullPath = route.fullPath || route.path;
    const withoutHash = fullPath.split('#')[0];
    const [path, query = ''] = withoutHash.split('?');
    const kept = new URLSearchParams();
    for (const [key, value] of new URLSearchParams(query)) {
        if (KEPT_QUERY.test(key)) {
            kept.append(key, value);
        }
    }

    const search = kept.toString();
    return search ? `${path}?${search}` : path;
}

export function pageview(route) {
    if (!state.enabled) {
        return;
    }

    const vars = { path: countedPath(route), title: route.meta?.title || '' };
    // Later page views inside the app have no outside referrer.
    if (state.pageviews > 0) {
        vars.referrer = '';
    }

    state.pageviews++;
    send(vars);
}

/** Counts `<name>/<detail>` if the detail is on the allowed list. */
export function track(name, detail) {
    const value = detail === undefined || detail === null ? detail : String(detail);
    if (!isAllowed(name, value)) {
        if (import.meta.env.DEV) {
            console.debug(`[analytics] dropped event ${name} with a detail that isn't allowed`);
        }

        return;
    }

    if (!state.enabled) {
        return;
    }

    send({ path: `${name}/${value}`, title: EVENTS[name].title(value), event: true });
}
