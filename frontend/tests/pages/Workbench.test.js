import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import Workbench from '../../src/pages/Workbench.vue';
import HelpModal from '../../src/components/HelpModal.vue';
import { validateJcl, getLevels, formatJcl } from '../../src/api.js';
import { track } from '../../src/analytics.js';
import { SAMPLES } from '../../src/samples.js';

vi.mock('../../src/api.js', () => ({ validateJcl: vi.fn(), getLevels: vi.fn(), formatJcl: vi.fn() }));

const LEVELS = {
    levels: [
        { level: '2.3', jes3: true },
        { level: '2.4', jes3: true },
        { level: '2.5', jes3: true },
        { level: '3.1', jes3: false },
        { level: '3.2', jes3: false }
    ],
    defaultLevel: '3.2',
    defaultJes: 'JES2'
};
// What every check sends at the default level and JES, with the signal that
// aborts it when a newer check starts (feature 35).
const DEFAULTS = { zosLevel: '3.2', jes: 'JES2', signal: expect.any(AbortSignal) };
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
    getLevels.mockReset();
    getLevels.mockResolvedValue(LEVELS);
    track.mockClear();
});

afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
    localStorage.clear(); // drafts saved by one test mustn't open the next
});

describe('Workbench', () => {
    test('checks the clean sample once when it opens', async () => {
        await mountWorkbench();
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(validateJcl).toHaveBeenCalledWith(SAMPLES.clean.code, { library: [], ...DEFAULTS });
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
        expect(validateJcl).toHaveBeenCalledWith('//ABC', { library: [], ...DEFAULTS });
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

    // Was an expected failure until feature 26.
    test('checks the JCL when F5 is pressed (feature 26)', async () => {
        await mountWorkbench();
        validateJcl.mockClear();
        const event = new KeyboardEvent('keydown', { key: 'F5', bubbles: true, cancelable: true });
        window.dispatchEvent(event);
        await flushPromises();
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
    });

    test('ignores a reply that arrives after a newer one (feature 35)', async () => {
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

    test('aborts the check in flight when a newer one starts (feature 35)', async () => {
        const w = await mountWorkbench();
        validateJcl.mockReturnValueOnce(new Promise(() => {}));
        await edit(w, '//OLD');
        await vi.advanceTimersByTimeAsync(450);
        const { signal } = validateJcl.mock.calls.at(-1)[1];
        expect(signal.aborted).toBe(false);

        await pfButton(w, 'VALIDATE').trigger('click');
        expect(signal.aborted).toBe(true);
    });

    test('shows only the last of five quick edits when replies come back out of order (feature 35)', async () => {
        const w = await mountWorkbench();
        const pending = [];
        validateJcl.mockImplementation(source => new Promise(resolve => {
            pending.push(() => resolve(errorsResult(Number(source.slice(3)))));
        }));
        for (let n = 1; n <= 5; n++) {
            await edit(w, `//E${n}`);
            await vi.advanceTimersByTimeAsync(450);
        }

        const counts = [];
        for (const index of [4, 0, 2, 1, 3]) {
            pending[index]();
            await flushPromises();
            counts.push(w.findAll('.diag').length);
        }

        expect(counts).toEqual([5, 5, 5, 5, 5]);
        expect(statusText(w)).toBe('5 ERRORS');
    });

    test('ends with the newest result when an edit is made as a reply arrives (feature 35)', async () => {
        const w = await mountWorkbench();
        let resolveFirst;
        validateJcl
            .mockReturnValueOnce(new Promise(resolve => {
                resolveFirst = resolve;
            }))
            .mockResolvedValueOnce(errorsResult(2));
        await edit(w, '//A');
        await vi.advanceTimersByTimeAsync(450);
        await edit(w, '//AB');
        resolveFirst(errorsResult(1));
        await flushPromises();
        await vi.advanceTimersByTimeAsync(450);
        expect(statusText(w)).toBe('2 ERRORS');
    });

    test('keeps VALIDATING until the newest reply arrives (feature 35)', async () => {
        const w = await mountWorkbench();
        let resolveOld, resolveNew;
        validateJcl
            .mockReturnValueOnce(new Promise(resolve => {
                resolveOld = resolve;
            }))
            .mockReturnValueOnce(new Promise(resolve => {
                resolveNew = resolve;
            }));
        await edit(w, '//OLD');
        await vi.advanceTimersByTimeAsync(450);
        expect(statusText(w)).toBe('VALIDATING');
        await edit(w, '//NEW');
        await vi.advanceTimersByTimeAsync(450);
        resolveOld(CLEAN);
        await flushPromises();
        expect(statusText(w)).toBe('VALIDATING');
        resolveNew(errorsResult(1));
        await flushPromises();
        expect(statusText(w)).toBe('1 ERROR');
    });

    test('shows API UNREACHABLE when the newest check fails, even if an older one succeeds later (feature 35)', async () => {
        const w = await mountWorkbench();
        let resolveOld;
        validateJcl
            .mockReturnValueOnce(new Promise(resolve => {
                resolveOld = resolve;
            }))
            .mockRejectedValueOnce(Object.assign(new Error('down'), { status: 0 }));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await edit(w, '//OLD');
        await vi.advanceTimersByTimeAsync(450);
        await edit(w, '//NEW');
        await vi.advanceTimersByTimeAsync(450);
        await flushPromises();
        expect(statusText(w)).toBe('API UNREACHABLE');
        resolveOld(CLEAN);
        await flushPromises();
        expect(statusText(w)).toBe('API UNREACHABLE');
    });

    test('does not report an aborted check as unreachable (feature 35)', async () => {
        const w = await mountWorkbench();
        validateJcl
            .mockImplementationOnce((source, { signal }) => new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { status: 0 })));
            }))
            .mockResolvedValueOnce(CLEAN);
        await edit(w, '//OLD');
        await vi.advanceTimersByTimeAsync(450);
        await edit(w, '//NEW');
        await vi.advanceTimersByTimeAsync(450);
        await flushPromises();
        expect(statusText(w)).toBe('CLEAN — 0 ERRORS');
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

    test('opens the DATASETS grid and goes to a DD from a cell (feature 36)', async () => {
        validateJcl.mockResolvedValue({
            ...CLEAN,
            datasets: [{ job: 'J', steps: ['S1'], datasets: [{ name: 'A.B', temporary: false, touches: [{ step: 'S1', dd: 'D', line: 2, column: 5, actions: ['R'] }] }] }]
        });
        const w = await mountWorkbench();
        await edit(w, '//J JOB\n//S1 EXEC PGM=X\n//D DD DSN=A.B,DISP=SHR');
        await w.find('.panel-tab--datasets').trigger('click');
        await w.find('.flow-cell').trigger('click');
        await flushPromises();
        expect(tracked('datasets')).toEqual(['open', 'cell-click']);
        const el = w.find('textarea').element;
        expect(el.value.slice(el.selectionStart, el.selectionEnd)).toBe('//S1 EXEC PGM=X');
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
            library: [{ dsn: 'MY.PROCS', member: 'MYPROC2', source: '//MYPROC2 PROC' }],
            ...DEFAULTS
        });
        expect(track).toHaveBeenCalledWith('library', 'add');
    });

    test('stops sending a removed member, and counts removing it', async () => {
        const w = await mountWorkbench();
        await addMember(w, { member: 'INC1', source: '//D DD DUMMY' });
        await w.find('.library-remove').trigger('click');
        await vi.advanceTimersByTimeAsync(450);
        await flushPromises();
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], ...DEFAULTS });
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

