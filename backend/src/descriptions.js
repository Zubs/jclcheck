// Plain-English descriptions of every keyword in the keyword tables, and of
// the values they allow, for the workbench's hover explanations
// (GET /api/keywords). Written for people learning JCL, from the IBM JCL
// Reference. A test checks that no keyword in keywords.js is missing here.

const { JOB_KEYWORDS, EXEC_KEYWORDS, DD_KEYWORDS, JCLLIB_KEYWORDS, NOTIFY_KEYWORDS, GROUP_KEYWORDS } = require('./keywords');
const { availability } = require('./levels');

const DISP_POSITIONS = [
    {
        label: 'Status',
        values: {
            NEW: 'Create the dataset in this step.',
            OLD: 'Use an existing dataset, and keep other jobs out while this one has it.',
            SHR: 'Use an existing dataset; other jobs may read it at the same time.',
            MOD: 'Add to the end of an existing dataset, or create it if it doesn\'t exist.'
        }
    },
    {
        label: 'If the step ends normally',
        values: {
            DELETE: 'delete the dataset.',
            KEEP: 'keep the dataset.',
            PASS: 'pass the dataset on to a later step in the job.',
            CATLG: 'catalog the dataset, so later jobs can find it by name.',
            UNCATLG: 'remove the dataset from the catalog, but keep it.'
        }
    },
    {
        label: 'If the step abends',
        values: {
            DELETE: 'delete the dataset.',
            KEEP: 'keep the dataset.',
            CATLG: 'catalog the dataset.',
            UNCATLG: 'remove the dataset from the catalog, but keep it.'
        }
    }
];

const SPACE_POSITIONS = [
    {
        label: 'Unit',
        values: {
            TRK: 'Space is given in tracks.',
            CYL: 'Space is given in cylinders.'
        },
        other: 'Space is given in blocks of this many bytes.'
    },
    { label: 'Amounts', other: 'The primary amount, then the secondary amount added when it fills up, then the number of directory blocks for a PDS.' },
    { label: 'Release', values: { RLSE: 'Give back unused space when the dataset is closed.' } }
];

const RD_VALUES = {
    R: 'Restart automatically, and allow checkpoints.',
    RNC: 'Restart automatically, without checkpoints.',
    NR: 'No automatic restart, but allow checkpoints.',
    NC: 'No automatic restart and no checkpoints.'
};

const ADDRSPC_VALUES = {
    VIRT: 'Run in virtual storage, which can be paged (the usual choice).',
    REAL: 'Run in real storage, which can\'t be paged.'
};

const FLUSHTYP_VALUES = {
    ALLFLUSH: 'Flush it only when every job it depends on is flushed.',
    ANYFLUSH: 'Flush it when any job it depends on is flushed.'
};

const DEPENDENCY_ACTIONS = {
    SATISFY: 'The dependency is met.',
    FLUSH: 'The dependency is flushed, which may flush the waiting job (see its FLUSHTYP).',
    FAIL: 'The job group is in error, and its ONERROR action is taken.'
};

