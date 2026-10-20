// What the site says must match what it does (Features.md feature 30).

import { test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function files(dir) {
    return readdirSync(dir).flatMap(name => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? files(full) : [full];
    });
}

test('no page claims the JCL is checked in the browser', () => {
    // JCL is sent to the API; only the draft stays in the user's browser.
    const claims = /right in your browser|runs entirely in|checked in your browser|never leaves your browser/i;
    const offenders = files(resolve('src')).filter(f => /\.(vue|js)$/.test(f) && claims.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
});
