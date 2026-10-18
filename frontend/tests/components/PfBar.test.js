import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PfBar from '../../src/components/PfBar.vue';

const KEYS = [
    { key: 'F1', label: 'HELP', event: 'help' },
    { key: 'F5', label: 'VALIDATE', event: 'validate', primary: true },
    { key: 'F9', label: 'SAMPLE', event: 'sample' },
    { key: 'F12', label: 'CLEAR', event: 'clear' }
];

describe('PfBar', () => {
    test('shows each key with its F-key and label', () => {
        const w = mount(PfBar, { props: { keys: KEYS } });
        const buttons = w.findAll('.pfkey');
        expect(buttons).toHaveLength(4);
        expect(buttons.map(b => [b.find('.pfkey__f').text(), b.find('.pfkey__label').text()])).toEqual([
            ['F1', 'HELP'],
            ['F5', 'VALIDATE'],
            ['F9', 'SAMPLE'],
            ['F12', 'CLEAR']
        ]);
        expect(buttons[1].classes()).toContain('is-primary');
    });

    test('emits each key event when its button is clicked', async () => {
        const w = mount(PfBar, { props: { keys: KEYS } });
        for (const button of w.findAll('.pfkey')) {
            await button.trigger('click');
        }

        expect(Object.keys(w.emitted())).toEqual(expect.arrayContaining(['help', 'validate', 'sample', 'clear']));
        for (const event of ['help', 'validate', 'sample', 'clear']) {
            expect(w.emitted(event)).toHaveLength(1);
        }
    });
});