const KEYWORDS = {
    JOB: {
        CLASS: { text: 'The job class, which decides where and when the job runs.' },
        MSGCLASS: { text: 'The output class for the job log and messages.' },
        MSGLEVEL: {
            text: 'How much of the job\'s JCL and messages go into the job log.',
            positions: [
                { label: 'Statements', values: { 0: 'only the JOB statement.', 1: 'all JCL, including procedure statements.', 2: 'only the JCL you wrote.' } },
                { label: 'Messages', values: { 0: 'allocation messages only if the job abends.', 1: 'all allocation messages.' } }
            ]
        },
        PRTY: { text: 'The job\'s priority within its class, from 0 to 15.' },
        REGION: { text: 'The most memory each step of the job may use.' },
        TIME: { text: 'The most processor time the whole job may use.' },
        TYPRUN: {
            text: 'Runs the job in a special way instead of normally.',
            values: {
                SCAN: 'Check the JCL for errors without running it.',
                HOLD: 'Hold the job until an operator releases it.',
                JCLHOLD: 'Hold the job before its JCL is read, until an operator releases it.',
                COPY: 'Copy the job straight to output without running it.'
            }
        },
        USER: { text: 'The user ID the job runs under.' },
        PASSWORD: { text: 'The password for the USER, or a new one.' },
        NOTIFY: { text: 'The TSO user told when the job ends.' },
        COND: { text: 'Return code tests: if one is true after a step, the remaining steps are skipped.' },
        RESTART: { text: 'The step the job restarts from.' },
        ADDRSPC: { text: 'Whether the job runs in virtual or real storage.', values: ADDRSPC_VALUES },
        PERFORM: { text: 'The performance group for the job (older workload management).' },
        GROUP: { text: 'The RACF group the job runs in.' },
        MEMLIMIT: { text: 'The most 64-bit memory each step may use.' },
        ACCT: { text: 'Accounting information for the job.' },
        BYTES: { text: 'The most output, in thousands of bytes, the job may write.' },
        CARDS: { text: 'The most cards the job may punch.' },
        LINES: { text: 'The most lines, in thousands, the job may print.' },
        PAGES: { text: 'The most pages the job may print.' },
        SYSAFF: { text: 'The JES2 systems the job may run on.' },
        SCHENV: { text: 'The scheduling environment the job needs.' },
        JOBRC: { text: 'Which return code becomes the job\'s return code.' },
        RD: { text: 'Whether the job can be restarted automatically, and use checkpoints.', values: RD_VALUES },
        SECLABEL: { text: 'The security label the job runs with.' },
        EMAIL: { text: 'The email address told when the job ends.' },
        REGIONX: { text: 'The most memory each step may use, given separately below and above the 16 MB line.' }
    },
    EXEC: {
        PGM: { text: 'The program this step runs.' },
        PROC: { text: 'The procedure this step calls.' },
        PARM: { text: 'Text passed to the program when it starts.' },
        COND: { text: 'Return code tests: if one is true, this step is skipped.' },
        REGION: { text: 'The most memory this step may use.' },
        TIME: { text: 'The most processor time this step may use.' },
        ADDRSPC: { text: 'Whether the step runs in virtual or real storage.', values: ADDRSPC_VALUES },
        ACCT: { text: 'Accounting information for this step.' },
        DPRTY: { text: 'The step\'s dispatching priority (older systems).' },
        PERFORM: { text: 'The performance group for this step (older workload management).' },
        RD: { text: 'Whether this step can be restarted automatically, and use checkpoints.', values: RD_VALUES },
        RLS: { text: 'How VSAM record-level sharing reads records in this step.' },
        SYSAFF: { text: 'The JES2 systems this step may run on.' },
        RESTART: { text: 'The step to restart from.' },
        RUNRC: { text: 'Whether this step runs after an earlier step\'s return code.' },
        REGIONX: { text: 'The most memory this step may use, given separately below and above the 16 MB line.' },
        ABDISPCC: { text: 'Completion codes that make this step\'s datasets take their abnormal disposition (the third part of DISP).' }
    },
    DD: {
        DSN: { text: 'The name of the dataset this DD uses.' },
        DSNAME: { text: 'The name of the dataset this DD uses (the long form of DSN).' },
        DISP: { text: 'The dataset\'s status, and what to do with it when the step ends normally or abends.', positions: DISP_POSITIONS },
        SPACE: { text: 'How much disk space a new dataset gets.', positions: SPACE_POSITIONS },
        UNIT: { text: 'The kind of device the dataset is on, such as SYSDA for disk.' },
        VOL: { text: 'The volume (disk or tape) the dataset is on.' },
        VOLUME: { text: 'The volume (disk or tape) the dataset is on (the long form of VOL).' },
        DCB: { text: 'The dataset\'s record format, record length and block size, together.' },
        SYSOUT: { text: 'Send this output to JES, in the class given.' },
        DUMMY: { text: 'No real dataset: reads find end of file, and writes are thrown away.' },
        DATA: { text: 'In-stream data follows, which may include lines starting with //.' },
        SUBSYS: { text: 'The subsystem that handles this dataset.' },
        DDNAME: { text: 'Postpone this DD until a later DD with this name defines it.' },
        AVGREC: {
            text: 'Says SPACE is in records, and the unit for those records.',
            values: { U: 'Records, one at a time.', K: 'Thousands of records.', M: 'Millions of records.' }
        },
        RECFM: { text: 'The record format, such as FB for fixed-length blocked records.' },
        LRECL: { text: 'The record length, in bytes.' },
        BLKSIZE: { text: 'The block size, in bytes (0 lets the system choose).' },
        DSORG: { text: 'How the dataset is organised, such as PS for sequential or PO for a PDS.' },
        LABEL: { text: 'The tape label type and the dataset\'s position on the tape.' },
        RETPD: { text: 'How many days the dataset is kept.' },
        EXPDT: { text: 'The date the dataset expires.' },
        FREE: {
            text: 'When the dataset is given back.',
            values: { END: 'At the end of the step.', CLOSE: 'As soon as the program closes it.' }
        },
        HOLD: { text: 'Whether this output is held until released.' },
        OUTPUT: { text: 'The OUTPUT statement that describes how this output is printed.' },
        COPIES: { text: 'How many copies of this output to print.' },
        DEST: { text: 'Where this output is sent.' },
        FORMS: { text: 'The forms this output is printed on.' },
        KEYLEN: { text: 'The length of each record\'s key, in bytes.' },
        KEYOFF: { text: 'Where the key starts in each VSAM record.' },
        LIKE: { text: 'Copy the attributes of this model dataset.' },
        MGMTCLAS: { text: 'The SMS management class: how the dataset is backed up and kept.' },
        STORCLAS: { text: 'The SMS storage class: where the dataset is stored.' },
        DATACLAS: { text: 'The SMS data class: the dataset\'s default attributes.' },
        REFDD: { text: 'Copy the attributes of the dataset on an earlier DD.' },
        AMP: { text: 'Options for a VSAM dataset.' },
        DCBDSN: { text: 'Copy the DCB attributes of another dataset.' },
        SEGMENT: { text: 'Print this output in segments of this many pages.' },
        SYSIN: { text: 'Treat this as SYSIN data.' },
        MODIFY: { text: 'A copy modification module for a 3800 printer.' },
        ACCODE: { text: 'The access code for an ANSI tape.' },
        PROTECT: { text: 'Protect the dataset or volume with RACF.' },
        QNAME: { text: 'The TCAM queue the messages go to.' },
        CHKPT: { text: 'Take a checkpoint at each end of volume.' },
        DLM: { text: 'The two characters that end the in-stream data, instead of /*.' },
        PATH: { text: 'The z/OS UNIX file this DD uses.' },
        PATHOPTS: {
            text: 'How the z/OS UNIX file is opened.',
            values: {
                ORDONLY: 'Open for reading only.',
                OWRONLY: 'Open for writing only.',
                ORDWR: 'Open for reading and writing.',
                OAPPEND: 'Write at the end of the file.',
                OCREAT: 'Create the file if it doesn\'t exist.',
                OEXCL: 'Fail if the file already exists (with OCREAT).',
                ONOCTTY: 'Don\'t make the file the controlling terminal.',
                ONONBLOCK: 'Don\'t wait when opening or using the file.',
                OSYNC: 'Write each change to disk before going on.',
                OTRUNC: 'Empty the file when it is opened.'
            }
        },
        PATHMODE: {
            text: 'The permissions a new z/OS UNIX file gets.',
            values: {
                SIRUSR: 'The owner may read.',
                SIWUSR: 'The owner may write.',
                SIXUSR: 'The owner may run it.',
                SIRWXU: 'The owner may read, write and run it.',
                SIRGRP: 'The group may read.',
                SIWGRP: 'The group may write.',
                SIXGRP: 'The group may run it.',
                SIRWXG: 'The group may read, write and run it.',
                SIROTH: 'Everyone may read.',
                SIWOTH: 'Everyone may write.',
                SIXOTH: 'Everyone may run it.',
                SIRWXO: 'Everyone may read, write and run it.',
                SISUID: 'Run it with the owner\'s user ID.',
                SISGID: 'Run it with the owner\'s group ID.',
                SISVTX: 'Only the owner may delete files in this directory.'
            }
        },
        PATHDISP: {
            text: 'What happens to the z/OS UNIX file when the step ends normally, then if it abends.',
            values: { KEEP: 'Keep the file.', DELETE: 'Delete the file.' }
        },
        FILEDATA: {
            text: 'What kind of data the z/OS UNIX file holds.',
            values: {
                BINARY: 'Binary data, read and written as is.',
                TEXT: 'Text, in lines ending with a newline.',
                RECORD: 'Records, each with a length prefix.'
            }
        }
    },
    JCLLIB: {
        ORDER: { text: 'The libraries searched, in order, for procedures and INCLUDE members.' }
    },
    NOTIFY: {
        EMAIL: { text: 'The email address told when the job ends.' },
        USER: { text: 'The TSO user told when the job ends.' },
        TYPE: {
            text: 'How the user is told.',
            values: { MSG: 'A TSO message.', EMAIL: 'An email.' }
        },
        WHEN: { text: 'A condition: the user is only told when it is true.' }
    },
    JOBGROUP: {
        OWNER: { text: 'The user ID that owns the job group.' },
        GROUP: { text: 'The RACF group the job group belongs to.' },
        PASSWORD: { text: 'The password for the owner, and optionally a new one.' },
        SECLABEL: { text: 'The security label of the job group.' },
        TYPE: { text: 'Checks the job group without running it.', values: { SCAN: 'Check the group for errors; its jobs won\'t run.' } },
        HOLD: { text: 'Whether the job group is held when it is submitted.', values: { YES: 'Hold the group until it is released.', NO: 'Don\'t hold the group.' } },
        ERROR: { text: 'A condition checked after each job ends; when it is true, the group is in error.' },
        ONERROR: {
            text: 'What happens when the job group is in error.',
            values: {
                STOP: 'Start no new jobs; running jobs finish.',
                SUSPEND: 'Go on starting jobs whose dependencies are met.',
                FLUSH: 'Cancel every job that hasn\'t run, and start no new ones.'
            }
        },
        SYSAFF: { text: 'The JES2 systems the group\'s jobs may run on.' },
        SYSTEM: { text: 'The systems the group\'s jobs may run on.' },
        SCHENV: { text: 'The scheduling environment the group\'s jobs need.' },
        EMAIL: { text: 'The email address told about the job group.' }
    },
    GJOB: {
        FLUSHTYP: { text: 'When this job is flushed because of the jobs it depends on.', values: FLUSHTYP_VALUES }
    },
    JOBSET: {
        FLUSHTYP: { text: 'When a job in the set is flushed because of the jobs it depends on.', values: FLUSHTYP_VALUES }
    },
    SJOB: {},
    AFTER: {
        NAME: { text: 'The job this one runs after.' },
        WHEN: { text: 'The condition on that job for this one to run.' },
        ACTION: { text: 'What happens when the condition is true.', values: DEPENDENCY_ACTIONS },
        OTHERWISE: { text: 'What happens when the condition is false.', values: DEPENDENCY_ACTIONS }
    },
    BEFORE: {
        NAME: { text: 'The job this one runs before.' },
        WHEN: { text: 'The condition on this job for that one to run.' },
        ACTION: { text: 'What happens when the condition is true.', values: DEPENDENCY_ACTIONS },
        OTHERWISE: { text: 'What happens when the condition is false.', values: DEPENDENCY_ACTIONS }
    },
    CONCURRENT: {
        NAME: { text: 'The job this one runs at the same time as.' }
    },
    SCHEDULE: {
        JOBGROUP: { text: 'The job group this job belongs to.' },
        AFTER: { text: 'The job this one runs after.' },
        BEFORE: { text: 'The job this one runs before.' },
        DELAY: { text: 'Whether the job waits for the jobs it depends on.' },
        HOLDUNTL: { text: 'Hold the job until this date and time.' },
        STARTBY: { text: 'The date and time the job should start by.' },
        WITH: { text: 'Run the job on the same system as this other job.' }
    }
};

