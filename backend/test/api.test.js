const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/index');
const { createAnalytics } = require('../src/analytics');

function fakeAnalytics() {
    const hits = [];
    return {
        hits,
        enabled: true,
        record(hit) {
            hits.push(hit);
        },
        async flush() {},
        stop() {}
    };
}

// Starts an app on a free port and returns a helper for requests to it.
async function serve(t, options) {
    const app = createApp(options);
    const server = await new Promise(resolve => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    return (path, { headers = {}, body, method = body === undefined ? 'GET' : 'POST' } = {}) => fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

// Direct-use hits are recorded when the response finishes; give that a tick.
const settle = () => new Promise(resolve => setImmediate(resolve));

test('API basics', async (t) => {
    const request = await serve(t, { analytics: fakeAnalytics() });

    await t.test('O: /api/health answers ok', async () => {
        const res = await request('/api/health');
        assert.deepEqual(await res.json(), { ok: true });
    });

    await t.test('O: /api/validate returns a validation result', async () => {
        const res = await request('/api/validate', { body: { source: '//J1 JOB\n//S1 EXEC PGM=IEFBR14\n' } });
        assert.equal(res.status, 200);
        const result = await res.json();
        assert.equal(result.stats.valid, true);
    });
});

test('client IP behind a proxy', async (t) => {
    await t.test('Z: X-Forwarded-For is ignored when TRUST_PROXY is unset', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics, trustProxy: undefined });
        await request('/api/validate', { body: { source: '' }, headers: { 'X-Forwarded-For': '1.2.3.4' } });
        await settle();
        assert.equal(analytics.hits[0].ip, '127.0.0.1');
    });

    await t.test('O: TRUST_PROXY=1 takes the client address one hop from the right', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics, trustProxy: '1' });
        await request('/api/validate', { body: { source: '' }, headers: { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' } });
        await settle();
        assert.equal(analytics.hits[0].ip, '5.6.7.8');
    });
});

test('counting direct API use', async (t) => {
    await t.test('O: a curl-style request records the endpoint and result with its user agent', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics });
        await request('/api/validate', { body: { source: '' }, headers: { 'User-Agent': 'curl/8.4.0' } });
        await settle();
        assert.deepEqual(analytics.hits.map(h => h.path), ['api/validate/direct', 'api/result/ok', 'api/level/3.2', 'api/jes/JES2']);
        assert.ok(analytics.hits.every(h => h.userAgent === 'curl/8.4.0' && h.ip === '127.0.0.1' && h.title));
    });

    for (const [name, headers] of [
        ['the workbench header', { 'X-JCLcheck-Client': 'workbench' }],
        ['DNT: 1', { DNT: '1' }],
        ['Sec-GPC: 1', { 'Sec-GPC': '1' }]
    ]) {
        await t.test(`E: a request with ${name} records nothing`, async (t) => {
            const analytics = fakeAnalytics();
            const request = await serve(t, { analytics });
            const res = await request('/api/validate', { body: { source: '' }, headers });
            await settle();
            assert.equal(res.status, 200);
            assert.equal(analytics.hits.length, 0);
        });
    }

    await t.test('E: a validator crash records api/result/error', async (t) => {
        t.mock.method(console, 'error', () => {});
        t.mock.method(require('../src/validator'), 'validate', () => {
            throw new Error('boom');
        });
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics });
        const res = await request('/api/validate', { body: { source: '//J JOB' } });
        await settle();
        assert.equal(res.status, 500);
        assert.deepEqual(analytics.hits.map(h => h.path), ['api/validate/direct', 'api/result/error']);
    });

    await t.test('E: counting is off when analytics is disabled', async (t) => {
        const request = await serve(t, { analytics: createAnalytics() });
        const res = await request('/api/validate', { body: { source: '' } });
        assert.equal(res.status, 200);
    });

    await t.test('E: a GoatCounter send that never finishes does not slow the API', async (t) => {
        const analytics = createAnalytics({ token: 'secret', send: () => new Promise(() => {}), intervalMs: 5 });
        t.after(() => analytics.stop());
        const request = await serve(t, { analytics });
        await request('/api/validate', { body: { source: '' } });
        await new Promise(resolve => setTimeout(resolve, 20)); // let a flush start and hang
        const started = performance.now();
        const res = await request('/api/validate', { body: { source: '//J1 JOB\n' } });
        assert.equal(res.status, 200);
        assert.ok(performance.now() - started < 200, 'responded within 200 ms');
    });
});

