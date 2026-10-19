// Reference tables distilled from IBM MVS JCL Reference (GC28-1757 family).
// These are intentionally data-driven so the validator/rules stay simple.
//
// Statement types and keywords are tables (Map of name -> entry). An entry
// can carry `since` and `until` z/OS levels (see levels.js); one without
// either exists at every supported level.

const { JES3_LAST_LEVEL } = require('./levels');
const { oneOfValues, integer, char, name, list, oneOf, email, each, path, described } = require('./valueRules');

// Value rules shared by several statements (see valueRules.js).
const CLASS_CHAR = char(/^[A-Za-z0-9]$/, 'one character A-Z or 0-9');
const ADDRSPC_VALUES = oneOfValues('VIRT', 'REAL');
const RD_VALUES = oneOfValues('R', 'RNC', 'NR', 'NC');

// A TSO user ID: 1-8 characters, a letter or $#@ first (lower case is read as
// upper case). node.userid is accepted until feature 41 confirms it.
const USER_ID = /^[A-Za-z$#@][A-Za-z0-9$#@]{0,7}$/;
const NODE_USER_ID = /^[A-Za-z$#@][A-Za-z0-9$#@]{0,7}\.[A-Za-z$#@][A-Za-z0-9$#@]{0,7}$/;
const EMAIL_ADDRESS = email(246);

const NOTIFY_USER = described(
    oneOf(oneOfValues('&SYSUID'), name(USER_ID), name(NODE_USER_ID)),
    '&SYSUID or a TSO user ID of 1-8 letters, digits or $#@ that starts with a letter or $#@ (or node.userid)'
);

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
    EMAIL: { since: '2.3', value: EMAIL_ADDRESS },
    CLASS: { value: CLASS_CHAR },
    MSGCLASS: { value: CLASS_CHAR },
    TYPRUN: { value: oneOfValues('SCAN', 'HOLD', 'JCLHOLD', 'COPY') },
    PRTY: { value: integer(0, 15) },
    ADDRSPC: { value: ADDRSPC_VALUES },
    RD: { value: RD_VALUES },
    // Only &SYSUID on its own is valid, so values with & are checked too.
    NOTIFY: { value: NOTIFY_USER, checkSymbols: true },
    // MSGLEVEL=(statements,messages); either may be left out, not both.
    MSGLEVEL: {
        value: list([
            { label: 'statements', rule: integer(0, 2) },
            { label: 'messages', rule: integer(0, 1) }
        ], { atLeastOne: true })
    }
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
], {
    ADDRSPC: { value: ADDRSPC_VALUES },
    RD: { value: RD_VALUES }
});

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
    'DLM',
    'PATH',
    'PATHOPTS',
    'PATHMODE',
    'PATHDISP',
    'FILEDATA'
], {
    // z/OS UNIX files.
    PATH: { value: path(255) },
    PATHOPTS: {
        value: each(oneOfValues('ORDONLY', 'OWRONLY', 'ORDWR', 'OAPPEND', 'OCREAT', 'OEXCL', 'ONOCTTY',
            'ONONBLOCK', 'OSYNC', 'OTRUNC'))
    },
    PATHMODE: {
        value: each(oneOfValues('SIRUSR', 'SIWUSR', 'SIXUSR', 'SIRWXU', 'SIRGRP', 'SIWGRP', 'SIXGRP', 'SIRWXG',
            'SIROTH', 'SIWOTH', 'SIXOTH', 'SIRWXO', 'SISUID', 'SISGID', 'SISVTX'))
    },
    PATHDISP: { value: each(oneOfValues('KEEP', 'DELETE'), 2) },
    FILEDATA: { value: oneOfValues('BINARY', 'TEXT', 'RECORD') },
    FREE: { value: oneOfValues('END', 'CLOSE') },
    AVGREC: { value: oneOfValues('U', 'K', 'M') },
    RETPD: { value: integer(0, 93000) }
});

// How many positional parameters each statement takes: JOB has accounting
// information and the programmer's name, EXEC a procedure name, and DD one of
// *, DATA, DUMMY or DYNAM.
const POSITIONAL_LIMITS = { JOB: 2, EXEC: 1, DD: 1 };