describe('Workbench keyboard shortcuts', () => {
    async function press(key, options = {}) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
        window.dispatchEvent(event);
        await flushPromises();
        return event;
    }

    test('Ctrl+Enter checks the JCL', async () => {
        await mountWorkbench();
        validateJcl.mockClear();
        await press('Enter', { ctrlKey: true });
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(track).toHaveBeenCalledWith('check', 'shortcut');
    });

    test('F9 three times cycles through the samples back to the first', async () => {
        const w = await mountWorkbench();
        const seen = [];
        for (let i = 0; i < 3; i++) {
            await press('F9');
            seen.push(w.find('textarea').element.value);
        }

        expect(seen).toEqual([SAMPLES.broken.code, SAMPLES.proc.code, SAMPLES.clean.code]);
    });

    test('F1 opens help, Escape closes it, and other keys wait while it is open', async () => {
        const w = await mountWorkbench();
        await press('F1');
        expect(w.findComponent(HelpModal).exists()).toBe(true);
        expect(track).toHaveBeenCalledWith('help/open', 'f1');
        validateJcl.mockClear();
        await press('F5');
        expect(validateJcl).not.toHaveBeenCalled();
        await press('Escape');
        expect(w.findComponent(HelpModal).exists()).toBe(false);
    });

    test('Alt+C clears the editor when the browser keeps F12', async () => {
        const w = await mountWorkbench();
        await press('ç', { altKey: true, code: 'KeyC' });
        expect(w.find('textarea').element.value).toBe('');
        expect(track).toHaveBeenCalledWith('clear', 'shortcut');
    });

    test('F12 on an empty editor does nothing and offers no undo', async () => {
        const w = await mountWorkbench();
        await press('F12');
        track.mockClear();
        await press('F12');
        expect(w.find('.undo-notice').exists()).toBe(false);
        expect(track).not.toHaveBeenCalledWith('clear', 'f12');
    });

    test('Undo after F12 brings the typed text back exactly', async () => {
        const w = await mountWorkbench();
        await edit(w, '//MINE JOB\n//S EXEC PGM=X  ');
        await press('F12');
        expect(w.find('textarea').element.value).toBe('');
        await w.find('.undo-button').trigger('click');
        expect(w.find('textarea').element.value).toBe('//MINE JOB\n//S EXEC PGM=X  ');
        expect(track).toHaveBeenCalledWith('undo', 'f12');
        expect(w.find('.undo-notice').exists()).toBe(false);
    });

    test('the Undo notice goes away after 5 seconds', async () => {
        const w = await mountWorkbench();
        await edit(w, '//MINE JOB');
        await press('F9');
        expect(w.find('.undo-notice').exists()).toBe(true);
        await vi.advanceTimersByTimeAsync(5000);
        expect(w.find('.undo-notice').exists()).toBe(false);
    });

    test('a sample replacing a sample offers no undo', async () => {
        const w = await mountWorkbench();
        await press('F9');
        expect(w.find('.undo-notice').exists()).toBe(false);
    });

    test('keys do nothing after the workbench is left', async () => {
        const w = await mountWorkbench();
        w.unmount();
        validateJcl.mockClear();
        await press('F5');
        expect(validateJcl).not.toHaveBeenCalled();
    });

    test('a keyboard-only session: write, check, read help, close it, fix', async () => {
        const w = await mountWorkbench();
        await edit(w, '//J JOB\n//S EXEC PGM=X,REGON=4M');
        validateJcl.mockClear();
        await press('F5');
        expect(validateJcl).toHaveBeenCalledTimes(1);
        await press('F1');
        expect(w.findComponent(HelpModal).exists()).toBe(true);
        await press('Escape');
        await edit(w, '//J JOB\n//S EXEC PGM=X,REGION=4M');
        await press('Enter', { metaKey: true });
        expect(validateJcl).toHaveBeenLastCalledWith('//J JOB\n//S EXEC PGM=X,REGION=4M', { library: [], ...DEFAULTS });
    });
});

