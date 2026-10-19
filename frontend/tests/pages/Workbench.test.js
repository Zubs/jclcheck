import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import Workbench from '../../src/pages/Workbench.vue';
import HelpModal from '../../src/components/HelpModal.vue';
import { validateJcl } from '../../src/api.js';
import { track } from '../../src/analytics.js';
import { SAMPLES } from '../../src/samples.js';

vi.mock('../../src/api.js', () => ({ validateJcl: vi.fn() }));
vi.mock('../../src/analytics.js', () => ({ track: vi.fn(), pageview: vi.fn() }));

const CLEAN = {
    diagnostics: [],
    stats: { errors: 0, warnings: 0, statementCount: 3, stepCount: 1, procCount: 0, valid: true }
};

function errorsResult(count) {
    return {
        diagnostics: Array.from({ length: count }, (_, i) => ({
            code: 'JCLD002',
            severity: 'error',
            line: i + 1,
            column: 1,
            message: 'DD statement is missing a data source.',
            suggestion: null
        })),
        stats: { errors: count, warnings: 0, statementCount: 3, stepCount: 1, procCount: 0, valid: false }
    };
}

let wrapper;

async function mountWorkbench() {
    wrapper = mount(Workbench, {
        attachTo: document.body,
        global: { stubs: { 'router-link': RouterLinkStub } }
    });
    await flushPromises();
    return wrapper;
}

function statusText(w) {
    return w.find('.header-status__text').text();
}

function pfButton(w, label) {
    return w.findAll('.pfkey').find(b => b.find('.pfkey__label').text() === label);
}

async function edit(w, text) {
    await w.find('textarea').setValue(text);
}

beforeEach(() => {
    vi.useFakeTimers();
    validateJcl.mockReset();
    validateJcl.mockResolvedValue(CLEAN);
    track.mockClear();
});

afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
});

