// Compares validator diagnostics against an expected list on the four fields
// that define a diagnostic for regression purposes: code, severity, line and
// column. Messages and suggestions are deliberately ignored so wording can
// change without breaking tests.

const assert = require('node:assert');
const { validate } = require('../../src/validator');

const FIELDS = ['code', 'severity', 'line', 'column'];

function keyOf(d) {
    return FIELDS.map(f => d[f]).join('|');
}

function pick(d) {
    return {
        code: d.code,
        severity: d.severity,
        line: d.line,
        column: d.column
    };
}

function byPosition(a, b) {
    return (a.line - b.line) || (a.column - b.column) || String(a.code).localeCompare(String(b.code));
}

/**
 * Multiset comparison: order doesn't matter, duplicates do.
 * @returns {{ ok: boolean, missing: object[], unexpected: object[] }}
 */
function compareDiagnostics(actual, expected) {
    const remaining = new Map();
    for (const d of expected) {
        const key = keyOf(d);
        if (!remaining.has(key)) {
            remaining.set(key, []);
        }

        remaining.get(key).push(pick(d));
    }

    const unexpected = [];
    for (const d of actual) {
        const bucket = remaining.get(keyOf(d));
        if (bucket && bucket.length) {
            bucket.pop();
        } else {
            unexpected.push(pick(d));
        }
    }

    const missing = [...remaining.values()].flat();
    missing.sort(byPosition);
    unexpected.sort(byPosition);

    return {
        ok: missing.length === 0 && unexpected.length === 0,
        missing,
        unexpected
    };
}

function describe(d) {
    return `${d.severity} ${d.code} L${d.line}:${d.column}`;
}

/**
 * Two aligned columns, EXPECTED | ACTUAL, sorted by position. Entries only in
 * the expected list are marked '-', entries only in the actual list '+'.
 */
function formatComparison(actual, expected, result = compareDiagnostics(actual, expected)) {
    // Marks each entry at most once per occurrence in `flagged`, so a
    // duplicate that is only partly matched gets exactly one marker.
    const column = (list, flagged, marker) => {
        const keys = flagged.map(keyOf);
        return [...list].map(pick).sort(byPosition).map(d => {
            const i = keys.indexOf(keyOf(d));
            if (i !== -1) {
                keys.splice(i, 1);
            }

            return `${i !== -1 ? marker : ' '} ${describe(d)}`;
        });
    };

    const left = column(expected, result.missing, '-');
    const right = column(actual, result.unexpected, '+');

    const width = Math.max('EXPECTED'.length, ...left.map(s => s.length));
    const rows = [`${'EXPECTED'.padEnd(width)} | ACTUAL`, `${'-'.repeat(width)}-+-${'-'.repeat(width)}`];
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        rows.push(`${(left[i] || '').padEnd(width)} | ${right[i] || ''}`);
    }

    if (left.length === 0 && right.length === 0) {
        rows.push(`${'(none)'.padEnd(width)} | (none)`);
    }

    rows.push('', `- missing: ${result.missing.length}   + unexpected: ${result.unexpected.length}`);
    return rows.join('\n');
}

/**
 * Runs the validator over `jcl` and asserts its diagnostics match `expected`.
 * When `valid` is given, also asserts `stats.valid`.
 */
function expectDiagnostics(jcl, expected, { valid } = {}) {
    const result = validate(jcl);
    const comparison = compareDiagnostics(result.diagnostics, expected);
    if (!comparison.ok) {
        throw new assert.AssertionError({
            message: `Diagnostics differ:\n${formatComparison(result.diagnostics, expected, comparison)}`,
            actual: result.diagnostics.map(pick),
            expected: expected.map(pick),
            operator: 'expectDiagnostics'
        });
    }

    if (valid !== undefined) {
        assert.strictEqual(result.stats.valid, valid, `Expected stats.valid to be ${valid}`);
    }

    return result;
}

module.exports = {
    compareDiagnostics,
    formatComparison,
    expectDiagnostics
};