describe('Workbench level and JES picker', () => {
    afterEach(() => {
        window.history.replaceState(null, '', '/');
        localStorage.clear();
        vi.restoreAllMocks();
    });

    const pick = async (w, selector, value) => {
        await w.find(selector).setValue(value);
        await flushPromises();
    };

    test('Z: a first visit selects the newest level and JES2', async () => {
        const w = await mountWorkbench();
        expect(w.find('.level-picker').element.value).toBe('3.2');
        expect(w.find('.jes-picker').element.value).toBe('JES2');
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: '3.2', jes: 'JES2', signal: expect.any(AbortSignal) });
    });

    test('O: choosing 2.3 checks again at 2.3, counts it and keeps it in the address', async () => {
        const w = await mountWorkbench();
        validateJcl.mockClear();
        track.mockClear();
        await pick(w, '.level-picker', '2.3');
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: '2.3', jes: 'JES2', signal: expect.any(AbortSignal) });
        expect(track).toHaveBeenCalledWith('level', '2.3');
        expect(window.location.search).toBe('?zos=2.3&jes=JES2');
        expect(JSON.parse(localStorage.getItem('jclcheck.picker'))).toEqual({ zosLevel: '2.3', jes: 'JES2' });
    });

    test('B: the oldest and newest levels can both be chosen', async () => {
        const w = await mountWorkbench();
        await pick(w, '.level-picker', '2.3');
        await pick(w, '.level-picker', '3.2');
        expect(validateJcl.mock.calls.map(([, options]) => options.zosLevel).slice(-2)).toEqual(['2.3', '3.2']);
    });

    test('B: JES3 at 2.5, then 3.1 switches back to JES2 with a notice', async () => {
        const w = await mountWorkbench();
        await pick(w, '.level-picker', '2.5');
        await pick(w, '.jes-picker', 'JES3');
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: '2.5', jes: 'JES3', signal: expect.any(AbortSignal) });
        await pick(w, '.level-picker', '3.1');
        expect(w.find('.jes-picker').element.value).toBe('JES2');
        expect(w.find('.picker-notice').text()).toContain('IBM removed JES3 in z/OS 3.1');
        expect(w.find('.jes-picker option[value="JES3"]').element.disabled).toBe(true);
    });

    test('a shared address chooses the level and JES', async () => {
        window.history.replaceState(null, '', '/app?zos=2.5&jes=JES3');
        await mountWorkbench();
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: '2.5', jes: 'JES3', signal: expect.any(AbortSignal) });
    });

    test('E: an unknown level in the address falls back with a notice', async () => {
        window.history.replaceState(null, '', '/app?zos=9.9');
        const w = await mountWorkbench();
        expect(w.find('.level-picker').element.value).toBe('3.2');
        expect(w.find('.picker-notice').text()).toContain("z/OS 9.9 isn't supported");
    });

    test('E: JES3 at a 3.x level in the address falls back to JES2 with a notice', async () => {
        window.history.replaceState(null, '', '/app?zos=3.2&jes=JES3');
        const w = await mountWorkbench();
        expect(w.find('.jes-picker').element.value).toBe('JES2');
        expect(w.find('.picker-notice').text()).toContain('IBM removed JES3');
    });

    test('a remembered choice is used on the next visit', async () => {
        localStorage.setItem('jclcheck.picker', JSON.stringify({ zosLevel: '2.4', jes: 'JES3' }));
        await mountWorkbench();
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: '2.4', jes: 'JES3', signal: expect.any(AbortSignal) });
    });

    test('E: blocked storage leaves the picker working', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const w = await mountWorkbench();
        await pick(w, '.level-picker', '2.4');
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: '2.4', jes: 'JES2', signal: expect.any(AbortSignal) });
    });

    test('I: the panel shows what the result was checked against', async () => {
        validateJcl.mockResolvedValue({ ...CLEAN, zosLevel: '2.4', jes: 'JES2' });
        const w = await mountWorkbench();
        expect(w.find('.checked-against').text()).toBe('Z/OS 2.4 · JES2');
    });

    test('without the levels the picker is hidden and the API defaults apply', async () => {
        getLevels.mockRejectedValue(new Error('down'));
        const w = await mountWorkbench();
        expect(w.find('.level-picker').exists()).toBe(false);
        expect(validateJcl).toHaveBeenLastCalledWith(SAMPLES.clean.code, { library: [], zosLevel: null, jes: null, signal: expect.any(AbortSignal) });
    });
});

