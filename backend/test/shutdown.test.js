// Starts the real server process and checks that queued hits are sent to
// GoatCounter when the host stops it with SIGTERM.

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

function fakeGoatCounter() {
    const requests = [];
    const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            requests.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body) });
            res.writeHead(202, { 'Content-Type': 'application/json' });
            res.end('{"status":"ok"}');
        });
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, requests })));
}

function waitForPort(child) {
    return new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', chunk => {
            output += chunk;
            const match = output.match(/listening on http:\/\/localhost:(\d+)/);
            if (match) {
                resolve(Number(match[1]));
            }
        });
        child.on('exit', code => reject(new Error(`server exited early with ${code}: ${output}`)));
    });
}

test('SIGTERM sends queued hits before exiting', async (t) => {
    const goat = await fakeGoatCounter();
    t.after(() => goat.server.close());

    const { NODE_TEST_CONTEXT, ...env } = process.env;
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js')], {
        env: {
            ...env,
            PORT: '0',
            GOATCOUNTER_TOKEN: 'test-token',
            GOATCOUNTER_SITE_URL: `http://127.0.0.1:${goat.server.address().port}`
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    t.after(() => child.kill('SIGKILL'));

    const port = await waitForPort(child);
    const res = await fetch(`http://127.0.0.1:${port}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
        body: JSON.stringify({ source: '//J1 JOB\n' })
    });
    assert.equal(res.status, 200);
    assert.equal(goat.requests.length, 0, 'nothing sent before the 10-second batch');

    const started = Date.now();
    const exitCode = await new Promise(resolve => {
        child.on('exit', resolve);
        child.kill('SIGTERM');
    });

    assert.equal(exitCode, 0);
    assert.ok(Date.now() - started < 6000, 'exited within 6 seconds');
    assert.equal(goat.requests.length, 1);
    assert.equal(goat.requests[0].url, '/api/v0/count');
    assert.equal(goat.requests[0].auth, 'Bearer test-token');
    assert.deepEqual(goat.requests[0].body.hits.map(h => h.path), ['api/validate/direct', 'api/result/ok']);
});
