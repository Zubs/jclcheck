// Runs the real analytics module, as on the production site but with a fake
// GoatCounter, through a whole workbench session with JCL containing a unique
// marker. Nothing the user typed may reach GoatCounter.

import { test, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import App from '../src/App.vue';
import router from '../src/router.js';
import { initAnalytics } from '../src/analytics.js';
import { validateJcl } from '../src/api.js';

vi.mock('../src/api.js', () => ({
    validateJcl: vi.fn(),
    getLevels: vi.fn(async () => ({ levels: [{ level: '3.1', jes3: false }, { level: '3.2', jes3: false }], defaultLevel: '3.2', defaultJes: 'JES2' }))
}));
vi.stubGlobal('scrollTo', vi.fn());

const MARKER = 'ZQXMARK9';

// Diagnostic messages quote names from the JCL, as the real validator does.
function resultFor(source) {
    const quoted = source.includes(MARKER) ? MARKER : 'none';
    return {
        diagnostics: [
            { code: 'JCLK001', severity: 'warning', line: 1, column: 5, message: `'${quoted}' is not a recognized keyword.`, suggestion: `Did you mean '${quoted}'?` },
            { code: 'JCLS006', severity: 'error', line: 2, column: 9, message: `Invalid DSN '${quoted}.DATA'.`, suggestion: null }
        ],
        stats: { errors: 1, warnings: 1, statementCount: 2, stepCount: 1, procCount: 0, valid: false }
    };
}

test('no page view or event contains anything from the JCL or the address hash', async () => {
    vi.useFakeTimers();
    validateJcl.mockImplementation(async source => resultFor(source));
    const storageBefore = Object.keys(localStorage).length;

    const fakeDocument = document.implementation.createHTMLDocument('fake');
    const win = {};
    initAnalytics({
        url: 'https://jclcheck.goatcounter.com/count',
        location: { hostname: 'jclcheck.xyz' },
        navigator: {},
        document: fakeDocument,
        win
    });
    const count = vi.fn();
    win.goatcounter = { ...win.goatcounter, count };
    fakeDocument.querySelector('script').dispatchEvent(new Event('load'));

    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } });
    await router.push(`/app?name=${MARKER}&zos=3.1#jcl=${MARKER}`);
    await flushPromises();

    const textarea = wrapper.find('textarea');
    await textarea.setValue(`//${MARKER} JOB\n//S1 EXEC PGM=${MARKER}\n//DD1 DD DSN=${MARKER}.DATA`);
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();

    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => `//${MARKER} DD *\n${MARKER}` } });
    textarea.element.dispatchEvent(paste);

    // A library member holding the marker goes to the API, never to analytics.
    await wrapper.find('.header-library').trigger('click');
    await wrapper.find('.library-add').trigger('click');
    await wrapper.find('.library-dsn').setValue(`${MARKER}.PROCS`);
    await wrapper.find('.library-member').setValue('MEMBER1');
    await wrapper.findAll('textarea')[1].setValue(`//${MARKER} PROC\n//S EXEC PGM=${MARKER}`);
    await vi.advanceTimersByTimeAsync(450);
    await flushPromises();
    expect(JSON.stringify(validateJcl.mock.calls.at(-1)[1])).toContain(MARKER);

    for (const entry of wrapper.findAll('.diag')) {
        await entry.trigger('click');
    }

    await wrapper.findAll('.pfkey').find(b => b.text().includes('VALIDATE')).trigger('click');
    await flushPromises();
    wrapper.unmount(); // sends the visit summary
    vi.useRealTimers();

    const sent = JSON.stringify(count.mock.calls);
    expect(count.mock.calls.length).toBeGreaterThan(5);
    expect(sent).not.toContain(MARKER);
    for (const [vars] of count.mock.calls) {
        expect(vars.path).not.toContain('#');
    }

    expect(count.mock.calls.map(([v]) => v.path)).toEqual(expect.arrayContaining([
        '/app?zos=3.1',
        'diag/seen/JCLK001',
        'diag/click/JCLS006',
        'editor/paste/1-10',
        'check/button',
        'library/add',
        'visit/end/errors'
    ]));
    expect(document.cookie).toBe('');
    expect(Object.keys(localStorage).length).toBe(storageBefore);
});
