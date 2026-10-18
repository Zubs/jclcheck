// Runs before every test file. Any real network call is a bug in the test:
// components must use a mocked API, and api.test.js stubs fetch itself.

import { afterEach, vi } from 'vitest';

vi.stubGlobal('fetch', () => {
    throw new Error('unexpected network call: stub fetch or mock src/api.js in this test');
});

// The real GoatCounter script must never be added to the page. Analytics tests
// pass initAnalytics() a fake document instead.
afterEach(() => {
    const scripts = document.querySelectorAll('script[src*="gc.zgo.at"]');
    if (scripts.length) {
        scripts.forEach(s => s.remove());
        throw new Error('a test added the real GoatCounter script to the page; pass initAnalytics() a fake document');
    }
});
