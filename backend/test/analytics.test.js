const test = require('node:test');
const assert = require('node:assert');
const { createAnalytics, isAllowedCliEvent } = require('../src/analytics');

function hit(n) {
    return { path: `api/validate/direct`, title: `Hit ${n}`, ip: '203.0.113.7', userAgent: 'curl/8.4.0' };
}

function fakeSend() {
    const calls = [];
    const send = async (url, options) => {
        calls.push({ url, options, body: JSON.parse(options.body) });
        return { status: 202 };
    };
    return { calls, send };
}

test('createAnalytics', async (t) => {
    await t.test('Z: without a token nothing is queued or sent', async () => {
        const { calls, send } = fakeSend();
        const analytics = createAnalytics({ send });
        analytics.record(hit(1));
        await analytics.flush();
        assert.equal(analytics.enabled, false);
        assert.equal(calls.length, 0);
    });

    await t.test('M: five hits go out in one request', async () => {
        const { calls, send } = fakeSend();
        const analytics = createAnalytics({ token: 'secret', send });
        for (let i = 0; i < 5; i++) {
            analytics.record(hit(i));
        }

        await analytics.flush();
        analytics.stop();
        assert.equal(calls.length, 1);
        assert.equal(calls[0].body.hits.length, 5);
    });

    await t.test('B: 150 hits go out as batches of 100 and 50', async () => {
        const { calls, send } = fakeSend();
        const analytics = createAnalytics({ token: 'secret', send });
        for (let i = 0; i < 150; i++) {
            analytics.record(hit(i));
        }

        await analytics.flush();
        analytics.stop();
        assert.deepEqual(calls.map(c => c.body.hits.length), [100, 50]);
    });

    await t.test('I: posts the GoatCounter count request', async () => {
        const { calls, send } = fakeSend();
        const analytics = createAnalytics({ token: 'secret', siteUrl: 'https://example.goatcounter.com', send });
        analytics.record(hit(1));
        await analytics.flush();
        analytics.stop();

        const [{ url, options, body }] = calls;
        assert.equal(url, 'https://example.goatcounter.com/api/v0/count');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Authorization, 'Bearer secret');
        assert.equal(options.headers['Content-Type'], 'application/json');
        assert.ok(options.signal instanceof AbortSignal);
        assert.deepEqual(body, {
            no_sessions: true,
            hits: [{ path: 'api/validate/direct', title: 'Hit 1', event: true, ip: '203.0.113.7', user_agent: 'curl/8.4.0' }]
        });
    });

    await t.test('E: a failing send is dropped without throwing, and the queue empties', async () => {
        let calls = 0;
        const analytics = createAnalytics({
            token: 'secret',
            send: async () => {
                calls++;
                throw new Error('network down');
            }
        });
        analytics.record(hit(1));
        await analytics.flush();
        await analytics.flush();
        analytics.stop();
        assert.equal(calls, 1);
    });

    await t.test('E: a hanging send is cut off by its timeout signal', async () => {
        let signal;
        const analytics = createAnalytics({
            token: 'secret',
            timeoutMs: 50,
            send: (url, options) => {
                signal = options.signal;
                return new Promise((resolve, reject) => {
                    options.signal.addEventListener('abort', () => reject(options.signal.reason));
                });
            }
        });
        analytics.record(hit(1));
        // AbortSignal.timeout doesn't keep the event loop alive on its own.
        const keepAlive = setTimeout(() => {}, 1000);
        const flushing = analytics.flush();
        analytics.stop();
        assert.equal(signal.aborted, false);
        await flushing; // resolves once the timeout aborts the send
        clearTimeout(keepAlive);
        assert.equal(signal.aborted, true);
    });

    await t.test('the timer does not keep the process alive and stop clears it', () => {
        const realSetInterval = global.setInterval;
        const realClearInterval = global.clearInterval;
        let unrefCalled = false;
        let cleared = null;
        global.setInterval = () => ({ unref() { unrefCalled = true; } });
        global.clearInterval = (t) => { cleared = t; };
        try {
            const analytics = createAnalytics({ token: 'secret', send: async () => {} });
            analytics.stop();
            assert.ok(unrefCalled);
            assert.ok(cleared);
        } finally {
            global.setInterval = realSetInterval;
            global.clearInterval = realClearInterval;
        }
    });
});

test('isAllowedCliEvent', () => {
    for (const name of ['cli/run', 'cli/version/1.2.3', 'cli/node/22', 'cli/os/linux', 'cli/files/2-10',
        'cli/result/clean', 'cli/format/sarif', 'cli/option/max-warnings', 'cli/ci/github', 'cli/diag/JCLK001']) {
        assert.ok(isAllowedCliEvent(name), name);
    }

    for (const name of ['page/secret', 'cli/run/extra', 'cli/os/plan9', 'cli/diag/MY.DSN', 'cli/version/abc',
        'cli/files/', 'cli', '', 42, null]) {
        assert.ok(!isAllowedCliEvent(name), String(name));
    }
});
