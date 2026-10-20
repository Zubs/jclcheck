// In-stream data delimiters (Features.md feature 6).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { lex, parseDelimiter } = require('../src/lexer');
const { validate } = require('../src/validator');

const job = body => `//J JOB\n//S EXEC PGM=X\n${body}`;
const diags = source => validate(source).diagnostics.map(d => [d.code, d.line, d.column]);
const dds = source => validate(source).ast.jobs[0].steps[0].dds;

test('in-stream data ends at its delimiter', async (t) => {
    await t.test('Z: DD * followed by /* is empty and clean', () => {
        const source = job('//IN DD *\n/*\n');
        assert.deepEqual(diags(source), []);
        assert.deepEqual(dds(source)[0].instreamData, []);
    });

    await t.test('O: Nick\'s item 15 is clean and keeps both data lines', () => {
        const source = fs.readFileSync(path.join(__dirname, 'fixtures', 'nick', '15-dlm.jcl'), 'utf8');
        assert.deepEqual(diags(source), []);
        assert.deepEqual(dds(source)[0].instreamData, ['LINE ONE', '/* NOT THE END']);
    });

    await t.test('B: the delimiter must start in column 1', () => {
        const source = job('//IN DD *,DLM=@@\n @@\n@@\n');
        assert.deepEqual(diags(source), []);
        assert.deepEqual(dds(source)[0].instreamData, [' @@']);
    });

    await t.test('M: two DDs end at their own delimiters', () => {
        const source = job('//A DD *,DLM=@@\n$$\n@@\n//B DD *,DLM=$$\n@@\n$$\n');
        assert.deepEqual(diags(source), []);
        assert.deepEqual(dds(source).map(d => d.instreamData), [['$$'], ['@@']]);
    });

    await t.test('I: a /* data line under DLM= is not a statement and gets no JCLL001', () => {
        const source = job('//IN DD *,DLM=$$\n/*\n//NOT A STATEMENT\n$$\n');
        assert.deepEqual(lex(source).diagnostics, []);
        assert.equal(lex(source).statements.filter(s => s.type === 'STMT').length, 3);
    });

    await t.test('O: /* followed by a comment ends default data', () => {
        const source = job('//IN DD *\nDATA\n/* END OF DATA\n//OUT DD SYSOUT=*\n');
        assert.deepEqual(diags(source), []);
        assert.deepEqual(dds(source)[0].instreamData, ['DATA']);
    });

    await t.test('O: DD DATA keeps // lines until /*', () => {
        const source = job('//IN DD DATA\n//X JOB\n/*\n');
        assert.deepEqual(diags(source), []);
        assert.deepEqual(dds(source)[0].instreamData, ['//X JOB']);
    });

    await t.test('S: a SORT card containing /* under DLM=$$ is clean', () => {
        const source = job('//SYSOUT DD SYSOUT=*\n//SYSIN DD *,DLM=$$\n  SORT FIELDS=(1,2,CH,A) /* KEY */\n/*\n$$\n');
        assert.deepEqual(diags(source), []);
    });

    await t.test('E: a missing @@ gives one JCLL006 naming it, and nothing on the data', () => {
        const result = validate(job('//IN DD *,DLM=@@\nA\n//B DD X\n'));
        assert.deepEqual(result.diagnostics.map(d => [d.code, d.severity, d.line]), [['JCLL006', 'warning', 3]]);
        assert.match(result.diagnostics[0].message, /'@@'/);
    });

    await t.test('E: DD DATA without /* gives JCLL006; DD * at end of input does not', () => {
        assert.deepEqual(diags(job('//IN DD DATA\nA\n')).map(d => d[0]), ['JCLL006']);
        assert.deepEqual(diags(job('//IN DD *\nA\n')), []);
    });
});

test('DLM= values', async (t) => {
    for (const value of ['@@', '$$', "'%%'"]) {
        await t.test(`B: DLM=${value} is accepted`, () => {
            assert.ok(parseDelimiter(value));
            assert.deepEqual(diags(job(`//IN DD *,DLM=${value}\nA\n${parseDelimiter(value)}\n`)), []);
        });
    }

    for (const value of ['@', '@@@', '']) {
        await t.test(`B: DLM=${value} gets JCLS011 at the value`, () => {
            const found = diags(job(`//IN DD *,DLM=${value}\nA\n/*\n`)).filter(d => d[0] === 'JCLS011');
            assert.deepEqual(found, [['JCLS011', 3, 15]]);
        });
    }

    await t.test('O: a quoted delimiter can hold a quote', () => {
        assert.equal(parseDelimiter("'''X'"), "'X");
        assert.equal(parseDelimiter("'''XY'"), null);
    });

    await t.test('E: DLM= on a DD with no in-stream data gets JCLK006 at the keyword', () => {
        assert.deepEqual(diags(job('//IN DD DSN=A.B,DISP=SHR,DLM=@@\n')), [['JCLK006', 3, 26]]);
    });
});
