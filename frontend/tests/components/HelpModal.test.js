import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HelpModal from '../../src/components/HelpModal.vue';

describe('HelpModal', () => {
    test('emits close from the close button', async () => {
        const w = mount(HelpModal);
        await w.find('.help-close').trigger('click');
        expect(w.emitted('close')).toHaveLength(1);
    });

    test('emits close when the backdrop is clicked', async () => {
        const w = mount(HelpModal);
        await w.find('.help-backdrop').trigger('click');
        expect(w.emitted('close')).toHaveLength(1);
    });

    test('does not close when the dialog itself is clicked', async () => {
        const w = mount(HelpModal);
        await w.find('.help-body').trigger('click');
        expect(w.emitted('close')).toBeUndefined();
    });
});
