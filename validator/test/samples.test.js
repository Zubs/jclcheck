// Checks each workbench sample, read straight from the frontend's sample
// list, against test/samples/<key>.expected.json. Same todo rules as the
// fixtures (see test/helpers/fixtureTests.js).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { validate } = require('../src/validator');
const { readExpected } = require('./helpers/fixtures');
const { planFixture } = require('./helpers/fixtureTests');

const SAMPLES_MODULE = path.join(__dirname, '..', '..', 'frontend', 'src', 'samples.js');
const EXPECTED_DIR = path.join(__dirname, 'samples');
const EXPECTED_EXT = '.expected.json';

test('workbench samples', async (t) => {
    let SAMPLES;
    try {
        ({ SAMPLES } = await import(pathToFileURL(SAMPLES_MODULE).href));
    } catch (err) {
        assert.fail(`Could not load the workbench samples from ${SAMPLES_MODULE}: ${err.message}`);
    }

    assert.ok(SAMPLES && typeof SAMPLES === 'object', `${SAMPLES_MODULE} does not export SAMPLES`);

    const expectedKeys = fs.readdirSync(EXPECTED_DIR)
        .filter(f => f.endsWith(EXPECTED_EXT))
        .map(f => f.slice(0, -EXPECTED_EXT.length));

    for (const key of expectedKeys) {
        if (!(key in SAMPLES)) {
            await t.test(key, () => {
                assert.fail(`${path.join(EXPECTED_DIR, key + EXPECTED_EXT)} has no matching sample in ${SAMPLES_MODULE}`);
            });
        }
    }

    for (const [key, sample] of Object.entries(SAMPLES)) {
        const expectedFile = path.join(EXPECTED_DIR, key + EXPECTED_EXT);
        if (!fs.existsSync(expectedFile)) {
            await t.test(key, () => {
                assert.fail(`Sample '${key}' has no expected-result file; create ${expectedFile}`);
            });

            continue;
        }

        const { expected, problem } = readExpected(expectedFile);
        if (problem) {
            await t.test(key, () => assert.fail(problem));
            continue;
        }

        const pair = { name: key, expectedFile, expected };
        const plan = planFixture(pair, validate(sample.code));
        if (plan.kind === 'todo') {
            const { feature, reason } = expected.todo;
            await t.test(key, { todo: `feature ${feature}: ${reason}` }, () => assert.fail(plan.message));
        } else {
            await t.test(key, () => {
                if (plan.kind !== 'pass') {
                    assert.fail(plan.message);
                }
            });
        }
    }
});
