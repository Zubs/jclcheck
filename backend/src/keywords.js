// Reference tables distilled from IBM MVS JCL Reference (GC28-1757 family).
// These are intentionally data-driven so the validator/rules stay simple.
//
// Statement types and keywords are tables (Map of name -> entry). An entry
// can carry `since` and `until` z/OS levels (see levels.js); one without
// either exists at every supported level.

// Builds a table from a list of names, with level marks for some of them.
function table(names, marks = {}) {
    return new Map(names.map(name => [name, marks[name] || {}]));
}

// Statement types recognized after the "//" or "//name" field
const STATEMENT_TYPES = table([
    'JOB',
    'EXEC',
    'DD',
    'PROC',
    'PEND',
    'SET',
    'IF',
    'THEN',
    'ELSE',
    'ENDIF',
    'INCLUDE',
    'OUTPUT',
    'JCLLIB',
    'XMIT',
    'NOTIFY'
], {
    // z/OS 2.3 MVS JCL Reference, "Summary of changes": new NOTIFY statement.
    NOTIFY: { since: '2.3' }
});

// Valid keyword parameters per statement type (keyword= form)
const JOB_KEYWORDS = table([
    'CLASS',
    'MSGCLASS',
    'MSGLEVEL',
    'PRTY',
    'REGION',
    'TIME',
    'TYPRUN',
    'USER',
    'PASSWORD',
    'NOTIFY',
    'COND',
    'RESTART',
    'ADDRSPC',
    'PERFORM',
    'GROUP',
    'MEMLIMIT',
    'ACCT',
    'BYTES',
    'CARDS',
    'LINES',
    'PAGES',
    'SYSAFF',
    'SCHENV',
    'JOBRC',
    'RD',
    'SECLABEL',
    'EMAIL'
], {
    // z/OS 2.3 MVS JCL Reference, "Summary of changes": EMAIL on the JOB statement.
    EMAIL: { since: '2.3' }
});

const EXEC_KEYWORDS = table([
    'PGM',
    'PROC',
    'PARM',
    'COND',
    'REGION',
    'TIME',
    'ADDRSPC',
    'ACCT',
    'DPRTY',
    'PERFORM',
    'RD',
    'RLS',
    'SYSAFF',
    'RESTART',
    'RUNRC'
]);

const DD_KEYWORDS = table([
    'DSN',
    'DSNAME',
    'DISP',
    'SPACE',
    'UNIT',
    'VOL',
    'VOLUME',
    'DCB',
    'SYSOUT',
    'DUMMY',
    'DATA',
    'SUBSYS',
    'DDNAME',
    'AVGREC',
    'RECFM',
    'LRECL',
    'BLKSIZE',
    'DSORG',
    'LABEL',
    'RETPD',
    'EXPDT',
    'FREE',
    'HOLD',
    'OUTPUT',
    'COPIES',
    'DEST',
    'FORMS',
    'KEYLEN',
    'KEYOFF',
    'LIKE',
    'MGMTCLAS',
    'STORCLAS',
    'DATACLAS',
    'REFDD',
    'AMP',
    'DCBDSN',
    'SEGMENT',
    'SYSIN',
    'MODIFY',
    'ACCODE',
    'PROTECT',
    'QNAME',
    'CHKPT',
    'DLM'
]);

// JES2 control statements ("/*NAME ..."), from the z/OS JES2 JCL statement
// descriptions in the MVS JCL Reference. `place` says where each goes:
// 'before' the JOB statement, 'anywhere', or (by default) after it.
const JES2_STATEMENTS = table([
    'JOBPARM',
    'MESSAGE',
    'NETACCT',
    'NOTIFY',
    'OUTPUT',
    'PRIORITY',
    'ROUTE',
    'SETUP',
    'SIGNOFF',
    'SIGNON',
    'XEQ',
    'XMIT'
], {
    PRIORITY: { place: 'before' },
    SIGNOFF: { place: 'anywhere' },
    SIGNON: { place: 'anywhere' }
});

const ALL_KNOWN_KEYWORDS = new Set([
    ...JOB_KEYWORDS.keys(),
    ...EXEC_KEYWORDS.keys(),
    ...DD_KEYWORDS.keys()
]);

// Required parameter logic is expressed as functions in rules/paramRules.js,
// since "required" is conditional (e.g. EXEC needs PGM *or* PROC, not both).

const DISP_STATUS = new Set([
    'NEW',
    'OLD',
    'SHR',
    'MOD'
]);
const DISP_NORMAL = new Set([
    'DELETE',
    'KEEP',
    'CATLG',
    'UNCATLG',
    'PASS'
]);
const DISP_ABNORMAL = new Set([
    'DELETE',
    'KEEP',
    'CATLG',
    'UNCATLG'
]);
const RECFM_CODES = new Set(['F',
    'FB',
    'V',
    'VB',
    'U',
    'FBA',
    'VBA',
    'FBM',
    'VBM',
    'FBS',
    'VBS',
    'D',
    'DB'
]);
const DSORG_CODES = new Set([
    'PS',
    'PO',
    'DA',
    'PSU',
    'POU',
    'DAU',
    'VS'
]);
const SPACE_UNITS = new Set(['TRK', 'CYL']); // or an integer block size

module.exports = {
    table,
    STATEMENT_TYPES,
    JOB_KEYWORDS,
    EXEC_KEYWORDS,
    DD_KEYWORDS,
    JES2_STATEMENTS,
    ALL_KNOWN_KEYWORDS,
    DISP_STATUS,
    DISP_NORMAL,
    DISP_ABNORMAL,
    RECFM_CODES,
    DSORG_CODES,
    SPACE_UNITS
};
