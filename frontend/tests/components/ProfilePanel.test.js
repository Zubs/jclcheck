import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProfilePanel from '../../src/components/ProfilePanel.vue';

// The JSON the panel last emitted, parsed.
const last = w => {
    const text = w.emitted('update').at(-1)[0];
    return text ? JSON.parse(text) : null;
};

async function change(input, value) {
    await input.setValue(value);
    await input.trigger('change');
}

describe('ProfilePanel form (feature 41)', () => {
    test('typing a job name pattern writes it to the JSON', async () => {
        const w = mount(ProfilePanel, { props: { modelValue: '' } });
        await change(w.find('.profile-names-job'), 'AR*, GL*');
        expect(last(w)).toEqual({ names: { job: ['AR*', 'GL*'] } });
    });

    test('the form shows the JSON it is given, and keeps other fields when one changes', async () => {
        const modelValue = JSON.stringify({ names: { job: ['AR*'] }, dsnPrefixes: ['AR'], severity: { JCLS014: 'off' } });
        const w = mount(ProfilePanel, { props: { modelValue } });
        expect(w.find('.profile-names-job').element.value).toBe('AR*');
        expect(w.find('.profile-prefixes').element.value).toBe('AR');
        expect(w.find('.profile-severity').element.value).toBe('off');
        await change(w.find('.profile-extra-exec'), 'LOCALKW');
        expect(last(w)).toEqual({ names: { job: ['AR*'] }, dsnPrefixes: ['AR'], severity: { JCLS014: 'off' }, extraKeywords: { EXEC: ['LOCALKW'] } });
    });

    test('allowed values and severities are added and removed row by row', async () => {
        const w = mount(ProfilePanel, { props: { modelValue: '' } });
        await w.find('.profile-new-keyword').setValue('class');
        await w.find('.profile-new-values').setValue('A, B');
        await w.find('.profile-add-allowed').trigger('click');
        expect(last(w)).toEqual({ allowed: { CLASS: ['A', 'B'] } });

        await w.setProps({ modelValue: w.emitted('update').at(-1)[0] });
        await w.find('.profile-new-code').setValue('jcls014');
        await w.find('.profile-new-severity').setValue('info');
        await w.find('.profile-add-severity').trigger('click');
        expect(last(w)).toEqual({ allowed: { CLASS: ['A', 'B'] }, severity: { JCLS014: 'info' } });

        await w.setProps({ modelValue: w.emitted('update').at(-1)[0] });
        await w.findAll('.profile-remove')[0].trigger('click');
        expect(last(w)).toEqual({ severity: { JCLS014: 'info' } });
    });

    test('an unknown code is not added, and emptying every field clears the profile', async () => {
        const w = mount(ProfilePanel, { props: { modelValue: JSON.stringify({ dsnPrefixes: ['AR'] }) } });
        await w.find('.profile-new-code').setValue('JCLZ999');
        await w.find('.profile-add-severity').trigger('click');
        expect(w.emitted('update')).toBeUndefined();
        await change(w.find('.profile-prefixes'), '');
        expect(w.emitted('update').at(-1)[0]).toBe('');
    });

    test('JSON with a mistake is shown in the JSON view, and the form says so', async () => {
        const w = mount(ProfilePanel, { props: { modelValue: '{"names":' } });
        expect(w.find('.profile-form').exists()).toBe(false);
        expect(w.find('.profile-problem').text()).toContain('The JSON view has a mistake');
        await w.find('.profile-view--json').trigger('click');
        expect(w.find('.profile-text').element.value).toBe('{"names":');
        expect(w.find('.profile-problem').text()).toContain('Not valid JSON');
    });
});