test('z/OS level in /api/validate', async (t) => {
    const analytics = fakeAnalytics();
    const request = await serve(t, { analytics });

    await t.test('Z: with no level the response says 3.2, next to diagnostics, ast and stats', async () => {
        const res = await request('/api/validate', { body: { source: '//J1 JOB\n//S1 EXEC PGM=IEFBR14\n' } });
        const result = await res.json();
        assert.equal(res.status, 200);
        assert.equal(result.zosLevel, '3.2');
        assert.ok(result.diagnostics && result.ast && result.stats);
    });

    await t.test('O: the level asked for is used', async () => {
        const res = await request('/api/validate', { body: { source: '', zosLevel: '2.3' } });
        assert.equal((await res.json()).zosLevel, '2.3');
    });

    for (const zosLevel of ['9.9', 'abc', 3.1, null]) {
        await t.test(`E: zosLevel ${JSON.stringify(zosLevel)} gets 400 listing the supported levels`, async () => {
            const res = await request('/api/validate', { body: { source: '//J1 JOB\n', zosLevel } });
            const body = await res.json();
            assert.equal(res.status, 400);
            assert.match(body.message, /2\.3, 2\.4, 2\.5, 3\.1, 3\.2/);
            assert.equal(body.diagnostics, undefined);
        });
    }

    await t.test('O: a direct request at 2.5 records api/level/2.5', async () => {
        analytics.hits.length = 0;
        await request('/api/validate', { body: { source: '', zosLevel: '2.5' } });
        await settle();
        assert.deepEqual(analytics.hits.map(h => h.path), ['api/validate/direct', 'api/result/ok', 'api/level/2.5', 'api/jes/JES2']);
    });

    await t.test('E: a rejected level records bad-request and no level', async () => {
        analytics.hits.length = 0;
        await request('/api/validate', { body: { source: '', zosLevel: '9.9' } });
        await settle();
        assert.deepEqual(analytics.hits.map(h => h.path), ['api/validate/direct', 'api/result/bad-request']);
    });
});

test('JES in /api/validate', async (t) => {
    const analytics = fakeAnalytics();
    const request = await serve(t, { analytics });

    await t.test('Z: with no jes the response says JES2', async () => {
        const res = await request('/api/validate', { body: { source: '' } });
        assert.equal((await res.json()).jes, 'JES2');
    });

    await t.test('O: JES3 at z/OS 2.5 is used and counted', async () => {
        analytics.hits.length = 0;
        const res = await request('/api/validate', { body: { source: '', jes: 'JES3', zosLevel: '2.5' } });
        assert.equal((await res.json()).jes, 'JES3');
        await settle();
        assert.ok(analytics.hits.some(h => h.path === 'api/jes/JES3'));
    });

    for (const body of [{ jes: 'JES3', zosLevel: '3.1' }, { jes: 'JES3' }]) {
        await t.test(`B: JES3 at ${body.zosLevel || 'the default level'} gets 400 saying it was removed`, async () => {
            const res = await request('/api/validate', { body: { source: '', ...body } });
            assert.equal(res.status, 400);
            assert.match((await res.json()).message, /JES3 was removed in z\/OS 3\.1/);
        });
    }

    await t.test('E: an unknown JES gets 400 listing JES2 and JES3', async () => {
        const res = await request('/api/validate', { body: { source: '', jes: 'JES4' } });
        assert.equal(res.status, 400);
        assert.match((await res.json()).message, /JES2, JES3/);
    });
});

test('/api/usage', async (t) => {
    await t.test('O: a valid batch answers 202 and records each event', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics });
        const res = await request('/api/usage', {
            body: { events: ['cli/run', 'cli/os/linux', 'cli/result/clean'] },
            headers: { 'User-Agent': 'jclcheck-cli/1.0.0' }
        });
        assert.equal(res.status, 202);
        assert.deepEqual(analytics.hits.map(h => h.path), ['cli/run', 'cli/os/linux', 'cli/result/clean']);
        assert.ok(analytics.hits.every(h => h.userAgent === 'jclcheck-cli/1.0.0' && h.ip === '127.0.0.1'));
    });

    await t.test('E: an unknown event answers 400, names it, and records nothing', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics });
        const res = await request('/api/usage', { body: { events: ['cli/run', 'page/secret'] } });
        assert.equal(res.status, 400);
        assert.match((await res.json()).message, /page\/secret/);
        assert.equal(analytics.hits.length, 0);
    });

    await t.test('B: 30 events are accepted and 31 are rejected', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics });
        assert.equal((await request('/api/usage', { body: { events: Array(30).fill('cli/run') } })).status, 202);
        assert.equal((await request('/api/usage', { body: { events: Array(31).fill('cli/run') } })).status, 400);
        assert.equal(analytics.hits.length, 30);
    });

    await t.test('E: Sec-GPC answers 204 and records nothing', async (t) => {
        const analytics = fakeAnalytics();
        const request = await serve(t, { analytics });
        const res = await request('/api/usage', { body: { events: ['cli/run'] }, headers: { 'Sec-GPC': '1' } });
        assert.equal(res.status, 204);
        assert.equal(analytics.hits.length, 0);
    });

    await t.test('E: a missing or non-list events field answers 400', async (t) => {
        const request = await serve(t, { analytics: fakeAnalytics() });
        assert.equal((await request('/api/usage', { body: {} })).status, 400);
        assert.equal((await request('/api/usage', { body: { events: 'cli/run' } })).status, 400);
        assert.equal((await request('/api/usage', { body: { events: [] } })).status, 400);
    });
});
