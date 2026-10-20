// Keyword descriptions (Features.md feature 40).

const test = require('node:test');
const assert = require('node:assert');
const { KEYWORDS, TABLES, keywordHelp } = require('../src/descriptions');
const { DISP_STATUS, DISP_NORMAL, DISP_ABNORMAL } = require('../src/keywords');
const { createApp } = require('../src/index');

test('keyword descriptions', async (t) => {
    await t.test('I: every keyword in the tables has a description, and nothing else does', () => {
        for (const [stmt, table] of Object.entries(TABLES)) {
            for (const keyword of table.keys()) {
                const entry = KEYWORDS[stmt] && KEYWORDS[stmt][keyword];
                assert.ok(entry && entry.text && entry.text.length < 200, `${stmt} ${keyword}`);
            }

            assert.deepEqual(Object.keys(KEYWORDS[stmt] || {}).sort(), [...table.keys()].sort(), stmt);
        }
    });

    await t.test('every allowed value in a keyword\'s value rule is described', () => {
        for (const [stmt, table] of Object.entries(TABLES)) {
            for (const [keyword, entry] of table) {
                const rule = entry.value && (entry.value.type === 'each' ? entry.value.rule : entry.value);
                if (rule && rule.type === 'enum' && !rule.values.every(v => v.startsWith('&'))) {
                    for (const value of rule.values) {
                        assert.ok(KEYWORDS[stmt][keyword].values?.[value], `${stmt} ${keyword}=${value}`);
                    }
                }
            }
        }
    });

    await t.test('O/M: DISP describes every status and disposition by position', () => {
        const [status, normal, abnormal] = KEYWORDS.DD.DISP.positions;
        assert.equal(status.values.SHR, 'Use an existing dataset; other jobs may read it at the same time.');
        assert.deepEqual(Object.keys(status.values).sort(), [...DISP_STATUS].sort());
        assert.deepEqual(Object.keys(normal.values).sort(), [...DISP_NORMAL].sort());
        assert.deepEqual(Object.keys(abnormal.values).sort(), [...DISP_ABNORMAL].sort());
    });

    await t.test('keywordHelp gives each keyword\'s level and a reference link, at the chosen level', () => {
        const help = keywordHelp('2.4');
        assert.equal(help.statements.JOB.EMAIL.since, '2.3');
        assert.equal(help.statements.DD.DISP.since, null);
        assert.equal(help.statements.DD.DISP.reference, 'https://www.ibm.com/docs/en/SSLTBW_2.4.0/com.ibm.zos.v2r4.ieab600/xdddisp.htm');
        assert.equal(keywordHelp('3.2').statements.JOBGROUP.ONERROR.reference, 'https://www.ibm.com/docs/en/SSLTBW_3.2.0/com.ibm.zos.v3r2.ieab600/iea3b6_jobgroup_statement.htm');
        // A keyword without a known page falls back to a search.
        assert.match(decodeURIComponent(help.statements.JCLLIB.ORDER.reference), /^https:\/\/www\.ibm\.com\/docs\/en\/search\/z\/OS 2\.4 JCL JCLLIB/);
    });

    await t.test('GET /api/keywords answers for a level and refuses an unknown one', async (tt) => {
        const app = createApp({ analytics: { enabled: false, record() {}, async flush() {}, stop() {} } });
        const server = await new Promise(resolve => {
            const s = app.listen(0, '127.0.0.1', () => resolve(s));
        });
        tt.after(() => new Promise(resolve => server.close(resolve)));
        const base = `http://127.0.0.1:${server.address().port}/api/keywords`;
        const ok = await (await fetch(`${base}?zos=3.1`)).json();
        assert.equal(ok.zosLevel, '3.1');
        assert.equal(ok.statements.DD.DISP.text, KEYWORDS.DD.DISP.text);
        assert.equal((await (await fetch(base)).json()).zosLevel, '3.2');
        assert.equal((await fetch(`${base}?zos=9.9`)).status, 400);
    });
});
