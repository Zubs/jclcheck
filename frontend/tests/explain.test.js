import { describe, test, expect } from 'vitest';
import { explainAt } from '../src/explain.js';

const KEYWORDS = {
    zosLevel: '3.2',
    statements: {
        JOB: { EMAIL: { text: 'The email address told when the job ends.', since: '2.3', reference: 'https://www.ibm.com/docs/en/search/EMAIL' } },
        DD: {
            DSN: { text: 'The name of the dataset this DD uses.', since: null },
            DISP: {
                text: 'The dataset\'s status, and what to do with it.',
                since: null,
                positions: [
                    { label: 'Status', values: { NEW: 'Create the dataset in this step.', SHR: 'Use an existing dataset; other jobs may read it at the same time.' } },
                    { label: 'If the step ends normally', values: { CATLG: 'catalog the dataset, so later jobs can find it by name.' } },
                    { label: 'If the step abends', values: { DELETE: 'delete the dataset.' } }
                ]
            },
            DUMMY: { text: 'No real dataset.', since: null }
        }
    }
};

const SOURCE = [
    '//J JOB EMAIL=\'A@B.C\'',
    '//* DISP=SHR in a comment',
    '//D DD DSN=A.B,DISP=SHR',
    '//E DD DISP=(NEW,CATLG,DELETE),FOO=1',
    '//F DD DUMMY'
].join('\n');
const at = (line, column) => explainAt(SOURCE, line, column, KEYWORDS);

describe('explainAt (feature 40)', () => {
    test('Z: blank space and comments explain nothing', () => {
        expect(at(3, 7)).toBeNull();
        expect(at(2, 6)).toBeNull();
        expect(at(9, 1)).toBeNull();
    });

    test('O: DISP and its value SHR', () => {
        expect(at(3, 16)).toMatchObject({ stmt: 'DD', keyword: 'DISP', text: KEYWORDS.statements.DD.DISP.text });
        expect(at(3, 21).parts).toEqual([{ label: 'Status', value: 'SHR', text: 'Use an existing dataset; other jobs may read it at the same time.' }]);
    });

    test('M: (NEW,CATLG,DELETE) explains all three parts in order', () => {
        for (const column of [14, 18, 24]) {
            expect(at(4, column).parts.map(p => p.value)).toEqual(['NEW', 'CATLG', 'DELETE']);
        }

        expect(at(4, 18).parts.map(p => p.label)).toEqual(['Status', 'If the step ends normally', 'If the step abends']);
    });

    test('B: the first and last characters of a keyword, but not the blank after it', () => {
        expect(at(3, 8).keyword).toBe('DSN');
        expect(at(3, 10).keyword).toBe('DSN');
        expect(at(5, 4)).toBeNull();
        expect(at(5, 13)).toBeNull();
    });

    test('I: the level a keyword appeared in and its reference', () => {
        expect(at(1, 10)).toMatchObject({ keyword: 'EMAIL', since: '2.3', reference: 'https://www.ibm.com/docs/en/search/EMAIL' });
    });

    test('E: an unknown keyword is marked unknown', () => {
        expect(at(4, 33)).toEqual({ stmt: 'DD', keyword: 'FOO', unknown: true, parts: [] });
    });

    test('a positional value such as DUMMY is described', () => {
        expect(at(5, 10)).toMatchObject({ keyword: 'DUMMY', text: 'No real dataset.' });
    });

    test('E: without descriptions nothing is explained', () => {
        expect(explainAt(SOURCE, 3, 16, null)).toBeNull();
    });
});
