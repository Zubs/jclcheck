// Reference tables distilled from IBM MVS JCL Reference (GC28-1757 family).
// These are intentionally data-driven so the validator/rules stay simple.

// Statement types recognized after the "//" or "//name" field
const STATEMENT_TYPES = new Set([
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
]);

// Valid keyword parameters per statement type (keyword= form)
const JOB_KEYWORDS = new Set([
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
    'SECLABEL'
]);

const EXEC_KEYWORDS = new Set([
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

const DD_KEYWORDS = new Set([
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
    'CHKPT'
]);

const ALL_KNOWN_KEYWORDS = new Set([
    ...JOB_KEYWORDS,
    ...EXEC_KEYWORDS,
    ...DD_KEYWORDS
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
    STATEMENT_TYPES,
    JOB_KEYWORDS,
    EXEC_KEYWORDS,
    DD_KEYWORDS,
    ALL_KNOWN_KEYWORDS,
    DISP_STATUS,
    DISP_NORMAL,
    DISP_ABNORMAL,
    RECFM_CODES,
    DSORG_CODES,
    SPACE_UNITS
};