describe('Workbench drafts', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    const saved = () => JSON.parse(localStorage.getItem('jclcheck.draft'));

    async function remount() {
        wrapper.unmount();
        return mountWorkbench();
    }

    test('Z: with nothing saved the clean sample is shown', async () => {
        const w = await mountWorkbench();
        expect(w.find('textarea').element.value).toBe(SAMPLES.clean.code);
        expect(w.find('.draft-notice').exists()).toBe(false);
    });

    test('O: a typed job comes back after the page is opened again', async () => {
        let w = await mountWorkbench();
        await edit(w, '//MINE JOB');
        await vi.advanceTimersByTimeAsync(500);
        expect(saved().code).toBe('//MINE JOB');
        w = await remount();
        expect(w.find('textarea').element.value).toBe('//MINE JOB');
        expect(track).toHaveBeenCalledWith('draft', 'restored');
    });

    test('Z: a cleared editor comes back empty, not the sample', async () => {
        let w = await mountWorkbench();
        await w.findAll('.pfkey').find(b => b.text().includes('CLEAR')).trigger('click');
        await vi.advanceTimersByTimeAsync(500);
        w = await remount();
        expect(w.find('textarea').element.value).toBe('');
    });

    test('M: a job and three library members come back', async () => {
        localStorage.setItem('jclcheck.draft', JSON.stringify({
            code: '//J JOB',
            library: [1, 2, 3].map(n => ({ dsn: 'MY.PROCS', member: `P${n}`, source: `//S${n} EXEC PGM=X` }))
        }));
        const w = await mountWorkbench();
        expect(w.find('textarea').element.value).toBe('//J JOB');
        expect(w.find('.header-library').text()).toBe('LIBRARY (3)');
        expect(validateJcl.mock.calls[0][1].library.map(e => e.member)).toEqual(['P1', 'P2', 'P3']);
    });

    test('B: a change is saved on leaving even inside the half second', async () => {
        const w = await mountWorkbench();
        await edit(w, '//LAST JOB');
        w.unmount();
        expect(saved().code).toBe('//LAST JOB');
    });

    test('E: blocked storage shows the sample, checks, and says once that nothing is saved', async () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const w = await mountWorkbench();
        expect(w.find('textarea').element.value).toBe(SAMPLES.clean.code);
        expect(validateJcl).toHaveBeenCalled();
        expect(w.findAll('.draft-notice')).toHaveLength(1);
        await edit(w, '//X JOB');
        await vi.advanceTimersByTimeAsync(500);
        expect(w.findAll('.draft-notice')).toHaveLength(1);
    });

    test('E: a corrupted draft is ignored and the sample shown', async () => {
        localStorage.setItem('jclcheck.draft', '{not json');
        const w = await mountWorkbench();
        expect(w.find('textarea').element.value).toBe(SAMPLES.clean.code);
        expect(track).toHaveBeenCalledWith('draft', 'corrupt');
    });
});

