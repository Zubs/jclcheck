import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classifyLines, renderHtml, diagnosticsAt } from '../src/highlight.js';
import { SAMPLES } from '../src/samples.js';

// The class of each character, one letter per character ('-' for none).
const shape = text => classifyLines(text).map((cls, i) => text.split('\n')[i].split('').map((_, k) => (cls[k] || '-')[0]).join(''));
const classAt = (text, line, col) => classifyLines(text)[line - 1][col - 1];

describe('highlighting', () => {
    test('Z: empty text renders nothing', () => {
        expect(renderHtml('')).toBe('\n');
    });

    test('O: name, operation, keyword and value differ', () => {
        const text = '//STEP1 EXEC PGM=IEFBR14';
        expect([classAt(text, 1, 3), classAt(text, 1, 9), classAt(text, 1, 14), classAt(text, 1, 18)]).toEqual(['name', 'op', 'kw', 'val']);
    });

    test('M: continuations, trailing comments and quoted strings', () => {
        const text = "//DD1 DD DSN=A.B,\n//         DISP=SHR   A NOTE\n//S EXEC PGM=X,PARM='A B'";
        expect(classAt(text, 2, 12)).toBe('kw'); // DISP on the continuation line
        expect(classAt(text, 2, 23)).toBe('cmt');
        expect(classAt(text, 3, 22)).toBe('str');
    });

    test('M: the samples get comments, continuations and in-stream data', () => {
        const clean = SAMPLES.clean.code;
        const lines = clean.split('\n');
        const sortLine = lines.findIndex(l => l.includes('SORT FIELDS')) + 1;
        expect(classAt(clean, sortLine, 3)).toBe('data');
        expect(classAt(clean, 2, 16)).toBe('kw'); // MSGLEVEL on the continued JOB statement
        expect(classAt(SAMPLES.proc.code, 2, 21)).toBe('val'); // &MEM
        expect(classAt('//* NOTE\n//S EXEC PGM=X', 1, 5)).toBe('cmt');
    });

    test('M: DLM= data runs to its delimiter, past /* and // lines', () => {
        const text = '//IN DD *,DLM=@@\n/* NOT THE END\n//X\n@@\n//S EXEC PGM=X';
        expect(shape(text).slice(1, 3)).toEqual(['dddddddddddddd', 'ddd']);
        expect(classAt(text, 5, 5)).toBe('op');
    });

    test('M: DD DATA keeps // lines as data', () => {
        expect(classAt('//IN DD DATA\n//NESTED JOB\n/*', 2, 3)).toBe('data');
    });

    test('O: JES2 statements have their own class', () => {
        expect(classAt('/*ROUTE PRINT NODE1', 1, 3)).toBe('jes');
    });

    test('B: column 72 and columns 73-80 are styled apart from 1-71', () => {
        const text = '//S EXEC PGM=X'.padEnd(71, ' ') + 'X12345678';
        expect([classAt(text, 1, 71), classAt(text, 1, 72), classAt(text, 1, 73), classAt(text, 1, 80)]).toEqual([null, 'cont', 'seq', 'seq']);
    });

    test('E: an unclosed quote colours only to the end of its line', () => {
        const text = "//S EXEC PGM=X,PARM='OPEN\n//T EXEC PGM=Y";
        expect(classAt(text, 1, 25)).toBe('str');
        expect(classAt(text, 2, 5)).toBe('op');
    });

    test('I: a diagnostic underlines exactly its columns, in its severity', () => {
        const html = renderHtml('//A JOB\n//B EXEC PGM=X', [{ line: 2, column: 5, length: 4, severity: 'error' }]);
        expect(html).toContain('<span class="t-op u-error">EXEC</span>');
        expect(diagnosticsAt([{ line: 2, column: 5, length: 4 }], 2, 8)).toHaveLength(1);
        expect(diagnosticsAt([{ line: 2, column: 5, length: 4 }], 2, 9)).toHaveLength(0);
    });

    test('E: text is escaped', () => {
        expect(renderHtml('//S EXEC PGM=<b>')).not.toContain('<b>');
    });

    test('E: 2,000 lines render quickly', () => {
        const big = Array.from({ length: 2000 }, (_, i) => `//DD${i} DD DSN=PROD.FILE${i},DISP=(NEW,CATLG,DELETE),SPACE=(CYL,1)`).join('\n');
        const started = performance.now();
        renderHtml(big, [{ line: 1000, column: 3, length: 5, severity: 'warning' }]);
        expect(performance.now() - started).toBeLessThan(200);
    });
});

describe('syntax colours', () => {
    // Tests run from the frontend folder (jsdom gives import.meta.url an http address).
    const css = readFileSync(resolve('src/style.css'), 'utf8');
    const theme = css.slice(css.indexOf('.workbench-theme {'));
    const token = name => theme.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
    const luminance = hex => {
        const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };

    test('every syntax colour is at least 4.5:1 against the editor background', () => {
        const bg = luminance(token('surface-inset'));
        const names = [...theme.matchAll(/--(syn-[a-z]+):\s*#/g)].map(m => m[1]);
        expect(names.length).toBeGreaterThanOrEqual(10);
        for (const name of names) {
            const fg = luminance(token(name));
            expect((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05), name).toBeGreaterThanOrEqual(4.5);
        }
    });
});
