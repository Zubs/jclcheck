// Every diagnostic code the validator can report, with a one-line description
// for the Help dialog. A test keeps this list identical to the CATALOG in
// backend/src/errors.js, so a new code can't ship without being explained,
// and keeps each code's default severity the same as the catalog's.

const WARNINGS = new Set([
    'JCLD001', 'JCLD007',
    'JCLF002', 'JCLF003', 'JCLF004',
    'JCLJ001', 'JCLJ002', 'JCLJ003', 'JCLJ301', 'JCLJ302', 'JCLJ303', 'JCLJ304', 'JCLJ305',
    'JCLK001', 'JCLK005', 'JCLK006', 'JCLK008',
    'JCLL006',
    'JCLR001', 'JCLR003', 'JCLR005',
    'JCLS002', 'JCLS003', 'JCLS004', 'JCLS005', 'JCLS009', 'JCLS010', 'JCLS011', 'JCLS012', 'JCLS013'
]);
const INFO = new Set(['JCLD004', 'JCLJ306', 'JCLS014']);

/** A code's default severity: error, warning or info. */
export function severityOf(code) {
    return INFO.has(code) ? 'info' : WARNINGS.has(code) ? 'warning' : 'error';
}

export const CODE_GROUPS = [
    {
        prefix: 'JCLL',
        name: 'Reading lines',
        codes: {
            JCLL001: "A line that isn't data doesn't start with //.",
            JCLL002: 'A line is longer than the 80-column record.',
            JCLL003: 'A quoted string is never closed.',
            JCLL004: 'Column 72 is marked, but the next line doesn\'t continue the comment.',
            JCLL005: 'A continued quoted string doesn\'t resume in column 16.',
            JCLL006: 'In-stream data runs to the end without its delimiter.'
        }
    },
    {
        prefix: 'JCLP',
        name: 'Statement structure',
        codes: {
            JCLP001: 'No statement type after the name field.',
            JCLP002: 'An unknown or unexpected operation.',
            JCLP003: 'Unbalanced parentheses.',
            JCLP004: "A line looks like a continuation, but the previous one didn't continue.",
            JCLP005: 'IF without ENDIF.',
            JCLP006: 'ENDIF without IF.',
            JCLP007: 'ELSE without IF.',
            JCLP008: 'PEND without PROC.',
            JCLP009: 'PROC without PEND.'
        }
    },
    {
        prefix: 'JCLO',
        name: 'Statement order',
        codes: {
            JCLO001: 'No JOB statement.',
            JCLO002: 'EXEC before the JOB statement.',
            JCLO003: 'DD before any EXEC.',
            JCLO005: 'JCLLIB not between the JOB statement and the first EXEC.',
            JCLO006: 'More than one JCLLIB in a job.',
            JCLO007: 'A statement after the end of the job (//).',
            JCLO008: 'JCLLIB inside a procedure.',
            JCLO009: 'NOTIFY not between the JOB statement and the first EXEC.',
            JCLO010: 'Too many NOTIFY statements in a job.'
        }
    },
    {
        prefix: 'JCLD',
        name: 'DD statements',
        codes: {
            JCLD001: 'The same DD name twice in a step (a warning: both are allocated).',
            JCLD002: 'A DD with no data source.',
            JCLD003: 'A DD with two data sources that can\'t go together.',
            JCLD004: 'In-stream JCL sent to the internal reader isn\'t checked here (information).',
            JCLD005: 'PATHOPTS with more than one of ORDONLY, OWRONLY and ORDWR.',
            JCLD006: 'DISP used with PATH (use PATHDISP).',
            JCLD007: 'Path options without PATH.'
        }
    },
    {
        prefix: 'JCLF',
        name: 'Dataset flow',
        codes: {
            JCLF001: 'A temporary dataset read before any step creates or passes it.',
            JCLF002: 'A dataset passed that no later step reads.',
            JCLF003: 'A dataset created and catalogued twice with no delete in between.',
            JCLF004: 'A dataset read after an earlier step deletes it.',
            JCLF005: "A referback (*.step.dd) to a step or DD that doesn't exist or comes later."
        }
    },
    {
        prefix: 'JCLK',
        name: 'Keywords',
        codes: {
            JCLK001: 'An unknown keyword, with "Did you mean" when one is close.',
            JCLK002: 'A required parameter is missing.',
            JCLK003: 'A positional parameter after a keyword.',
            JCLK004: 'Too many positional parameters for the statement.',
            JCLK005: "A keyword or statement that doesn't exist at the chosen z/OS level.",
            JCLK006: 'DLM= on a DD with no in-stream data.',
            JCLK007: 'NOTIFY with both EMAIL and USER.',
            JCLK008: "A keyword that can't name a procedure step.",
            JCLK009: 'A keyword naming a procedure step on an EXEC PGM= step.'
        }
    },
    {
        prefix: 'JCLS',
        name: 'Parameter values',
        codes: {
            JCLS001: 'An invalid DISP value.',
            JCLS002: 'An invalid SPACE value.',
            JCLS003: 'An invalid DCB, RECFM or DSORG value.',
            JCLS004: 'An invalid REGION value.',
            JCLS005: 'An invalid TIME value.',
            JCLS006: 'An invalid dataset name (length, qualifiers or temporary name).',
            JCLS007: 'A dataset name qualifier longer than 8 characters.',
            JCLS008: 'A dataset name qualifier that starts with an invalid character.',
            JCLS009: "A value that doesn't fit its keyword's rule, listing what's allowed.",
            JCLS010: 'An invalid member name in brackets.',
            JCLS011: 'An invalid DLM= delimiter.',
            JCLS012: "Accounting information or a programmer's name that's too long.",
            JCLS013: "A programmer's name with special characters that isn't quoted.",
            JCLS014: "A quoted dataset name, which isn't checked (information)."
        }
    },
    {
        prefix: 'JCLN',
        name: 'Names',
        codes: {
            JCLN001: 'An invalid job, step, DD or procedure step name.'
        }
    },
    {
        prefix: 'JCLR',
        name: 'Procedures and INCLUDE',
        codes: {
            JCLR001: "A called procedure that can't be found (add it in the Library panel).",
            JCLR002: 'A symbolic parameter the procedure doesn\'t declare.',
            JCLR003: "A DD override that doesn't match a DD in the procedure.",
            JCLR004: 'A procedure step that the procedure doesn\'t have.',
            JCLR005: "An INCLUDE member that isn't in the Library panel.",
            JCLR006: 'An INCLUDE member that includes itself.',
            JCLR007: 'INCLUDE members nested too deep.',
            JCLR008: "A statement that can't be in an INCLUDE member."
        }
    },
    {
        prefix: 'JCLJ',
        name: 'JES2 and JES3 statements',
        codes: {
            JCLJ001: 'An unknown JES2 statement.',
            JCLJ002: '/*ROUTE without PRINT, PUNCH or XEQ and a destination.',
            JCLJ003: 'A JES2 statement on the wrong side of the JOB statement.',
            JCLJ301: 'A misspelt JES3 statement.',
            JCLJ302: 'An unknown keyword on a JES3 statement.',
            JCLJ303: 'A JES3 statement in the wrong place.',
            JCLJ304: '//*DATASET without //*ENDDATASET.',
            JCLJ305: 'A JES2 statement in a job checked for JES3.',
            JCLJ306: 'A JES3-looking comment in a job checked for JES2 (information).'
        }
    },
    {
        prefix: 'JCLC',
        name: 'IF conditions',
        codes: {
            JCLC001: 'IF condition syntax (operators, brackets, words).',
            JCLC002: 'An RC value outside 0-4095.',
            JCLC003: 'An invalid ABENDCC value.',
            JCLC004: "A condition naming a step that isn't earlier in the job.",
            JCLC005: "A condition naming a procedure step the procedure doesn't have.",
            JCLC006: 'IF without THEN.',
            JCLC007: 'A second ELSE in one IF.',
            JCLC008: 'IF statements nested too deep.'
        }
    },
    {
        prefix: 'JCLG',
        name: 'Job groups',
        codes: {
            JCLG001: "ENDGROUP name doesn't match its JOBGROUP.",
            JCLG002: 'JOBGROUP without ENDGROUP.',
            JCLG003: 'ENDGROUP without JOBGROUP.',
            JCLG004: 'The same job twice in a group.',
            JCLG005: 'JOBSET and ENDSET not paired.',
            JCLG006: 'SJOB outside a JOBSET.',
            JCLG007: 'AFTER, BEFORE or CONCURRENT before any job.',
            JCLG008: 'A dependency naming a job not in the group.',
            JCLG009: 'A loop of job dependencies.',
            JCLG010: 'A job group statement outside a group.'
        }
    }
];