describe('Workbench sharing', () => {
    afterEach(() => {
        window.history.replaceState(null, '', '/');
        vi.unstubAllGlobals();
    });

    const shareButton = w => w.findAll('.pfkey').find(b => b.text().includes('SHARE'));

    async function shareAndCapture(w) {
        const writeText = vi.fn(async () => {});
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        await shareButton(w).trigger('click');
        await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
        return writeText.mock.calls[0][0];
    }

    async function openLink(link) {
        const url = new URL(link);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        validateJcl.mockClear();
        const w = await mountWorkbench();
        await vi.waitFor(() => expect(validateJcl).toHaveBeenCalled());
        await flushPromises();
        return w;
    }

    test('an empty editor is refused', async () => {
        const w = await mountWorkbench();
        await w.findAll('.pfkey').find(b => b.text().includes('CLEAR')).trigger('click');
        await shareButton(w).trigger('click');
        await flushPromises();
        expect(w.find('.share-message').text()).toContain('nothing to share');
        expect(track).not.toHaveBeenCalledWith('share', 'create');
    });

    test('a link is copied and counted', async () => {
        const w = await mountWorkbench();
        const link = await shareAndCapture(w);
        expect(link).toMatch(/\/app\?zos=3\.2&jes=JES2#jcl=/);
        expect(track).toHaveBeenCalledWith('share', 'create');
        expect(w.find('.share-message').text()).toContain('Link copied');
    });

    test('with the clipboard blocked the link is shown to copy by hand', async () => {
        const w = await mountWorkbench();
        const writeText = async () => {
            throw new Error('blocked');
        };

        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        await shareButton(w).trigger('click');
        await vi.waitFor(() => expect(w.find('.share-link').exists()).toBe(true));
        expect(w.find('.share-link').element.value).toMatch(/#jcl=/);
        expect(track).toHaveBeenCalledWith('share', 'clipboard-blocked');
    });

    test('a job, two members, 2.5 and JES3 round-trip, checked once, without touching the draft', async () => {
        let w = await mountWorkbench();
        await w.find('.level-picker').setValue('2.5');
        await w.find('.jes-picker').setValue('JES3');
        await edit(w, '//SHARED JOB');
        await w.find('.header-library').trigger('click');
        for (const member of ['P1', 'P2']) {
            await w.find('.library-add').trigger('click');
            const entry = w.findAll('.library-entry').at(-1);
            await entry.find('.library-member').setValue(member);
            await entry.find('textarea').setValue(`//${member} PROC`);
        }

        const link = await shareAndCapture(w);
        w.unmount();
        localStorage.clear();
        localStorage.setItem('jclcheck.draft', JSON.stringify({ code: '//MY DRAFT', library: [] }));

        w = await openLink(link);
        expect(w.find('textarea').element.value).toBe('//SHARED JOB');
        expect(validateJcl).toHaveBeenCalledTimes(1);
        const [source, options] = validateJcl.mock.calls[0];
        expect(source).toBe('//SHARED JOB');
        expect(options).toMatchObject({ zosLevel: '2.5', jes: 'JES3' });
        expect(options.library.map(e => e.member)).toEqual(['P1', 'P2']);
        expect(track).toHaveBeenCalledWith('share', 'open');
        await vi.advanceTimersByTimeAsync(1000);
        expect(JSON.parse(localStorage.getItem('jclcheck.draft')).code).toBe('//MY DRAFT');
    });

    test('Back to my draft restores the draft exactly', async () => {
        let w = await mountWorkbench();
        await edit(w, '//SHARED JOB');
        const link = await shareAndCapture(w);
        w.unmount();
        localStorage.setItem('jclcheck.draft', JSON.stringify({ code: '//MY DRAFT  \n//S EXEC PGM=X', library: [] }));
        w = await openLink(link);
        await w.find('.back-to-draft').trigger('click');
        expect(w.find('textarea').element.value).toBe('//MY DRAFT  \n//S EXEC PGM=X');
        expect(track).toHaveBeenCalledWith('share', 'back-to-draft');
        expect(window.location.hash).toBe('');
    });

    test('editing a shared job makes it the draft', async () => {
        let w = await mountWorkbench();
        await edit(w, '//SHARED JOB');
        const link = await shareAndCapture(w);
        w.unmount();
        w = await openLink(link);
        await edit(w, '//SHARED JOB EDITED');
        await vi.advanceTimersByTimeAsync(500);
        expect(JSON.parse(localStorage.getItem('jclcheck.draft')).code).toBe('//SHARED JOB EDITED');
        expect(w.find('.back-to-draft').exists()).toBe(false);
    });

    test('a damaged link says so and loads the draft', async () => {
        localStorage.setItem('jclcheck.draft', JSON.stringify({ code: '//MY DRAFT', library: [] }));
        const w = await openLink('https://jclcheck.xyz/app#jcl=H4sIAAAAAAAAA-broken');
        expect(w.find('.share-message').text()).toContain('This link is incomplete or damaged');
        expect(w.find('textarea').element.value).toBe('//MY DRAFT');
    });

    test('F6 and Alt+L share too', async () => {
        const w = await mountWorkbench();
        const writeText = vi.fn(async () => {});
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F6', cancelable: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '¬', code: 'KeyL', altKey: true, cancelable: true }));
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
        expect(w.find('.share-message').exists()).toBe(true);
    });

    test('a shared link carries the site profile (feature 37)', async () => {
        let w = await mountWorkbench();
        await w.find('.header-profile').trigger('click');
        await w.find('.profile-text').setValue('{"names":{"job":"AR*"}}');
        const link = await shareAndCapture(w);
        w.unmount();
        localStorage.clear();
        w = await openLink(link);
        expect(validateJcl.mock.calls[0][1].profile).toEqual({ names: { job: 'AR*' } });
        await w.find('.back-to-draft').trigger('click');
        await w.find('.header-profile').trigger('click');
        expect(w.find('.profile-text').element.value).toBe('');
    });
});

describe('Workbench site profile and suppressions (feature 37)', () => {
    const SUPPRESSED = {
        diagnostics: [
            { code: 'JCLK001', severity: 'warning', line: 3, column: 20, message: 'LOCALKW', suggestion: null, suppressed: true },
            { code: 'JCLD002', severity: 'error', line: 4, column: 1, message: 'no source', suggestion: null }
        ],
        stats: { errors: 1, warnings: 0, suppressed: 1, statementCount: 3, stepCount: 1, procCount: 0, valid: false }
    };

    async function openProfile(w, text) {
        await w.find('.header-profile').trigger('click');
        await w.find('.profile-text').setValue(text);
        await vi.advanceTimersByTimeAsync(450);
        await flushPromises();
    }

    test('sends a valid profile with each check, and counts its rules once', async () => {
        const w = await mountWorkbench();
        await openProfile(w, '{"names":{"job":"AR*"},"allowed":{"CLASS":["A"]}}');
        expect(validateJcl.mock.calls.at(-1)[1].profile).toEqual({ names: { job: 'AR*' }, allowed: { CLASS: ['A'] } });
        await pfButton(w, 'VALIDATE').trigger('click');
        await flushPromises();
        expect(tracked('profile')).toEqual(['edit']);
        expect(tracked('profile/rule')).toEqual(['names', 'allowed']);
        expect(w.find('.profile-topline__meta').text()).toBe('IN USE');
    });

    test('does not send a profile that is not valid JSON, and says why', async () => {
        const w = await mountWorkbench();
        await openProfile(w, '{"names":');
        expect(validateJcl.mock.calls.at(-1)[1]).not.toHaveProperty('profile');
        expect(w.find('.profile-problem').text()).toContain('Not valid JSON');
        expect(w.find('.profile-topline__meta').text()).toBe('NOT USED');
    });

    test('shows the API\'s reason when it refuses the profile', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const w = await mountWorkbench();
        validateJcl.mockRejectedValueOnce(Object.assign(new Error('400'), { status: 400, detail: 'profile.names.job must be a string or a list of up to 200 strings.' }));
        await openProfile(w, '{"names":{"job":5}}');
        expect(statusText(w)).toBe('CHECK THE SITE PROFILE');
        expect(w.find('.profile-problem').text()).toContain('profile.names.job');
    });

    test('keeps the profile in the draft', async () => {
        let w = await mountWorkbench();
        await openProfile(w, '{"dsnPrefixes":["AR"]}');
        await vi.advanceTimersByTimeAsync(600);
        expect(JSON.parse(localStorage.getItem('jclcheck.draft')).profile).toBe('{"dsnPrefixes":["AR"]}');
        w.unmount();
        validateJcl.mockClear();
        w = await mountWorkbench();
        expect(validateJcl.mock.calls[0][1].profile).toEqual({ dsnPrefixes: ['AR'] });
    });

    test('hides suppressed diagnostics until asked, and does not underline them', async () => {
        validateJcl.mockResolvedValue(SUPPRESSED);
        const w = await mountWorkbench();
        expect(w.findAll('.diag').map(d => d.find('.diag-code').text())).toEqual(['JCLD002']);
        expect(w.find('.stat-suppressed').text()).toBe('1 SUPPRESSED');
        expect(w.find('.u-warning').exists()).toBe(false);
        await w.find('.stat-suppressed').trigger('click');
        expect(w.findAll('.diag').map(d => d.find('.diag-sev').text())).toEqual(['HIDDEN', 'ERR']);
        expect(tracked('suppress')).toEqual(['JCLK001']);
        expect(tracked('diag/seen')).toEqual(['JCLD002']);
    });
});

describe('Workbench formatter (feature 39)', () => {
    const FORMATTED = { text: '//J        JOB\n//S        EXEC PGM=X', changed: [1, 2], notes: [], refused: null };

    beforeEach(() => {
        formatJcl.mockReset();
        formatJcl.mockResolvedValue(FORMATTED);
    });

    test('F4 shows a preview marking the changed lines, and APPLY replaces the text with an undo', async () => {
        const w = await mountWorkbench();
        await edit(w, '//J JOB\n//S EXEC PGM=X');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4', cancelable: true }));
        await flushPromises();
        expect(formatJcl).toHaveBeenCalledWith('//J JOB\n//S EXEC PGM=X');
        expect(w.findAll('.format-after .format-line.is-changed')).toHaveLength(2);
        expect(w.find('textarea').element.value).toBe('//J JOB\n//S EXEC PGM=X');

        await w.find('.format-apply').trigger('click');
        expect(w.find('textarea').element.value).toBe(FORMATTED.text);
        expect(w.find('.format').exists()).toBe(false);
        expect(w.find('.undo-notice').text()).toContain('JCL formatted.');
        await w.find('.undo-button').trigger('click');
        expect(w.find('textarea').element.value).toBe('//J JOB\n//S EXEC PGM=X');
        expect(tracked('format')).toEqual(['f4', 'applied']);
        expect(tracked('undo')).toEqual(['f4']);
    });

    test('the button and Alt+R format too, and Escape cancels the preview', async () => {
        const w = await mountWorkbench();
        await pfButton(w, 'FORMAT').trigger('click');
        await flushPromises();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
        await flushPromises();
        expect(w.find('.format').exists()).toBe(false);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', altKey: true, cancelable: true }));
        await flushPromises();
        await w.find('.format-cancel').trigger('click');
        expect(tracked('format')).toEqual(['button', 'cancelled', 'shortcut', 'cancelled']);
    });

    test('a refused result or formatted JCL says so instead of a preview', async () => {
        const w = await mountWorkbench();
        formatJcl.mockResolvedValueOnce({ text: SAMPLES.clean.code, changed: [], notes: [], refused: 'It would not mean the same.' });
        await pfButton(w, 'FORMAT').trigger('click');
        await flushPromises();
        expect(w.find('.format-message').text()).toContain('It would not mean the same.');
        expect(tracked('format')).toEqual(['button', 'refused']);
        formatJcl.mockResolvedValueOnce({ text: SAMPLES.clean.code, changed: [], notes: [], refused: null });
        await pfButton(w, 'FORMAT').trigger('click');
        await flushPromises();
        expect(w.find('.format-message').text()).toContain('already formatted');
        expect(w.find('.format').exists()).toBe(false);
    });

    test('an unreachable API is reported', async () => {
        const w = await mountWorkbench();
        formatJcl.mockRejectedValueOnce(Object.assign(new Error('down'), { status: 0 }));
        await pfButton(w, 'FORMAT').trigger('click');
        await flushPromises();
        expect(w.find('.format-message').text()).toContain("can't be formatted");
    });
});
