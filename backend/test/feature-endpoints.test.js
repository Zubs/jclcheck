// The API endpoints and options added by Features.md features 37-40: a site
// profile on /api/validate, /api/format and /api/keywords; and that the CLI's
// usage events are ones /api/usage accepts.

const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/index');
const { isAllowedCliEvent } = require('../src/analytics');
const { keywordHelp } = require('../../validator');
const { usageEvents } = require('../../validator/src/cli');

// Starts an app on a free port; returns its base address.
async function serve(t) {
    const app = createApp({ analytics: { enabled: false, record() {}, async flush() {}, stop() {} } });
    const server = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(() => new Promise(resolve => server.close(resolve)));
    return `http://127.0.0.1:${server.address().port}`;
}

const post = (url, body) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

test('feature endpoints', async (t) => {
    await t.test('E: /api/validate answers 400 for a bad profile and checks with a good one', async (tt) => {
        const base = await serve(tt);
        const bad = await post(`${base}/api/validate`, { source: '//J JOB\n', profile: { names: { job: 5 } } });
        assert.equal(bad.status, 400);
        assert.match((await bad.json()).message, /profile\.names\.job/);

        const good = await post(`${base}/api/validate`, { source: '//PAYROLL1 JOB\n//S EXEC PGM=X\n', profile: { names: { job: 'AR*' } } });
        assert.equal(good.status, 200);
        assert.deepEqual((await good.json()).diagnostics.map(d => d.code), ['JCLN002']);
    });

    await t.test('POST /api/format returns the text and the changed lines', async (tt) => {
        const base = await serve(tt);
        const res = await post(`${base}/api/format`, { source: "//STEP1 EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',COND=(4,LT),TIME=5" });
        assert.deepEqual(await res.json(), {
            text: "//STEP1    EXEC PGM=IEBGENER,REGION=0M,PARM='SOME LONG PARM',\n//             COND=(4,LT),TIME=5",
            changed: [1, 2],
            notes: [],
            refused: null
        });
        assert.equal((await post(`${base}/api/format`, {})).status, 400);
    });

    await t.test('GET /api/keywords answers for a level and refuses an unknown one', async (tt) => {
        const base = `${await serve(tt)}/api/keywords`;
        const ok = await (await fetch(`${base}?zos=3.1`)).json();
        assert.equal(ok.zosLevel, '3.1');
        assert.equal(ok.statements.DD.DISP.text, keywordHelp('3.1').statements.DD.DISP.text);
        assert.equal((await (await fetch(base)).json()).zosLevel, '3.2');
        assert.equal((await fetch(`${base}?zos=9.9`)).status, 400);
    });

    await t.test('every event the CLI can send is one /api/usage accepts', () => {
        const results = [{ file: 'a.jcl', result: { diagnostics: [{ code: 'JCLS001', severity: 'error' }] } }];
        const options = { format: 'sarif', zos: '2.5', jes: 'JES3', library: 'lib', profile: 'p.json', maxWarnings: 2 };
        const events = usageEvents(options, results, { GITHUB_ACTIONS: 'true' });
        assert.ok(events.length > 10);
        assert.ok(events.every(isAllowedCliEvent), events.join());
    });
});
