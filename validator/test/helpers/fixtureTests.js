// Registers one node:test test per fixture pair under a directory, applying
// the todo rules:
//   not todo + matches     -> passes
//   not todo + differs     -> fails with the side-by-side table
//   todo     + differs     -> reported as todo (doesn't fail the run)
//   todo     + matches     -> fails: the todo marker is stale and must go
// Problems found while pairing (missing or broken expected files) each become
// a failing test that names the file.

const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../../src/validator');
const { compareDiagnostics, formatComparison } = require('./diagnostics');
const { findFixtures } = require('./fixtures');

/**
 * Decides how a fixture should be reported, given the validator's result.
 * @returns {{ kind: 'pass'|'fail'|'todo'|'stale-todo', message?: string }}
 */
function planFixture(pair, result) {
    const { expected } = pair;
    const comparison = compareDiagnostics(result.diagnostics, expected.diagnostics);
    const validDiffers = expected.valid !== undefined && expected.valid !== result.stats.valid;
    const matches = comparison.ok && !validDiffers;
    const details = [
        formatComparison(result.diagnostics, expected.diagnostics, comparison),
        validDiffers ? `\nExpected stats.valid to be ${expected.valid}, got ${result.stats.valid}` : ''
    ].join('');

    if (expected.todo) {
        if (matches) {
            return {
                kind: 'stale-todo',
                message: `${pair.name} now passes; remove the "todo" marker from ${pair.expectedFile}`
            };
        }

        return { kind: 'todo', message: `Still failing (feature ${expected.todo.feature}):\n${details}` };
    }

    if (matches) {
        return { kind: 'pass' };
    }

    return { kind: 'fail', message: `Diagnostics differ for ${pair.name}:\n${details}` };
}

function registerFixtureTests(dir) {
    const { pairs, problems } = findFixtures(dir);

    for (const problem of problems) {
        test(problem.name, () => {
            assert.fail(problem.message);
        });
    }

    for (const pair of pairs) {
        const result = validate(fs.readFileSync(pair.fixture, 'utf8'));
        const plan = planFixture(pair, result);
        if (plan.kind === 'todo') {
            const { feature, reason } = pair.expected.todo;
            test(pair.name, { todo: `feature ${feature}: ${reason}` }, () => {
                assert.fail(plan.message);
            });
        } else {
            test(pair.name, () => {
                if (plan.kind !== 'pass') {
                    assert.fail(plan.message);
                }
            });
        }
    }
}

module.exports = {
    planFixture,
    registerFixtureTests
};
