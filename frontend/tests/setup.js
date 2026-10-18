// Runs before every test file. Any real network call is a bug in the test:
// components must use a mocked API, and api.test.js stubs fetch itself.

import { vi } from 'vitest';

vi.stubGlobal('fetch', () => {
    throw new Error('unexpected network call: stub fetch or mock src/api.js in this test');
});
