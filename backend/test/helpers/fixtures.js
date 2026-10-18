// Finds fixture pairs (`name.jcl` + `name.expected.json`) under a directory,
// and reports anything that can't be checked: a fixture without an expected
// file, an expected file without a fixture, or an expected file that isn't
// usable.

const fs = require('node:fs');
const path = require('node:path');

const FIXTURE_EXT = '.jcl';
const EXPECTED_EXT = '.expected.json';

function walk(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(full));
        } else {
            files.push(full);
        }
    }

    return files;
}

/**
 * Reads and checks an expected-result file.
 * @returns {{ expected?: object, problem?: string }}
 */
function readExpected(file) {
    let data;
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        return { problem: `${file} is not valid JSON: ${err.message}` };
    }

    if (!data || typeof data !== 'object' || !Array.isArray(data.diagnostics)) {
        return { problem: `${file} has no "diagnostics" list` };
    }

    if (data.todo !== undefined && (typeof data.todo !== 'object' || !data.todo.feature || !data.todo.reason)) {
        return { problem: `${file} has a "todo" without both "feature" and "reason"` };
    }

    return { expected: data };
}

/**
 * @param {string} dir
 * @returns {{ pairs: { name: string, fixture: string, expectedFile: string, expected: object }[], problems: { name: string, message: string }[] }}
 */
function findFixtures(dir) {
    const files = walk(dir);
    const fixtures = new Set(files.filter(f => f.endsWith(FIXTURE_EXT)).map(f => f.slice(0, -FIXTURE_EXT.length)));
    const expecteds = new Set(files.filter(f => f.endsWith(EXPECTED_EXT)).map(f => f.slice(0, -EXPECTED_EXT.length)));
    const pairs = [];
    const problems = [];
    const nameOf = base => path.relative(dir, base);

    for (const base of [...fixtures].sort()) {
        const fixture = base + FIXTURE_EXT;
        const expectedFile = base + EXPECTED_EXT;
        if (!expecteds.has(base)) {
            problems.push({
                name: nameOf(base),
                message: `${fixture} has no expected-result file; create ${expectedFile}`
            });

            continue;
        }

        const { expected, problem } = readExpected(expectedFile);
        if (problem) {
            problems.push({ name: nameOf(base), message: problem });
            continue;
        }

        pairs.push({
            name: nameOf(base),
            fixture,
            expectedFile,
            expected
        });
    }

    for (const base of [...expecteds].sort()) {
        if (!fixtures.has(base)) {
            const expectedFile = base + EXPECTED_EXT;
            problems.push({
                name: nameOf(base),
                message: `${expectedFile} has no fixture; create ${base + FIXTURE_EXT} or delete it`
            });
        }
    }

    return { pairs, problems };
}

module.exports = {
    findFixtures,
    readExpected
};
