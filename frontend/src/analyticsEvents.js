// Every analytics event the site may send, and the details each one allows.
// An event is counted as `<name>/<detail>`, and only when the detail passes
// its rule, so free text (JCL, dataset names, anything typed) can never reach
// GoatCounter.

export const CODE_PATTERN = /^JCL[A-Z][0-9]{3}$/;

const SIZE_BUCKETS = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
const HTTP_ERROR = /^[45][0-9]{2}$/;

function range(from, to) {
    return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

export const EVENTS = {
    // Site navigation
    'cta/launch': { details: ['nav', 'hero', 'bottom', 'footer', 'about'], title: d => `Launch workbench (${d})` },
    'cta/about': { details: ['hero'], title: d => `Open About (${d})` },
    'faq/open': { details: range(1, 20), title: d => `FAQ question ${d} opened` },
    'outbound': { details: ['github-repo', 'github-profile', 'portfolio'], title: d => `Outbound link: ${d}` },

    // Workbench actions
    'check': { details: ['f5', 'button', 'shortcut'], title: d => `Check JCL (${d})` },
    'sample': { details: ['clean', 'broken', 'proc'], title: d => `Load sample: ${d}` },
    'clear': { details: ['f12', 'button', 'shortcut'], title: d => `Clear editor (${d})` },
    'help/open': { details: ['f1', 'button', 'shortcut'], title: d => `Open help (${d})` },
    'editor/paste': { details: SIZE_BUCKETS, title: d => `Paste JCL (${d} lines)` },
    'undo': { details: ['f4', 'f9', 'f12'], title: d => `Undo after ${d}` },
    'library': { details: ['add', 'remove'], title: d => `Library member ${d}` },

    // Results
    'diag/seen': { details: CODE_PATTERN, title: d => `Diagnostic seen: ${d}` },
    'diag/fixed': { details: CODE_PATTERN, title: d => `Diagnostic fixed: ${d}` },
    'diag/click': { details: CODE_PATTERN, title: d => `Diagnostic clicked: ${d}` },

    // API problems
    'api': { details: ['unreachable'], title: () => 'API unreachable' },
    'api/error': { details: HTTP_ERROR, title: d => `API error ${d}` },

    // Visit summary
    'visit/checks': { details: ['1', '2-5', '6-20', '21-100', '100+'], title: d => `Visit: ${d} checks` },
    'visit/lines': { details: SIZE_BUCKETS, title: d => `Visit: largest JCL ${d} lines` },
    'visit/time': { details: ['0-1m', '1-5m', '5-20m', '20m+'], title: d => `Visit: ${d} on the workbench` },
    'visit/latency': { details: ['0-250ms', '250ms-1s', '1s+'], title: d => `Visit: typical response ${d}` },
    'visit/end': { details: ['clean', 'errors', 'warnings'], title: d => `Visit ended ${d}` },

    // Level, drafts, sharing, datasets, profile, formatter and explanations
    'level': { details: ['2.3', '2.4', '2.5', '3.1', '3.2'], title: d => `z/OS level ${d}` },
    'jes': { details: ['JES2', 'JES3'], title: d => `JES: ${d}` },
    'draft': { details: ['restored', 'corrupt'], title: d => `Draft ${d}` },
    'share': { details: ['create', 'open', 'back-to-draft', 'clipboard-blocked'], title: d => `Share: ${d}` },
    'datasets': { details: ['open', 'cell-click'], title: d => `Datasets: ${d}` },
    'suppress': { details: CODE_PATTERN, title: d => `Suppressed: ${d}` },
    'profile': { details: ['edit'], title: () => 'Profile edited' },
    'profile/rule': { details: ['names', 'allowed', 'dsnPrefixes', 'extraKeywords', 'severity'], title: d => `Profile rule used: ${d}` },
    'format': { details: ['f4', 'button', 'shortcut', 'applied', 'cancelled', 'refused'], title: d => `Format: ${d}` },
    'hover': { details: ['mouse', 'shortcut'], title: d => `Keyword explanation: ${d}` }
};

/** Whether `detail` is allowed for the event `name`. */
export function isAllowed(name, detail) {
    const entry = Object.prototype.hasOwnProperty.call(EVENTS, name) ? EVENTS[name] : null;
    if (!entry || typeof detail !== 'string') {
        return false;
    }

    const rule = entry.details;
    if (rule instanceof RegExp) {
        return rule.test(detail);
    }

    return rule.includes(detail);
}

/** Buckets a line count the same way for pastes and the visit summary. */
export function sizeBucket(lines) {
    if (lines <= 10) {
        return '1-10';
    }

    if (lines <= 50) {
        return '11-50';
    }

    if (lines <= 200) {
        return '51-200';
    }

    return lines <= 1000 ? '201-1000' : '1000+';
}

export function checksBucket(checks) {
    if (checks <= 1) {
        return '1';
    }

    if (checks <= 5) {
        return '2-5';
    }

    if (checks <= 20) {
        return '6-20';
    }

    return checks <= 100 ? '21-100' : '100+';
}

export function timeBucket(ms) {
    const minutes = ms / 60000;
    if (minutes < 1) {
        return '0-1m';
    }

    if (minutes < 5) {
        return '1-5m';
    }

    return minutes < 20 ? '5-20m' : '20m+';
}

/** Buckets the median of a list of response times in milliseconds. */
export function latencyBucket(times) {
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[Math.floor((sorted.length - 1) / 2)];
    if (median < 250) {
        return '0-250ms';
    }

    return median < 1000 ? '250ms-1s' : '1s+';
}
