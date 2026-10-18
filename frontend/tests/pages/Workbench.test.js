import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import Workbench from '../../src/pages/Workbench.vue';
import HelpModal from '../../src/components/HelpModal.vue';
import { validateJcl } from '../../src/api.js';
import { SAMPLES } from '../../src/samples.js';

vi.mock('../../src/api.js', () => ({ validateJcl: vi.fn() }));

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
});

afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
});

describe('Workbench', () => {
    test('checks the clean sample once when it opens', async () => {
        await mountWorkbench();
        expect(validateJcl).toHaveBeenCalledTimes(1);
        expect(validateJcl).toHaveBeenCalledWith(SAMPLES.clean.code);
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
        expect(validateJcl).toHaveBeenCalledWith('//ABC');
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
            .mockReturnValueOnce(new Promise(resolve => { resolveSlow = resolve; }))
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