describe('Workbench', () => {
    test('checks the clean sample once when it opens', async () => {
        await mountWorkbench();
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(validateJcl).toHaveBeenCalledWith(SAMPLES.clean.code, { library: [] });
    });

    test('sends one check 450 ms after the last of several quick edits, with the latest text', async () => {
        const w = await mountWorkbench();
        validateJcl.mockClear();

        await edit(w, '//A');
        await vi.advanceTimersByTimeAsync(100);
        await edit(w, '//AB');
        await vi.advanceTimersByTimeAsync(100);
        await edit(w, '//ABC');
        await vi.advanceTimersByTimeAsync(449);
        expect(validateJcl).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(validateJcl).toHaveBeenCalledWith('//ABC', { library: [] });
    });

    test('shows VALIDATING while a check is in flight', async () => {
        validateJcl.mockReturnValue(new Promise(() => {}));
        const w = await mountWorkbench();
        expect(statusText(w)).toBe('VALIDATING');
    });

    test('shows CLEAN — 0 ERRORS for a clean result', async () => {
        const w = await mountWorkbench();
        expect(statusText(w)).toBe('CLEAN — 0 ERRORS');
    });

    test('shows the error count for a result with errors', async () => {
        validateJcl.mockResolvedValue(errorsResult(2));
        const w = await mountWorkbench();
        expect(statusText(w)).toBe('2 ERRORS');
    });

    test('uses the singular for one error', async () => {
        validateJcl.mockResolvedValue(errorsResult(1));
        const w = await mountWorkbench();
        expect(statusText(w)).toBe('1 ERROR');
    });

    test('shows API UNREACHABLE when the check fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        validateJcl.mockRejectedValue(new Error('Validation request failed (500): boom'));
        const w = await mountWorkbench();
        expect(statusText(w)).toBe('API UNREACHABLE');
    });

    test('cycles through the samples with SAMPLE', async () => {
        const w = await mountWorkbench();
        const textarea = w.find('textarea').element;

        await pfButton(w, 'SAMPLE').trigger('click');
        expect(textarea.value).toBe(SAMPLES.broken.code);
        await pfButton(w, 'SAMPLE').trigger('click');
        expect(textarea.value).toBe(SAMPLES.proc.code);
        await pfButton(w, 'SAMPLE').trigger('click');
        expect(textarea.value).toBe(SAMPLES.clean.code);
    });

    test('empties the editor with CLEAR', async () => {
        const w = await mountWorkbench();
        await pfButton(w, 'CLEAR').trigger('click');
        expect(w.find('textarea').element.value).toBe('');
    });

    test('opens help with HELP and hides it when closed', async () => {
        const w = await mountWorkbench();
        expect(w.findComponent(HelpModal).exists()).toBe(false);

        await pfButton(w, 'HELP').trigger('click');
        expect(w.findComponent(HelpModal).exists()).toBe(true);

        await w.find('.help-close').trigger('click');
        expect(w.findComponent(HelpModal).exists()).toBe(false);
    });

    test('goes to the line of a selected diagnostic', async () => {
        const result = errorsResult(3);
        validateJcl.mockResolvedValue(result);
        const w = await mountWorkbench();

        await w.findAll('.diag')[2].trigger('click');
        const textarea = w.find('textarea').element;
        const lineThree = SAMPLES.clean.code.split('\n')[2];
        expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe(lineThree);
    });

    test.fails('checks the JCL when F5 is pressed (feature 26)', async () => {
        await mountWorkbench();
        validateJcl.mockClear();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', bubbles: true, cancelable: true }));
        await flushPromises();
        expect(validateJcl).toHaveBeenCalledTimes(1);
    });

    test.fails('ignores a reply that arrives after a newer one (feature 35)', async () => {
        const w = await mountWorkbench();
        let resolveSlow;
        validateJcl
            .mockReturnValueOnce(new Promise(resolve => {
                resolveSlow = resolve;
            }))
            .mockResolvedValueOnce(errorsResult(1));

        await edit(w, '//OLD');
        await vi.advanceTimersByTimeAsync(450);
        await edit(w, '//NEW');
        await vi.advanceTimersByTimeAsync(450);
        expect(w.findAll('.diag')).toHaveLength(1);

        resolveSlow(errorsResult(3));
        await flushPromises();
        expect(w.findAll('.diag')).toHaveLength(1);
    });
});

function tracked(name) {
    return track.mock.calls.filter(([n]) => n === name).map(([, detail]) => String(detail));
}

function withCodes(...codes) {
    return {
        diagnostics: codes.map((code, i) => ({ code, severity: 'warning', line: i + 1, column: 1, message: code, suggestion: null })),
        stats: { errors: 0, warnings: codes.length, statementCount: 3, stepCount: 1, procCount: 0, valid: true }
    };
}

async function typeAndCheck(w, text) {
    await edit(w, text);
    await vi.advanceTimersByTimeAsync(450);
}