const TABLES = {
    JOB: JOB_KEYWORDS,
    EXEC: EXEC_KEYWORDS,
    DD: DD_KEYWORDS,
    JCLLIB: JCLLIB_KEYWORDS,
    NOTIFY: NOTIFY_KEYWORDS,
    ...GROUP_KEYWORDS
};

// IBM Docs pages have no address that can be worked out from a keyword, so
// the link searches IBM Docs for the keyword on its statement at this level.
function referenceLink(stmt, keyword, level) {
    return `https://www.ibm.com/docs/en/search/${encodeURIComponent(`z/OS ${level} JCL ${stmt} statement ${keyword} parameter`)}`;
}

/** Every keyword available at `zosLevel`, by statement, with its description. */
function keywordHelp(zosLevel) {
    const statements = {};
    for (const [stmt, table] of Object.entries(TABLES)) {
        const entries = [...table].filter(([, entry]) => !availability(entry, zosLevel));
        if (!entries.length) {
            continue;
        }

        statements[stmt] = Object.fromEntries(entries.map(([keyword, entry]) => [keyword, {
            ...KEYWORDS[stmt][keyword],
            // The level it first appeared in, when that is a supported level.
            since: entry.since || null,
            reference: referenceLink(stmt, keyword, zosLevel)
        }]));
    }

    return { zosLevel, statements };
}

module.exports = { KEYWORDS, TABLES, keywordHelp };
