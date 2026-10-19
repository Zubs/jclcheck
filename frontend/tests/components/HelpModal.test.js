import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import HelpModal from '../../src/components/HelpModal.vue';
import { CODE_GROUPS, severityOf } from '../../src/diagnosticCodes.js';

// The codes the backend can report: the keys of CATALOG in errors.js.
// (Tests run from the frontend folder.)
const catalogCodes = () => [...readFileSync(resolve('../backend/src/errors.js'), 'utf8')
    .matchAll(/^ {4}(JCL[A-Z][0-9]{3}): \{/gm)].map(m => m[1]).sort();

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

    test('names z/OS 3.2 as the default level and the JES3 limit', () => {
        const text = mount(HelpModal).text();
        expect(text).toContain('The default is z/OS 3.2');
        expect(text).toContain('JES3 can only be chosen at z/OS 2.5');
    });

    test('lists exactly the diagnostic codes the backend can report', () => {
        const listed = CODE_GROUPS.flatMap(g => Object.keys(g.codes)).sort();
        expect(catalogCodes().length).toBeGreaterThan(80);
        expect(listed).toEqual(catalogCodes());
        const text = mount(HelpModal).text();
        for (const code of listed) {
            expect(text).toContain(code);
        }
    });

    test('shows each code with the catalog\'s default severity', () => {
        const catalog = [...readFileSync(resolve('../backend/src/errors.js'), 'utf8')
            .matchAll(/^ {4}(JCL[A-Z][0-9]{3}): \{\n(?: {8}\/\/.*\n)? {8}severity: '(\w+)'/gm)];
        expect(catalog.length).toBe(catalogCodes().length);
        for (const [, code, severity] of catalog) {
            expect(severityOf(code), code).toBe(severity);
        }

        const row = mount(HelpModal).findAll('tr').find(r => r.text().startsWith('JCLK002'));
        expect(row.find('.help-sev').text()).toBe('error');
    });

    test('each group only holds codes with its prefix', () => {
        for (const group of CODE_GROUPS) {
            expect(Object.keys(group.codes).every(c => c.startsWith(group.prefix))).toBe(true);
        }
    });
});
