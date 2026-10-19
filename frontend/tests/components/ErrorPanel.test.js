import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ErrorPanel from '../../src/components/ErrorPanel.vue';

const STATS = { errors: 1, warnings: 2, statementCount: 5, stepCount: 2, procCount: 0 };
const WARNING = {
    code: 'JCLK001',
    severity: 'warning',
    line: 4,
    column: 26,
    message: "'REGON' is not a recognized keyword for a EXEC statement.",
    suggestion: "Did you mean 'REGION'?"
};

describe('ErrorPanel', () => {
    test('shows the error and warning counts', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [WARNING], stats: STATS } });
        expect(w.find('.stat.is-error').text()).toBe('1 ERR');
        expect(w.find('.stat.is-warning').text()).toBe('2 WARN');
    });

    test('shows VALIDATING… while loading', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [WARNING], stats: STATS, loading: true } });
        expect(w.find('.panel-status').text()).toBe('VALIDATING…');
        expect(w.find('.diag-list').exists()).toBe(false);
    });

    test('shows the empty state with statement and step counts', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [], stats: STATS } });
        expect(w.find('.panel-empty').text()).toContain('NO PROBLEMS FOUND');
        expect(w.find('.panel-empty').text()).toContain('5 statements · 2 steps checked clean.');
    });

    test('includes the procedure count in the empty state when there are procs', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [], stats: { ...STATS, procCount: 1 } } });
        expect(w.find('.panel-empty').text()).toContain('5 statements · 2 steps · 1 procs checked clean.');
    });

    test('shows severity, location, code, message and fix for a diagnostic', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [WARNING], stats: STATS } });
        const entry = w.find('.diag');
        expect(entry.classes()).toContain('is-warning');
        expect(entry.find('.diag-sev').text()).toBe('WARN');
        expect(entry.find('.diag-loc').text()).toBe('L4:26');
        expect(entry.find('.diag-code').text()).toBe('JCLK001');
        expect(entry.find('.diag-msg').text()).toBe(WARNING.message);
        expect(entry.find('.diag-fix').text()).toBe(`FIX › ${WARNING.suggestion}`);
    });

    test('labels errors ERR and info INFO', () => {
        const w = mount(ErrorPanel, {
            props: {
                diagnostics: [
                    { ...WARNING, severity: 'error' },
                    { ...WARNING, severity: 'info', line: 5 }
                ],
                stats: STATS
            }
        });
        expect(w.findAll('.diag-sev').map(s => s.text())).toEqual(['ERR', 'INFO']);
    });

    test('has no fix line when there is no suggestion', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [{ ...WARNING, suggestion: null }], stats: STATS } });
        expect(w.find('.diag-fix').exists()).toBe(false);
    });

    test('emits select with the diagnostic when an entry is clicked', async () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [WARNING], stats: STATS } });
        await w.find('.diag').trigger('click');
        expect(w.emitted('select')).toEqual([[WARNING]]);
    });

    test('shows the member name before the location of a diagnostic in a library member', () => {
        const w = mount(ErrorPanel, { props: { diagnostics: [{ ...WARNING, line: 3, column: 5, member: 'CAMPBEL.PROCS.JCL(MYPROC2)' }], stats: STATS } });
        expect(w.find('.diag-loc').text()).toBe('MYPROC2 L3:5');
    });
});