describe('Workbench analytics', () => {
    test('counts the VALIDATE button as check/button', async () => {
        const w = await mountWorkbench();
        await pfButton(w, 'VALIDATE').trigger('click');
        expect(tracked('check')).toEqual(['button']);
    });

    test('does not count automatic checks after typing one by one', async () => {
        const w = await mountWorkbench();
        for (let i = 0; i < 30; i++) {
            await typeAndCheck(w, `//J${i}`);
        }

        expect(validateJcl).toHaveBeenCalledTimes(31);
        expect(tracked('check')).toEqual([]);
    });

    test('counts samples, clear and help with their trigger', async () => {
        const w = await mountWorkbench();
        await pfButton(w, 'SAMPLE').trigger('click');
        await pfButton(w, 'CLEAR').trigger('click');
        await pfButton(w, 'HELP').trigger('click');
        expect(tracked('sample')).toEqual(['broken']);
        expect(tracked('clear')).toEqual(['button']);
        expect(tracked('help/open')).toEqual(['button']);
    });

    test('counts a clicked diagnostic by its code', async () => {
        validateJcl.mockResolvedValue(errorsResult(1));
        const w = await mountWorkbench();
        await w.find('.diag').trigger('click');
        expect(tracked('diag/click')).toEqual(['JCLD002']);
    });

    test('counts an error status as api/error/<status>', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        validateJcl.mockRejectedValue(Object.assign(new Error('failed (500)'), { status: 500 }));
        await mountWorkbench();
        expect(tracked('api/error')).toEqual(['500']);
    });

    test('counts an unreachable API as api/unreachable', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        validateJcl.mockRejectedValue(Object.assign(new Error('Failed to fetch'), { status: 0 }));
        await mountWorkbench();
        expect(tracked('api')).toEqual(['unreachable']);
    });

    test('counts a code seen in three checks once', async () => {
        validateJcl.mockResolvedValue(withCodes('JCLK001'));
        const w = await mountWorkbench();
        await typeAndCheck(w, '//A');
        await typeAndCheck(w, '//AB');
        expect(validateJcl).toHaveBeenCalledTimes(3);
        expect(tracked('diag/seen')).toEqual(['JCLK001']);
    });

    test('counts a code removed by editing as fixed, once per visit', async () => {
        validateJcl.mockResolvedValue(withCodes('JCLK001', 'JCLS002'));
        const w = await mountWorkbench();
        validateJcl.mockResolvedValue(withCodes('JCLS002'));
        await typeAndCheck(w, '//FIXED');
        validateJcl.mockResolvedValue(withCodes('JCLK001', 'JCLS002'));
        await typeAndCheck(w, '//BROKEN AGAIN');
        validateJcl.mockResolvedValue(withCodes('JCLS002'));
        await typeAndCheck(w, '//FIXED AGAIN');
        expect(tracked('diag/fixed')).toEqual(['JCLK001']);
    });

    test('does not count a code removed by loading a sample or clearing as fixed', async () => {
        validateJcl.mockResolvedValue(withCodes('JCLK001'));
        const w = await mountWorkbench();
        validateJcl.mockResolvedValue(CLEAN);
        await pfButton(w, 'SAMPLE').trigger('click');
        await vi.advanceTimersByTimeAsync(450);

        validateJcl.mockResolvedValue(withCodes('JCLS002'));
        await typeAndCheck(w, '//NEW');
        validateJcl.mockResolvedValue(CLEAN);
        await pfButton(w, 'CLEAR').trigger('click');
        await vi.advanceTimersByTimeAsync(450);
        expect(tracked('diag/fixed')).toEqual([]);
    });

    test('counts a 12-line paste as editor/paste/11-50', async () => {
        const w = await mountWorkbench();
        const event = new Event('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', {
            value: { getData: () => Array.from({ length: 12 }, (_, i) => `//L${i}`).join('\n') }
        });
        w.find('textarea').element.dispatchEvent(event);
        expect(tracked('editor/paste')).toEqual(['11-50']);
    });
});

