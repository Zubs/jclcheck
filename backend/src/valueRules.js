// Reusable descriptions of what a keyword's value may be, and one checker for
// them. Keyword tables (keywords.js) attach a rule as `value`; checkValue
// returns null when the value fits, otherwise what's wrong with it, worded so
// it can follow the keyword name: "TYPRUN must be one of ...".

const { splitTopLevel } = require('./paramTokenizer');

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }

    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }

    return dp[m][n];
}

/** The candidate within two edits of `word`, or null. */
function closest(word, candidates) {
    let best = null, bestDist = Infinity;
    for (const c of candidates) {
        const d = levenshtein(word, c);
        if (d < bestDist) {
            bestDist = d;
            best = c;
        }
    }

    return bestDist <= 2 ? best : null;
}

const oneOfValues = (...values) => ({ type: 'enum', values });
const integer = (min, max) => ({ type: 'integer', min, max });
const char = (pattern, describe) => ({ type: 'char', pattern, describe });
const name = (pattern, describe) => ({ type: 'name', pattern, describe });
const quoted = max => ({ type: 'quoted', max });
const list = (items, { atLeastOne = false } = {}) => ({ type: 'list', items, atLeastOne });
const oneOf = (...rules) => ({ type: 'oneOf', rules });

function describe(rule) {
    switch (rule.type) {
        case 'enum':
            return `must be one of ${rule.values.join(', ')}`;
        case 'integer':
            return `must be a whole number from ${rule.min} to ${rule.max}`;
        case 'char':
        case 'name':
            return `must be ${rule.describe}`;
        case 'quoted':
            return `must be a quoted string of at most ${rule.max} characters`;
        case 'oneOf':
            return rule.rules.map(describe).join(', or ');
        default:
            return 'is not valid';
    }
}

/**
 * @returns {null|{ detail: string, found: string, closest?: string }}
 */
function checkValue(rule, value) {
    const v = value.trim();
    const upper = v.toUpperCase();
    const fail = (extra = {}) => ({ detail: describe(rule), found: v, ...extra });
    switch (rule.type) {
        case 'enum':
            return rule.values.includes(upper) ? null : fail({ closest: closest(upper, rule.values) });
        case 'integer':
            return /^-?\d+$/.test(v) && Number(v) >= rule.min && Number(v) <= rule.max ? null : fail();
        case 'char':
        case 'name':
            return rule.pattern.test(v) ? null : fail();
        case 'quoted': {
            const m = v.match(/^'(.*)'$/);
            return m && m[1].replace(/''/g, "'").length <= rule.max ? null : fail();
        }

        case 'oneOf':
            return rule.rules.some(r => !checkValue(r, v)) ? null : fail();
        case 'list':
            return checkList(rule, v);
        default:
            return null;
    }
}

function checkList(rule, v) {
    let parts;
    if (v.startsWith('(')) {
        if (!v.endsWith(')')) {
            return { detail: `is missing its closing ')'`, found: v };
        }

        parts = splitTopLevel(v.slice(1, -1)).map(p => p.text.trim());
    } else {
        parts = [v];
    }

    const max = rule.items.length;
    if (parts.length > max) {
        const labels = rule.items.map(i => i.label).filter(Boolean);
        return {
            detail: `takes at most ${max} value${max === 1 ? '' : 's'}${labels.length ? ` (${labels.join(' and ')})` : ''}`,
            found: v
        };
    }

    if (rule.atLeastOne && parts.every(p => p === '')) {
        return { detail: 'needs at least one value', found: v };
    }

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '') {
            continue;
        }

        const item = rule.items[i];
        const problem = checkValue(item.rule, parts[i]);
        if (problem) {
            return { ...problem, detail: item.label ? `${item.label} ${problem.detail}` : problem.detail };
        }
    }

    return null;
}

module.exports = {
    levenshtein,
    closest,
    oneOfValues,
    integer,
    char,
    name,
    quoted,
    list,
    oneOf,
    checkValue
};