// EXEC keywords that can name one step of a called procedure (COND.S1=).
const QUALIFIABLE_KEYWORDS = new Set(['COND', 'REGION', 'TIME', 'PARM', 'ACCT', 'ADDRSPC', 'DPRTY', 'PERFORM', 'RD']);

const JCLLIB_KEYWORDS = table(['ORDER']);

// The NOTIFY statement (z/OS 2.3). WHEN is a condition, checked separately.
const NOTIFY_KEYWORDS = table(['EMAIL', 'USER', 'TYPE', 'WHEN'], {
    EMAIL: { value: EMAIL_ADDRESS },
    USER: { value: NOTIFY_USER, checkSymbols: true },
    TYPE: { value: oneOfValues('MSG', 'EMAIL') }
});

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

// JES3 control statements ("//*NAME ..."), from the z/OS 2.5 JES3 statement
// descriptions in the MVS JCL Reference. IBM removed JES3 in z/OS 3.1, so
// every entry is `until: '2.5'`. `place` is 'before' the JOB statement,
// 'beforeExec' (after JOB, before the first EXEC) or 'afterJob' (default).
// `keywords` lists the keyword parameters of statements that take them.
const JES3_UNTIL = JES3_LAST_LEVEL;
const JES3_STATEMENTS = table([
    'DATASET',
    'ENDDATASET',
    'ENDPROCESS',
    'FORMAT',
    'MAIN',
    'NET',
    'NETACCT',
    'OPERATOR',
    'PAUSE',
    'PROCESS',
    'ROUTE'
], {
    DATASET: { until: JES3_UNTIL, keywords: table(['DDNAME', 'MODE', 'J', 'C']) },
    ENDDATASET: { until: JES3_UNTIL },
    ENDPROCESS: { until: JES3_UNTIL, place: 'beforeExec' },
    FORMAT: {
        until: JES3_UNTIL,
        keywords: table(['DDNAME', 'CARRIAGE', 'CHARS', 'CHNSIZE', 'COMPACT', 'CONTROL', 'COPIES', 'COPYMOD',
            'DEST', 'EXTWTR', 'FCB', 'FLASH', 'FORMS', 'MODIFY', 'OVFL', 'PRTY', 'STACKER', 'THRESHLD', 'TRAIN'])
    },
    MAIN: {
        until: JES3_UNTIL,
        place: 'beforeExec',
        keywords: table(['ACMAIN', 'BYTES', 'CARDS', 'CLASS', 'DEADLINE', 'EXPDTCHK', 'FAILURE', 'FETCH', 'HOLD',
            'IORATE', 'JOURNAL', 'LINES', 'LREGION', 'MSS', 'ORG', 'PAGES', 'PROC', 'RINGCHK', 'SETUP', 'SPART',
            'SYSTEM', 'THWSSEP', 'TRKGRPS', 'TYPE', 'UPDATE', 'USER'], {
            HOLD: { value: oneOfValues('YES', 'NO') },
            FAILURE: { value: oneOfValues('RESTART', 'CANCEL', 'HOLD', 'PRINT') }
        })
    },
    NET: {
        until: JES3_UNTIL,
        place: 'beforeExec',
        keywords: table(['NETID', 'NHOLD', 'RELEASE', 'NORMAL', 'ABNORMAL', 'OPHOLD', 'DEVPOOL', 'DEVRELSE', 'RELSCHCT'])
    },
    NETACCT: {
        until: JES3_UNTIL,
        place: 'beforeExec',
        keywords: table(['PNAME', 'ACCT', 'BLDG', 'DEPT', 'ROOM', 'USERID'])
    },
    OPERATOR: { until: JES3_UNTIL },
    PAUSE: { until: JES3_UNTIL, place: 'before' },
    PROCESS: { until: JES3_UNTIL, place: 'beforeExec' },
    ROUTE: { until: JES3_UNTIL }
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
    JCLLIB_KEYWORDS,
    NOTIFY_KEYWORDS,
    POSITIONAL_LIMITS,
    QUALIFIABLE_KEYWORDS,
    NOTIFY_USER,
    JES2_STATEMENTS,
    JES3_STATEMENTS,
    ALL_KNOWN_KEYWORDS,
    DISP_STATUS,
    DISP_NORMAL,
    DISP_ABNORMAL,
    RECFM_CODES,
    DSORG_CODES,
    SPACE_UNITS
};
