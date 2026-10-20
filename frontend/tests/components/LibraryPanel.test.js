import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LibraryPanel from '../../src/components/LibraryPanel.vue';

const ENTRY = { id: 1, dsn: 'campbel.procs.jcl', member: 'myproc2', source: '//MYPROC2 PROC\n//S EXEC PGM=X\n//S2 EXEC PGM=Y' };

describe('LibraryPanel', () => {
    test('shows a hint when the library is empty, and asks to add a member', async () => {
        const w = mount(LibraryPanel, { props: { entries: [] } });
        expect(w.find('.library-empty').exists()).toBe(true);
        await w.find('.library-add').trigger('click');
        expect(w.emitted('add')).toHaveLength(1);
    });

    test('labels each member as LIB(MEMBER) and shows only its own diagnostics', () => {
        const diagnostics = [
            { code: 'JCLK001', severity: 'warning', line: 2, column: 1, message: 'm', member: 'CAMPBEL.PROCS.JCL(MYPROC2)' },
            { code: 'JCLK001', severity: 'error', line: 3, column: 1, message: 'm', member: 'OTHER' },
            { code: 'JCLK001', severity: 'error', line: 1, column: 1, message: 'm' }
        ];
        const w = mount(LibraryPanel, { props: { entries: [ENTRY], diagnostics } });
        expect(w.find('.editor-topline__label').text()).toBe('CAMPBEL.PROCS.JCL(MYPROC2)');
        const rows = w.findAll('.editor-gutter__row');
        expect(rows.map(r => r.classes().find(c => c.startsWith('is-')) || '')).toEqual(['', 'is-warning', '']);
    });

    test('reports edits and removal', async () => {
        const w = mount(LibraryPanel, { props: { entries: [ENTRY] } });
        await w.find('.library-member').setValue('NEWNAME');
        await w.find('textarea').setValue('//X EXEC PGM=Y');
        await w.find('.library-remove').trigger('click');
        expect(w.emitted('update')).toEqual([[1, 'member', 'NEWNAME'], [1, 'source', '//X EXEC PGM=Y']]);
        expect(w.emitted('remove')).toEqual([[1]]);
    });

    test('opens a member at a line', async () => {
        const w = mount(LibraryPanel, { props: { entries: [ENTRY] }, attachTo: document.body });
        w.vm.openMember('CAMPBEL.PROCS.JCL(MYPROC2)', 2);
        const textarea = w.find('textarea').element;
        expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('//S EXEC PGM=X');
        w.unmount();
    });
});
