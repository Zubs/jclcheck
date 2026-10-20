const test = require('node:test');
const assert = require('node:assert');
const {
    ZOS_LEVELS,
    DEFAULT_ZOS_LEVEL,
    isZosLevel,
    compareLevels,
    availability
} = require('../src/levels');

test('z/OS levels', async (t) => {
    await t.test('Z: the default is the newest level, 3.2', () => {
        assert.equal(DEFAULT_ZOS_LEVEL, '3.2');
        assert.deepEqual(ZOS_LEVELS, ['2.3', '2.4', '2.5', '3.1', '3.2']);
    });

    await t.test('Z: an entry with no marks is available at every level', () => {
        for (const level of ZOS_LEVELS) {
            assert.equal(availability({}, level), null);
        }
    });

    await t.test('B: since is available at its level and later, not one level earlier', () => {
        assert.equal(availability({ since: '2.4' }, '2.4'), null);
        assert.equal(availability({ since: '2.4' }, '3.2'), null);
        assert.deepEqual(availability({ since: '2.4' }, '2.3'), { reason: 'since', at: '2.4' });
    });

    await t.test('B: until 2.5 is available at 2.5 and reported as removed at 3.1', () => {
        assert.equal(availability({ until: '2.5' }, '2.5'), null);
        assert.deepEqual(availability({ until: '2.5' }, '3.1'), { reason: 'until', at: '2.5' });
    });

    await t.test('O: levels compare numerically per part', () => {
        assert.ok(compareLevels('2.5', '3.1') < 0);
        assert.ok(compareLevels('3.10', '3.2') > 0);
        assert.equal(compareLevels('2.3', '2.3'), 0);
    });

    await t.test('E: only supported level strings are levels', () => {
        assert.equal(isZosLevel('3.1'), true);
        assert.equal(isZosLevel('9.9'), false);
        assert.equal(isZosLevel('abc'), false);
        assert.equal(isZosLevel(3.1), false);
        assert.equal(isZosLevel(undefined), false);
    });
});