describe('Workbench visit summary', () => {
    function summary() {
        return track.mock.calls.filter(([n]) => n.startsWith('visit/')).map(([n, d]) => `${n}/${d}`);
    }

    test('sends the buckets for the visit when the page is hidden', async () => {
        validateJcl.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 120));
            return errorsResult(1);
        });
        const w = await mountWorkbench(); // opening check of the 17-line clean sample
        await vi.advanceTimersByTimeAsync(120);
        for (let i = 0; i < 29; i++) {
            await edit(w, `//X${i}`);
            await vi.advanceTimersByTimeAsync(450 + 120);
        }

        await vi.advanceTimersByTimeAsync(3 * 60000 - (120 + 29 * 570));
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete document.visibilityState;

        expect(validateJcl).toHaveBeenCalledTimes(30);
        expect(summary()).toEqual([
            'visit/checks/21-100',
            'visit/lines/11-50',
            'visit/time/1-5m',
            'visit/latency/0-250ms',
            'visit/end/errors'
        ]);
    });

    test('buckets the largest JCL checked in the visit, not the last one', async () => {
        const w = await mountWorkbench(); // 17 lines
        await typeAndCheck(w, Array(60).fill('//X').join('\n'));
        await typeAndCheck(w, '//SHORT');
        w.unmount();
        expect(tracked('visit/lines')).toEqual(['51-200']);
        expect(tracked('visit/end')).toEqual(['clean']);
    });

    test('sends the summary once when the page is hidden and then left', async () => {
        const w = await mountWorkbench();
        window.dispatchEvent(new Event('pagehide'));
        w.unmount();
        expect(tracked('visit/checks')).toEqual(['1']);
    });

    test('sends no summary for a visit without checks', async () => {
        validateJcl.mockReturnValue(new Promise(() => {}));
        const w = await mountWorkbench(); // the opening check never finishes
        w.unmount();
        expect(summary()).toEqual([]);
    });
});

describe('Workbench library', () => {
    async function addMember(w, { dsn = '', member, source }) {
        if (!w.find('.library').exists()) {
            await w.find('.header-library').trigger('click');
        }

        await w.find('.library-add').trigger('click');
        const entries = w.findAll('.library-entry');
        const entry = entries[entries.length - 1];
        await entry.find('.library-dsn').setValue(dsn);
        await entry.find('.library-member').setValue(member);
        await entry.find('textarea').setValue(source);
        await vi.advanceTimersByTimeAsync(450);
        await flushPromises();
    }

    test('sends a member once it has a name, and counts adding it', async () => {
        const w = await mountWorkbench();
        await addMember(w, { dsn: 'my.procs', member: 'myproc2', source: '//MYPROC2 PROC' });
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, {
            library: [{ dsn: 'MY.PROCS', member: 'MYPROC2', source: '//MYPROC2 PROC' }]
        });
        expect(track).toHaveBeenCalledWith('library', 'add');
    });

    test('stops sending a removed member, and counts removing it', async () => {
        const w = await mountWorkbench();
        await addMember(w, { member: 'INC1', source: '//D DD DUMMY' });
        await w.find('.library-remove').trigger('click');
        await vi.advanceTimersByTimeAsync(450);
        await flushPromises();
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [] });
        expect(track).toHaveBeenCalledWith('library', 'remove');
    });

    test('opens the library at the member and line when a member diagnostic is clicked', async () => {
        validateJcl.mockResolvedValue({
            diagnostics: [{ code: 'JCLK001', severity: 'warning', line: 2, column: 1, message: 'm', suggestion: null, member: 'MY.PROCS(MYPROC2)' }],
            stats: { errors: 0, warnings: 1, statementCount: 3, stepCount: 1, procCount: 0, valid: true }
        });
        const w = await mountWorkbench();
        await addMember(w, { dsn: 'MY.PROCS', member: 'MYPROC2', source: '//MYPROC2 PROC\n//S EXEC PGM=X,REGON=4M' });
        await w.find('.header-library').trigger('click'); // close it again
        expect(w.find('.library').exists()).toBe(false);
        await w.find('.diag').trigger('click');
        await flushPromises();
        const memberText = w.findAll('textarea')[1].element;
        expect(memberText.value.slice(memberText.selectionStart, memberText.selectionEnd)).toBe('//S EXEC PGM=X,REGON=4M');
        expect(w.find('.diag-loc').text()).toBe('MYPROC2 L2:1');
    });

    test('says when a library member name is rejected', async () => {
        const w = await mountWorkbench();
        validateJcl.mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }));
        await addMember(w, { member: '1BAD', source: '' });
        expect(statusText(w)).toBe('CHECK A LIBRARY MEMBER NAME');
    });
});
