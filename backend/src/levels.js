// The z/OS releases JCL can be checked against, and how a keyword or
// statement entry's `since`/`until` marks decide whether it exists at one.

// Oldest first; the last entry is the default.
const ZOS_LEVELS = ['2.3', '2.4', '2.5', '3.1', '3.2'];
const DEFAULT_ZOS_LEVEL = ZOS_LEVELS[ZOS_LEVELS.length - 1];

function isZosLevel(value) {
    return typeof value === 'string' && ZOS_LEVELS.includes(value);
}

// Numeric per part, so '3.10' would sort after '3.2'.
function compareLevels(a, b) {
    const [aMajor, aMinor] = a.split('.').map(Number);
    const [bMajor, bMinor] = b.split('.').map(Number);
    return (aMajor - bMajor) || (aMinor - bMinor);
}

/**
 * @returns {null|{ reason: 'since'|'until', at: string }} null when the entry
 * exists at `level`, otherwise why not and the level its mark names.
 */
function availability(entry, level) {
    if (entry && entry.since && compareLevels(level, entry.since) < 0) {
        return { reason: 'since', at: entry.since };
    }

    if (entry && entry.until && compareLevels(level, entry.until) > 0) {
        return { reason: 'until', at: entry.until };
    }

    return null;
}

// A shop runs one JES. IBM removed JES3 in z/OS 3.1; keywords.js marks every
// JES3 statement `until` this level.
const JES_TYPES = ['JES2', 'JES3'];
const DEFAULT_JES = 'JES2';
const JES3_LAST_LEVEL = '2.5';

function isJes(value) {
    return typeof value === 'string' && JES_TYPES.includes(value);
}

function jesAvailable(jes, level) {
    return jes !== 'JES3' || availability({ until: JES3_LAST_LEVEL }, level) === null;
}

module.exports = {
    JES_TYPES,
    DEFAULT_JES,
    JES3_LAST_LEVEL,
    isJes,
    jesAvailable,
    ZOS_LEVELS,
    DEFAULT_ZOS_LEVEL,
    isZosLevel,
    compareLevels,
    availability
};
