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

    test.fails('shows the cursor column (feature 24)', async () => {
        const w = mountEditor({}, { attachTo: document.body });
        const textarea = w.find('textarea');
        textarea.element.setSelectionRange(15, 15);
        await textarea.trigger('keyup');
        await textarea.trigger('click');
        expect(w.find('.editor-topline__meta').text()).toContain('COL 16');
    });
});
