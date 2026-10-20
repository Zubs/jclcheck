const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { findFixtures } = require('./helpers/fixtures');

const CLEAN_JCL = '//J1 JOB (A),\'X\'\n//S1 EXEC PGM=IEFBR14\n';
const NO_JOB_JCL = '//S1 EXEC PGM=IEFBR14\n';
const JCLO001 = { code: 'JCLO001', severity: 'error', line: 1, column: 1 };
const JCLO002 = { code: 'JCLO002', severity: 'error', line: 1, column: 6 };

function makeDir(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jclcheck-fixtures-'));
    for (const [name, content] of Object.entries(files)) {
        const full = path.join(dir, name);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
    }

    return dir;
}

test('findFixtures', async (t) => {
    const dir = makeDir({
        'good.jcl': CLEAN_JCL,
        'good.expected.json': { diagnostics: [] },
        'alone.jcl': CLEAN_JCL,
        'orphan.expected.json': { diagnostics: [] },
        'broken.jcl': CLEAN_JCL,
        'broken.expected.json': '{ not json',
        'nolist.jcl': CLEAN_JCL,
        'nolist.expected.json': { valid: true },
        'nested/deep.jcl': CLEAN_JCL,
        'nested/deep.expected.json': { diagnostics: [] }
    });
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const { pairs, problems } = findFixtures(dir);
    const problem = name => problems.find(p => p.name === name);

    await t.test('O: a fixture with an expected file is paired', () => {
        assert.ok(pairs.some(p => p.name === 'good'));
    });

    await t.test('M: fixtures in subdirectories are found', () => {
        assert.ok(pairs.some(p => p.name === path.join('nested', 'deep')));
        assert.equal(pairs.length, 2);
    });

    await t.test('E: a fixture without an expected file is a problem naming both files', () => {
        assert.match(problem('alone').message, /alone\.jcl has no expected-result file; create .*alone\.expected\.json/);
    });

    await t.test('E: an expected file without a fixture is a problem naming it', () => {
        assert.match(problem('orphan').message, /orphan\.expected\.json has no fixture/);
    });

    await t.test('E: invalid JSON is a problem naming the file', () => {
        assert.match(problem('broken').message, /broken\.expected\.json is not valid JSON/);
    });

    await t.test('E: an expected file without a diagnostics list is a problem', () => {
        assert.match(problem('nolist').message, /nolist\.expected\.json has no "diagnostics" list/);
    });
});

// Runs the real fixture registration over a temporary directory in a child
// `node --test` process, so its exit status and report can be checked.
function runFixtureTests(files) {
    const dir = makeDir(files);
    const runner = path.join(dir, 'run.test.js');
    fs.writeFileSync(runner, `require(${JSON.stringify(path.join(__dirname, 'helpers', 'fixtureTests.js'))}).registerFixtureTests(${JSON.stringify(path.join(dir, 'f'))});\n`);
    // NODE_TEST_CONTEXT would make the child think it is nested inside this
    // run and skip its files.
    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const child = spawnSync(process.execPath, ['--test', runner], { encoding: 'utf8', env });
    fs.rmSync(dir, { recursive: true, force: true });
    return { status: child.status, output: child.stdout + child.stderr };
}

test('fixture todo rules', async (t) => {
    await t.test('not todo and matching passes', () => {
        const { status, output } = runFixtureTests({
            'f/a.jcl': CLEAN_JCL,
            'f/a.expected.json': { diagnostics: [], valid: true }
        });
        assert.equal(status, 0, output);
        assert.match(output, /ℹ pass 1/);
    });

    await t.test('not todo and differing fails with the table', () => {
        const { status, output } = runFixtureTests({
            'f/a.jcl': CLEAN_JCL,
            'f/a.expected.json': { diagnostics: [JCLO001] }
        });
        assert.notEqual(status, 0);
        assert.match(output, /EXPECTED\s+\| ACTUAL/);
        assert.match(output, /- error JCLO001 L1:1/);
    });

    await t.test('todo and differing is reported as todo without failing', () => {
        const { status, output } = runFixtureTests({
            'f/a.jcl': NO_JOB_JCL,
            'f/a.expected.json': { todo: { feature: 10, reason: 'not built yet' }, diagnostics: [] }
        });
        assert.equal(status, 0, output);
        assert.match(output, /ℹ todo 1/);
        assert.match(output, /feature 10: not built yet/);
    });

    await t.test('todo and matching fails, asking for the marker to be removed', () => {
        const { status, output } = runFixtureTests({
            'f/a.jcl': NO_JOB_JCL,
            'f/a.expected.json': { todo: { feature: 10, reason: 'not built yet' }, diagnostics: [JCLO001, JCLO002] }
        });
        assert.notEqual(status, 0);
        assert.match(output, /now passes; remove the "todo" marker from .*a\.expected\.json/);
    });

    await t.test('a missing expected file fails the run', () => {
        const { status, output } = runFixtureTests({ 'f/a.jcl': CLEAN_JCL });
        assert.notEqual(status, 0);
        assert.match(output, /a\.jcl has no expected-result file/);
    });
});
