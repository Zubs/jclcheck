import { describe, test, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Editor from '../../src/components/Editor.vue';

const JCL = '//J1 JOB\n//S1 EXEC PGM=X\n//DD1 DD DUMMY';

let wrapper;

function mountEditor(props = {}, options = {}) {
    wrapper = mount(Editor, {
        props: { modelValue: JCL, diagnostics: [], ...props },
        ...options
    });
    return wrapper;
}

afterEach(() => {
    wrapper?.unmount();
});

describe('Editor', () => {
    test('shows one gutter row per line', () => {
        const w = mountEditor();
        expect(w.findAll('.editor-gutter__row')).toHaveLength(3);
        expect(w.find('.editor-topline__meta').text()).toContain('3 LINES');
    });

    test('shows one gutter row for empty text', () => {
        const w = mountEditor({ modelValue: '' });
        expect(w.findAll('.editor-gutter__row')).toHaveLength(1);
    });

    test('marks a line with its highest severity and lists all its messages', () => {
        const w = mountEditor({
            diagnostics: [
                { line: 2, severity: 'warning', code: 'JCLK001', message: 'Unknown keyword.' },
                { line: 2, severity: 'error', code: 'JCLD002', message: 'Missing data source.' }
            ]
        });
        const row = w.findAll('.editor-gutter__row')[1];
        expect(row.classes()).toContain('is-error');
        expect(row.find('.editor-gutter__dot').exists()).toBe(true);
        expect(row.attributes('title')).toBe('JCLK001: Unknown keyword.\nJCLD002: Missing data source.');
    });

    test('leaves lines without diagnostics unmarked', () => {
        const w = mountEditor();
        const row = w.findAll('.editor-gutter__row')[0];
        expect(row.classes()).not.toContain('is-error');
        expect(row.find('.editor-gutter__dot').exists()).toBe(false);
    });

    test('reports typed text to its parent', async () => {
        const w = mountEditor();
        await w.find('textarea').setValue('//NEW JOB');
        expect(w.emitted('update:modelValue').at(-1)).toEqual(['//NEW JOB']);
    });

    test('inserts two spaces at the cursor when Tab is pressed, keeping focus', () => {
        const w = mountEditor({ modelValue: '//X' }, { attachTo: document.body });
        const textarea = w.find('textarea').element;
        textarea.focus();
        textarea.setSelectionRange(2, 2);
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        textarea.dispatchEvent(event);

        expect(w.emitted('update:modelValue').at(-1)).toEqual(['//  X']);
        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(textarea);
    });

    test('selects a line when asked to go to it', () => {
        const w = mountEditor({}, { attachTo: document.body });
        w.vm.scrollToLine(2);
        const textarea = w.find('textarea').element;
        expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('//S1 EXEC PGM=X');
        expect(document.activeElement).toBe(textarea);
    });

    test('reports only the number of pasted lines', () => {
        const w = mountEditor();
        const paste = text => {
            const event = new Event('paste', { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
            w.find('textarea').element.dispatchEvent(event);
        };

        paste('//A\n//B\n//C\n');
        paste('//ONE');
        paste('//X\r\n//Y');
        paste('');
        expect(w.emitted('paste')).toEqual([[3], [1], [2]]);
    });

    // Was an expected failure until feature 24. Offset 24 is the end of
    // "//S1 EXEC PGM=X" on line 2, which is column 16.
    test('shows the cursor column (feature 24)', async () => {
        const w = mountEditor({}, { attachTo: document.body });
        const textarea = w.find('textarea');
        textarea.element.setSelectionRange(24, 24);
        await textarea.trigger('keyup');
        await textarea.trigger('click');
        expect(w.find('.editor-topline__meta').text()).toContain('LN 2 · COL 16');
    });
});

describe('Editor cursor position', () => {
    const meta = w => w.find('.editor-cursor').text().replace(/\s+/g, ' ');

    async function placeCursor(w, start, end = start, event = 'keyup') {
        const textarea = w.find('textarea');
        textarea.element.setSelectionRange(start, end);
        await textarea.trigger(event);
    }

    test('Z: an empty editor shows LN 1 · COL 1 · 1 LINES', () => {
        const w = mountEditor({ modelValue: '' });
        expect(meta(w)).toBe('LN 1 · COL 1 · 1 LINES');
    });

    test('O: just after // on line 1 is column 3', async () => {
        const w = mountEditor({}, { attachTo: document.body });
        await placeCursor(w, 2, 2, 'click');
        expect(meta(w)).toContain('LN 1 · COL 3');
    });

    test('M: key moves, clicks and selection all update the position', async () => {
        const w = mountEditor({}, { attachTo: document.body });
        await placeCursor(w, 0, 0, 'keyup');
        expect(meta(w)).toContain('LN 1 · COL 1');
        await placeCursor(w, 8, 8, 'click');
        expect(meta(w)).toContain('LN 1 · COL 9');
        await placeCursor(w, 25, 25, 'select');
        expect(meta(w)).toContain('LN 3 · COL 1');
    });

    test('B: the end of an 80-character line is column 81, before its last character 80', async () => {
        const w = mountEditor({ modelValue: 'X'.repeat(80) }, { attachTo: document.body });
        await placeCursor(w, 80);
        expect(meta(w)).toContain('COL 81');
        await placeCursor(w, 79);
        expect(meta(w)).toContain('COL 80');
    });

    test('B: column 72 is highlighted and column 71 is not', async () => {
        const w = mountEditor({ modelValue: 'X'.repeat(80) }, { attachTo: document.body });
        await placeCursor(w, 70);
        expect(w.find('.editor-cursor__col').classes()).not.toContain('is-past-71');
        await placeCursor(w, 71);
        expect(w.find('.editor-cursor__col').classes()).toContain('is-past-71');
    });

    test('I: selecting 24 characters shows SEL 24, and clearing it hides it', async () => {
        const w = mountEditor({ modelValue: 'X'.repeat(40) }, { attachTo: document.body });
        await placeCursor(w, 2, 26, 'select');
        expect(meta(w)).toContain('SEL 24');
        await placeCursor(w, 5, 5, 'click');
        expect(meta(w)).not.toContain('SEL');
    });

    test('E: Windows line endings still give the right line and column', async () => {
        const w = mountEditor({ modelValue: '//A JOB\r\n//B EXEC PGM=X' }, { attachTo: document.body });
        const textarea = w.find('textarea').element;
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        await w.find('textarea').trigger('keyup');
        expect(meta(w)).toContain('LN 2 · COL 15');
    });

    test('I: the position is read out only when asked for', async () => {
        const w = mountEditor({}, { attachTo: document.body });
        await placeCursor(w, 2, 2, 'click');
        const live = w.find('[aria-live="polite"]');
        expect(live.text()).toBe('');
        await w.find('.editor-cursor').trigger('click');
        expect(live.text()).toBe('Line 1, column 3');
    });
});
