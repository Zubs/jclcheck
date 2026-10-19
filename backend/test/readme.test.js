// The README's API example must match what the validator really returns.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../src/validator');

const README = fs.readFileSync(path.join(__dirname, '..', '..', 'README.md'), 'utf8');

function block(tag) {
    const match = README.match(new RegExp('```json ' + tag + '\\n([\\s\\S]*?)\\n```'));
    assert.ok(match, `README has no ${tag} block`);
    return JSON.parse(match[1]);
}

test('README example request and response match the API', () => {
    const request = block('readme-request');
    const response = block('readme-response');
    const result = validate(request.source, { zosLevel: request.zosLevel, jes: request.jes });
    const actual = JSON.parse(JSON.stringify({
        diagnostics: result.diagnostics,
        stats: result.stats,
        zosLevel: result.zosLevel,
        jes: result.jes
    }));
    assert.deepEqual(actual, response);
});
