// The jclcheck command (Features.md feature 38).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { run } = require('../src/cli');
const { validate } = require('../src/validator');

const CLEAN = '//J JOB\n//S EXEC PGM=X\n//D DD DSN=A.B,DISP=SHR\n';
const ERROR = '//J JOB\n//S EXEC PGM=X\n//D DD DSN=A.B,DISP=SHX\n';
const warnings = n => `//J JOB\n//S EXEC PGM=X\n${Array.from({ length: n }, (_, i) => `//D${i} DD DUMMY,FOO${i}=1`).join('\n')}\n`;

function workspace(t, files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jclcheck-cli-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    for (const [name, text] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
        fs.writeFileSync(path.join(dir, name), text);
    }

    return dir;
}

async function cli(dir, args, { env = {}, fetchImpl = async () => assert.fail('nothing may be sent') } = {}) {
    let out = '', err = '';
    const code = await run(args, { cwd: dir, env, fetchImpl, stdout: s => (out += s), stderr: s => (err += s) });
    return { code, out, err };
}

test('jclcheck command', async (t) => {
    await t.test('Z: no files prints the usage and exits with 2', async () => {
        const r = await cli(os.tmpdir(), []);
        assert.equal(r.code, 2);
        assert.match(r.err, /^Usage: jclcheck/);
    });

    await t.test('O: one clean file prints nothing and exits with 0', async (tt) => {
        const dir = workspace(tt, { 'a.jcl': CLEAN });
        assert.deepEqual(await cli(dir, ['a.jcl']), { code: 0, out: '', err: '' });
    });

    await t.test('M: three files, one with an error, print that file\'s diagnostics and exit with 1', async (tt) => {
        const dir = workspace(tt, { 'a.jcl': CLEAN, 'b.jcl': ERROR, 'c.jcl': CLEAN });
        const r = await cli(dir, ['a.jcl', 'b.jcl', 'c.jcl']);
        assert.equal(r.code, 1);
        assert.equal(r.out, "b.jcl:3:21  error  JCLS001  Invalid DISP value 'SHX'. (DISP status must be one of NEW, OLD, SHR, MOD; normal/abnormal disposition must be one of DELETE, KEEP, CATLG, UNCATLG, PASS.)\n");
        assert.equal(r.err, '1 error, 0 warnings in 3 files\n');
    });

    await t.test('globs the shell passes through are expanded', async (tt) => {
        const dir = workspace(tt, { 'jcl/a.jcl': CLEAN, 'jcl/b.jcl': ERROR });
        const r = await cli(dir, ['jcl/*.jcl', '--format', 'json']);
        assert.deepEqual(JSON.parse(r.out).files.map(f => f.file), ['jcl/a.jcl', 'jcl/b.jcl']);
    });

    await t.test('** and ? reach every matching file, in order, and a pattern matching nothing is reported', async (tt) => {
        const dir = workspace(tt, { 'jcl/a.jcl': CLEAN, 'jcl/deep/er/b.jcl': CLEAN, 'jcl/c1.jcl': CLEAN, 'jcl/c22.jcl': CLEAN, 'jcl/notes.txt': 'x', 'jcl/.hidden/d.jcl': CLEAN });
        const files = async pattern => JSON.parse((await cli(dir, [pattern, '--format', 'json'])).out).files.map(f => f.file);
        assert.deepEqual(await files('jcl/**/*.jcl'), ['jcl/a.jcl', 'jcl/c1.jcl', 'jcl/c22.jcl', 'jcl/deep/er/b.jcl']);
        assert.deepEqual(await files('jcl/c?.jcl'), ['jcl/c1.jcl']);
        const missing = await cli(dir, ['jcl/*.cbl']);
        assert.equal(missing.code, 2);
        assert.match(missing.err, /can't read jcl\/\*\.cbl: no such file/);
    });

    await t.test('B: --max-warnings 2 passes with two warnings and fails with three', async (tt) => {
        const dir = workspace(tt, { 'two.jcl': warnings(2), 'three.jcl': warnings(3) });
        assert.equal((await cli(dir, ['two.jcl', '--max-warnings', '2'])).code, 0);
        const r = await cli(dir, ['three.jcl', '--max-warnings', '2']);
        assert.equal(r.code, 1);
        assert.match(r.err, /3 warnings, more than --max-warnings 2/);
    });

    await t.test('I: SARIF 2.1.0 has a rule per code and each result at its file, line and column', async (tt) => {
        const dir = workspace(tt, { 'jcl/b.jcl': ERROR, 'w.jcl': warnings(1) });
        const sarif = JSON.parse((await cli(dir, ['jcl/b.jcl', 'w.jcl', '--format', 'sarif'])).out);
        assert.equal(sarif.version, '2.1.0');
        assert.match(sarif.$schema, /sarif-2\.1\.0/);
        const [runEntry] = sarif.runs;
        assert.equal(runEntry.tool.driver.name, 'JCLcheck');
        assert.deepEqual(runEntry.tool.driver.rules.map(r => [r.id, r.defaultConfiguration.level]), [['JCLS001', 'error'], ['JCLK001', 'warning']]);
        for (const rule of runEntry.tool.driver.rules) {
            assert.ok(rule.shortDescription.text && rule.help.text);
        }

        assert.deepEqual(runEntry.results.map(r => [r.ruleId, r.level, r.locations[0].physicalLocation.artifactLocation.uri, r.locations[0].physicalLocation.region]), [
            ['JCLS001', 'error', 'jcl/b.jcl', { startLine: 3, startColumn: 21 }],
            ['JCLK001', 'warning', 'w.jcl', { startLine: 3, startColumn: 15 }]
        ]);
        for (const r of runEntry.results) {
            assert.ok(r.message.text);
        }
    });

    await t.test('E: a missing file gives a clear message and exit 2, and the others are still checked', async (tt) => {
        const dir = workspace(tt, { 'b.jcl': ERROR });
        const r = await cli(dir, ['nope.jcl', 'b.jcl']);
        assert.equal(r.code, 2);
        assert.match(r.err, /can't read nope\.jcl: no such file/);
        assert.match(r.out, /^b\.jcl:3:21/);
    });

    await t.test('options: --zos, --jes, --library and --profile give the same results as the validator', async (tt) => {
        const job = '//PAYROLL1 JOB\n//  JCLLIB ORDER=MY.PROCS\n//S EXEC MYPROC\n';
        const dir = workspace(tt, {
            'j.jcl': job,
            'lib/MY.PROCS/MYPROC.jcl': '//MYPROC PROC\n//S1 EXEC PGM=X,REGON=1M\n',
            'profile.json': JSON.stringify({ names: { job: 'AR*' } })
        });
        const r = await cli(dir, ['j.jcl', '--zos', '2.5', '--jes', 'jes3', '--library', 'lib', '--profile', 'profile.json', '--format', 'json']);
        const expected = validate(job, {
            zosLevel: '2.5',
            jes: 'JES3',
            library: [{ dsn: 'MY.PROCS', member: 'MYPROC', source: '//MYPROC PROC\n//S1 EXEC PGM=X,REGON=1M\n' }],
            profile: { names: { job: 'AR*' } }
        });
        assert.deepEqual(JSON.parse(r.out).files[0].diagnostics, JSON.parse(JSON.stringify(expected.diagnostics)));
        assert.deepEqual(expected.diagnostics.map(d => d.code), ['JCLN002', 'JCLK001']);
        assert.match((await cli(dir, ['j.jcl', '--library', 'lib'])).out, /j\.jcl\[MY\.PROCS\(MYPROC\)\]:2:/);
    });

    await t.test('E: bad options and a bad profile exit with 2', async (tt) => {
        const dir = workspace(tt, { 'a.jcl': CLEAN, 'p.json': '{"names":{"job":5}}' });
        assert.match((await cli(dir, ['a.jcl', '--zos', '9.9'])).err, /Unknown z\/OS level/);
        assert.equal((await cli(dir, ['a.jcl', '--format', 'xml'])).code, 2);
        assert.equal((await cli(dir, ['a.jcl', '--jes', 'JES3'])).code, 2);
        const r = await cli(dir, ['a.jcl', '--profile', 'p.json']);
        assert.equal(r.code, 2);
        assert.match(r.err, /profile\.names\.job/);
    });

    await t.test('the command loads nothing but Node\'s modules and the validator', () => {
        const script = "require('./src/cli'); console.log(JSON.stringify(Object.keys(require.cache)))";
        const loaded = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..') }).toString());
        const root = path.join(__dirname, '..') + path.sep;
        assert.ok(loaded.length > 5);
        assert.deepEqual(loaded.filter(f => !f.startsWith(root) || f.includes(`${path.sep}node_modules${path.sep}`)), []);
    });

    await t.test('the bin script runs and sets the exit code', (tt) => {
        const dir = workspace(tt, { 'b.jcl': ERROR });
        const bin = path.join(__dirname, '..', 'bin', 'jclcheck.js');
        assert.throws(() => execFileSync(process.execPath, [bin, 'b.jcl'], { cwd: dir, env: { PATH: process.env.PATH }, stdio: 'pipe' }), e => e.status === 1 && /JCLS001/.test(e.stdout));
    });
});

test('jclcheck usage counting', async (t) => {
    const sent = () => {
        const calls = [];
        return { calls, fetchImpl: async (url, options) => calls.push({ url, body: JSON.parse(options.body) }) };
    };

    await t.test('Z: nothing is sent without an opt-in, or with DO_NOT_TRACK', async (tt) => {
        const dir = workspace(tt, { 'a.jcl': CLEAN });
        const s = sent();
        await cli(dir, ['a.jcl'], { fetchImpl: s.fetchImpl });
        await cli(dir, ['a.jcl', '--telemetry'], { env: { DO_NOT_TRACK: '1' }, fetchImpl: s.fetchImpl });
        await cli(dir, ['a.jcl'], { env: { JCLCHECK_TELEMETRY: '1', DO_NOT_TRACK: '1' }, fetchImpl: s.fetchImpl });
        assert.deepEqual(s.calls, []);
    });

    await t.test('O: an opted-in run sends one batch the API accepts', async (tt) => {
        const dir = workspace(tt, { 'b.jcl': ERROR });
        const s = sent();
        await cli(dir, ['b.jcl', '--zos', '2.5'], { env: { JCLCHECK_TELEMETRY: '1', GITHUB_ACTIONS: 'true', JCLCHECK_API: 'http://api.test' }, fetchImpl: s.fetchImpl });
        assert.equal(s.calls.length, 1);
        assert.equal(s.calls[0].url, 'http://api.test/api/usage');
        const { events } = s.calls[0].body;
        assert.deepEqual(events.filter(e => !/^cli\/(version|node|os)\//.test(e)), [
            'cli/run', 'cli/files/1', 'cli/result/errors', 'cli/format/text', 'cli/option/zos', 'cli/ci/github', 'cli/diag/JCLS001'
        ]);
    });

    await t.test('I: JCLCHECK_TELEMETRY=debug prints the events and sends nothing', async (tt) => {
        const dir = workspace(tt, { 'a.jcl': CLEAN });
        const r = await cli(dir, ['a.jcl'], { env: { JCLCHECK_TELEMETRY: 'debug' } });
        assert.match(r.err, /nothing sent/);
        assert.match(r.err, /cli\/result\/clean/);
    });

    await t.test('E: an unreachable backend adds at most a second and changes nothing', async (tt) => {
        const dir = workspace(tt, { 'b.jcl': ERROR });
        // Like a server that never answers: an open request keeps the process alive.
        const hang = (url, { signal }) => new Promise((resolve, reject) => {
            const open = setTimeout(resolve, 10000);
            signal.addEventListener('abort', () => {
                clearTimeout(open);
                reject(signal.reason);
            });
        });
        const quiet = await cli(dir, ['b.jcl']);
        const started = Date.now();
        const r = await cli(dir, ['b.jcl'], { env: { JCLCHECK_TELEMETRY: '1' }, fetchImpl: hang });
        assert.ok(Date.now() - started < 1500);
        assert.deepEqual(r, quiet);
    });
});
