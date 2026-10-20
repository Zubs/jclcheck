// A site profile: naming patterns, allowed values, dataset prefixes, extra
// keywords and per-code severities, sent with a check as `profile`.
// Patterns are wildcards (* for any run, % for one character), never regular
// expressions, so a profile can't make the server slow.

const { CATALOG } = require('./errors');

const NAME_KINDS = ['job', 'step', 'dd'];
const STATEMENTS = ['JOB', 'EXEC', 'DD'];
const SEVERITIES = ['error', 'warning', 'info', 'off'];
const MAX_TEXT = 1024;
const MAX_ITEMS = 200;

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.length > 0 && v.length <= MAX_TEXT;

// A string or a list of strings.
function textListProblem(value, field) {
    const list = typeof value === 'string' ? [value] : value;
    if (!Array.isArray(list) || list.length > MAX_ITEMS || !list.every(isText)) {
        return `profile.${field} must be a string or a list of up to ${MAX_ITEMS} strings.`;
    }

    return null;
}

/** Why `profile` isn't a valid profile, or null. */
function profileProblem(profile) {
    if (profile === undefined || profile === null) {
        return null;
    }

    if (!isObject(profile)) {
        return 'profile must be an object.';
    }

    const fields = ['names', 'allowed', 'dsnPrefixes', 'extraKeywords', 'severity'];
    const unknown = Object.keys(profile).find(k => !fields.includes(k));
    if (unknown) {
        return `profile.${unknown} isn't a profile field. Use ${fields.join(', ')}.`;
    }

    const groups = [
        ['names', NAME_KINDS, k => k],
        ['allowed', null, k => k],
        ['extraKeywords', STATEMENTS, k => k.toUpperCase()]
    ];
    for (const [field, keys, normalise] of groups) {
        const value = profile[field];
        if (value === undefined) {
            continue;
        }

        if (!isObject(value)) {
            return `profile.${field} must be an object.`;
        }

        for (const [key, list] of Object.entries(value)) {
            if (keys && !keys.includes(normalise(key))) {
                return `profile.${field}.${key} isn't allowed. Use ${keys.join(', ')}.`;
            }

            const problem = textListProblem(list, `${field}.${key}`);
            if (problem) {
                return problem;
            }
        }
    }

    if (profile.dsnPrefixes !== undefined) {
        const problem = textListProblem(profile.dsnPrefixes, 'dsnPrefixes');
        if (problem) {
            return problem;
        }
    }

    if (profile.severity !== undefined) {
        if (!isObject(profile.severity)) {
            return 'profile.severity must be an object.';
        }

        for (const [code, severity] of Object.entries(profile.severity)) {
            if (!CATALOG[code.toUpperCase()]) {
                return `profile.severity.${code} isn't a diagnostic code.`;
            }

            if (!SEVERITIES.includes(severity)) {
                return `profile.severity.${code} must be one of ${SEVERITIES.join(', ')}.`;
            }
        }
    }

    return null;
}

const asList = value => (value === undefined ? [] : typeof value === 'string' ? [value] : value);

/** Whether `name` matches a wildcard pattern, ignoring case. */
function matches(pattern, name) {
    // Runs of * are one *, and the match is a linear walk that backtracks
    // only to the last *, so even a long pattern is quick.
    const p = pattern.toUpperCase().replace(/\*+/g, '*');
    const s = name.toUpperCase();
    let i = 0, j = 0, star = -1, mark = 0;
    while (j < s.length) {
        if (i < p.length && (p[i] === '%' || p[i] === s[j])) {
            i++;
            j++;
        } else if (i < p.length && p[i] === '*') {
            star = i++;
            mark = j;
        } else if (star !== -1) {
            i = star + 1;
            j = ++mark;
        } else {
            return false;
        }
    }

    while (p[i] === '*') {
        i++;
    }

    return i === p.length;
}

module.exports = { profileProblem, matches, asList };
