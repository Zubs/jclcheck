// Canonical error/diagnostic object used everywhere in the pipeline.
//
// Shape: { code, severity, line, column, message, suggestion, source }

const SEVERITY = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

class Diagnostic {
    constructor({
        code,
        severity = SEVERITY.ERROR,
        line,
        column = 1,
        message,
        suggestion = null,
        source = 'validator',
        length = 1
    }) {
        this.code = code;
        this.severity = severity;
        this.line = line;
        this.column = column;
        this.length = length;
        this.message = message;
        this.suggestion = suggestion;
        this.source = source; // lexer | parser | validator
    }
}

// Central registry of error codes -> human explanations & default suggestions.
// Keeping this table means every error is explained in plain English by
// construction, and suggestions stay consistent across the codebase.
const CATALOG = {
    // Lexer-level (JCLL0xx)
    JCLL001: {
        severity: 'error',
        message: (d) => `Statement does not begin with '//'.`,
        suggestion: () => `All JCL statements must start in column 1 with '//'.`
    },
    JCLL002: {
        severity: 'error',
        message: (d) => `Line exceeds the 80 character JCL record length.`,
        suggestion: () => `Split the statement using a continuation (end the line with a comma and continue in columns 4-16 of the next '//' line).`
    },
    JCLL003: {
        severity: 'error',
        message: (d) => `Unterminated quoted string.`,
        suggestion: () => `Add the closing single quote. Use '' to represent a literal quote inside the string.`
    },
    JCLL005: {
        severity: 'error',
        message: (d) => `A continued quoted string must resume in column 16 (found column ${d.column}).`,
        suggestion: () => `Extend the string to column 71, then continue it on the next line with '//', blanks in columns 3-15, and the rest of the string starting in column 16.`
    },
    JCLL006: {
        severity: 'warning',
        message: (d) => `In-stream data reaches the end of the input without its delimiter '${d.delim}'.`,
        suggestion: (d) => `Add a line starting in column 1 with '${d.delim}' where the data ends.`
    },
    JCLL004: {
        severity: 'error',
        message: () => `Column 72 is not blank, so the next line should continue this statement's comment, but it doesn't.`,
        suggestion: () => `Only columns 1-71 hold the statement. Clear column 72, or start the next line with '//' and a blank in column 3. If the statement runs past column 71, break it after a comma and continue on the next line.`
    },

    // Parser-level (JCLP0xx)
    JCLP001: {
        severity: 'error',
        message: (d) => `Expected a statement type (JOB, EXEC, DD, PROC, PEND, IF, SET, INCLUDE) after the name field.`,
        suggestion: () => `Check spelling and spacing - the operation field must follow the name field separated by at least one blank.`
    },
    JCLP002: {
        severity: 'error',
        message: (d) => `'${d.found}' was not expected here.`,
        suggestion: (d) => d.hint || 'Check statement ordering.'
    },
    JCLP003: {
        severity: 'error',
        message: (d) => `Unmatched parenthesis in parameter list.`,
        suggestion: () => `Every '(' needs a matching ')'. Count the parentheses in this parameter.`
    },
    JCLP004: {
        severity: 'error',
        message: (d) => `Continuation line does not continue an open parameter list or trailing comma.`,
        suggestion: () => `Only continue a statement when the previous line ends with a comma, or a parenthesized list is still open.`
    },
    JCLP005: {
        severity: 'error',
        message: (d) => `IF statement without matching ENDIF.`,
        suggestion: () => `Add a matching ENDIF to close this IF block.`
    },
    JCLP006: {
        severity: 'error',
        message: (d) => `ENDIF without a matching IF.`,
        suggestion: () => `Remove this ENDIF or add a preceding IF statement.`
    },
    JCLP007: {
        severity: 'error',
        message: (d) => `ELSE without a matching IF.`,
        suggestion: () => `ELSE must appear inside an open IF/THEN block.`
    },
    JCLP008: {
        severity: 'error',
        message: (d) => `PEND without a matching PROC.`,
        suggestion: () => `Every in-stream PROC must begin with a PROC statement and end with PEND.`
    },
    JCLP009: {
        severity: 'error',
        message: (d) => `PROC without a matching PEND.`,
        suggestion: () => `Add a PEND statement to close this procedure.`
    },

    // Validator: ordering (JCLO0xx)
    JCLO001: {
        severity: 'error',
        message: (d) => `A job must begin with a JOB statement.`,
        suggestion: () => `Add '//jobname JOB (accounting)...' as the first statement.`
    },
    JCLO002: {
        severity: 'error',
        message: (d) => `EXEC statement '${d.name}' appears before the JOB statement.`,
        suggestion: () => `Move the JOB statement so it is the first statement in the job.`
    },
    JCLO003: {
        severity: 'error',
        message: (d) => `DD statement '${d.name}' appears before any EXEC statement.`,
        suggestion: () => `DD statements belong to a step - add an EXEC statement first.`
    },
    JCLO005: {
        severity: 'error',
        message: () => `JCLLIB must come after the JOB statement and before the first EXEC statement.`,
        suggestion: () => `Move the JCLLIB statement so it sits between the JOB statement and the first EXEC statement.`
    },
    JCLO006: {
        severity: 'error',
        message: () => `Only one JCLLIB statement is allowed per job.`,
        suggestion: () => `Merge the libraries into the first JCLLIB's ORDER= list and remove this one.`
    },
    JCLO008: {
        severity: 'error',
        message: () => `JCLLIB is not allowed inside a procedure.`,
        suggestion: () => `Move the JCLLIB statement into the job, between the JOB statement and the first EXEC statement.`
    },
    JCLO009: {
        severity: 'error',
        message: () => `A NOTIFY statement must be in a job, after its JOB statement, and not inside a procedure.`,
        suggestion: () => `Move the NOTIFY statement after the JOB statement it belongs to.`
    },
    JCLO011: {
        severity: 'error',
        message: (d) => `In-stream procedure '${d.name}' comes before the JOB statement.`,
        suggestion: () => `Move the PROC ... PEND after the JOB statement and before the step that calls it.`
    },
    JCLO010: {
        severity: 'error',
        message: (d) => `A job can have at most ${d.max} NOTIFY statements.`,
        suggestion: () => `Remove the extra NOTIFY statements.`
    },
    JCLO007: {
        severity: 'error',
        message: () => `Statement after the end of the job (//).`,
        suggestion: () => `Start a new job with a JOB statement, or remove the null statement (//) if the job should continue.`
    },

    // JES2 control statements (JCLJ0xx)
    JCLJ001: {
        severity: 'warning',
        message: (d) => `'/*${d.name}' is not a recognized JES2 control statement.`,
        suggestion: (d) => d.closest ? `Did you mean '${d.closest}'?` : `JES2 statements are JOBPARM, MESSAGE, NETACCT, NOTIFY, OUTPUT, PRIORITY, ROUTE, SETUP, SIGNOFF, SIGNON, XEQ and XMIT. Check the spelling, or ignore this if your shop defines its own.`
    },
    JCLJ002: {
        severity: 'warning',
        message: (d) => d.found ? `/*ROUTE must start with PRINT, PUNCH or XEQ followed by a destination; found '${d.found}'.` : `/*ROUTE must start with PRINT, PUNCH or XEQ followed by a destination.`,
        suggestion: () => `For example: /*ROUTE PRINT NODE1, /*ROUTE PUNCH RMT5 or /*ROUTE XEQ N5.`
    },
    JCLJ003: {
        severity: 'warning',
        message: (d) => d.before ? `/*${d.name} must come before the JOB statement.` : `/*${d.name} must come after the JOB statement.`,
        suggestion: (d) => d.before ? `Move /*${d.name} above the JOB statement.` : `Move /*${d.name} below the JOB statement.`
    },

    // JES3 control statements (JCLJ3xx)
    JCLJ301: {
        severity: 'warning',
        message: (d) => `'//*${d.name}' looks like a JES3 statement, but '${d.name}' isn't one.`,
        suggestion: (d) => `Did you mean '${d.closest}'? If this line is a comment, add a blank after '//*'.`
    },
    JCLJ302: {
        severity: 'warning',
        message: (d) => `'${d.keyword}' is not a recognized keyword on the JES3 ${d.name} statement.`,
        suggestion: (d) => d.closest ? `Did you mean '${d.closest}'?` : `Check the keyword against the ${d.name} statement in the JES3 section of the JCL Reference.`
    },
    JCLJ303: {
        severity: 'warning',
        message: (d) => ({
            before: `//*${d.name} must come before the JOB statement.`,
            beforeExec: `//*${d.name} must come after the JOB statement and before the first EXEC statement.`,
            afterJob: `//*${d.name} must come after the JOB statement.`
        })[d.place],
        suggestion: (d) => ({
            before: `Move //*${d.name} above the JOB statement.`,
            beforeExec: `Move //*${d.name} between the JOB statement and the first EXEC statement.`,
            afterJob: `Move //*${d.name} below the JOB statement.`
        })[d.place]
    },
    JCLJ304: {
        severity: 'warning',
        message: () => `//*DATASET is not closed by a //*ENDDATASET statement.`,
        suggestion: () => `Add //*ENDDATASET after the last line of the data.`
    },
    JCLJ305: {
        severity: 'warning',
        message: (d) => `/*${d.name} is a JES2 statement, but this job is being checked for JES3.`,
        suggestion: () => `Remove it, use the JES3 equivalent, or check the job for JES2.`
    },
    JCLJ306: {
        severity: 'info',
        message: (d) => `This looks like the JES3 ${d.name} statement. It is treated as a comment unless JES3 is selected.`,
        suggestion: () => `Choose JES3 (at z/OS 2.5 or earlier) to check it, or ignore this if your shop runs JES2.`
    },

    // IF/THEN/ELSE conditions (JCLC0xx)
    JCLC001: {
        severity: 'error',
        message: (d) => `Invalid IF condition: ${d.detail}`,
        suggestion: () => `Conditions use RC, ABEND, ABENDCC or RUN (optionally step.RC or step.procstep.RC), comparison operators such as = or GT, NOT (¬), AND (&), OR (|) and brackets, and end with THEN.`
    },
    JCLC002: {
        severity: 'error',
        message: (d) => `RC can only be compared with a whole number from 0 to 4095; found '${d.value}'.`,
        suggestion: () => `Use a return code from 0 to 4095, for example RC > 4.`
    },
    JCLC003: {
        severity: 'error',
        message: (d) => `'${d.value}' is not a valid ABENDCC value.`,
        suggestion: () => `Use a system code S followed by three hex digits (ABENDCC = S0C4) or a user code U followed by 0000-4095 (ABENDCC = U0100).`
    },
    JCLC004: {
        severity: 'error',
        message: (d) => `'${d.step}' in this IF condition is not an earlier step in this ${d.where}.`,
        suggestion: () => `Name a step that comes before the IF statement, and check the spelling.`
    },
    JCLC005: {
        severity: 'error',
        message: (d) => `'${d.procstep}' is not a step in procedure '${d.proc}', which step '${d.step}' calls.`,
        suggestion: (d) => `Use one of the steps of '${d.proc}'.`
    },
    JCLC006: {
        severity: 'error',
        message: () => `IF condition must end with THEN.`,
        suggestion: () => `Add THEN after the condition, for example // IF (STEP1.RC = 0) THEN.`
    },
    JCLC007: {
        severity: 'error',
        message: () => `This IF already has an ELSE.`,
        suggestion: () => `An IF can have only one ELSE. Remove this one, or close the IF with ENDIF and start a new IF.`
    },
    JCLC009: {
        severity: 'warning',
        message: (d) => `'${d.ch}' is read here as the NOT sign (¬).`,
        suggestion: () => `Use ¬ or the word NOT. z/OS only reads this character as NOT in code pages where it is the ¬ character.`
    },
    JCLC008: {
        severity: 'error',
        message: (d) => `IF statements are nested more than ${d.max} levels deep.`,
        suggestion: () => `Simplify the conditions, or combine nested IFs with AND.`
    },

    // Job groups (JCLG0xx)
    JCLG001: {
        severity: 'error',
        message: (d) => `ENDGROUP '${d.name}' does not match JOBGROUP '${d.group}'.`,
        suggestion: (d) => `Give the ENDGROUP statement the same name as its JOBGROUP: //${d.group} ENDGROUP.`
    },
    JCLG002: {
        severity: 'error',
        message: (d) => `JOBGROUP '${d.name}' has no ENDGROUP.`,
        suggestion: (d) => `Add //${d.name} ENDGROUP after the group's last statement.`
    },
    JCLG003: {
        severity: 'error',
        message: () => `ENDGROUP without a JOBGROUP.`,
        suggestion: () => `Remove this ENDGROUP, or start the group with a JOBGROUP statement.`
    },
    JCLG004: {
        severity: 'error',
        message: (d) => `Job '${d.name}' is defined more than once in job group '${d.group}'.`,
        suggestion: () => `Give each GJOB and SJOB in a group its own name.`
    },
    JCLG005: {
        severity: 'error',
        message: (d) => d.name === null ? `ENDSET without a JOBSET.` : `JOBSET '${d.name}' has no ENDSET.`,
        suggestion: () => `Every JOBSET must be closed by an ENDSET before the group ends.`
    },
    JCLG006: {
        severity: 'error',
        message: () => `SJOB must be inside a JOBSET.`,
        suggestion: () => `Put SJOB statements between JOBSET and ENDSET, or use GJOB for a job on its own.`
    },
    JCLG007: {
        severity: 'error',
        message: (d) => `${d.op} must follow a GJOB or SJOB statement.`,
        suggestion: () => `Put dependency statements straight after the job they belong to.`
    },
    JCLG008: {
        severity: 'error',
        message: (d) => `'${d.name}' is not a job in job group '${d.group}'.`,
        suggestion: (d) => d.jobs.length ? `The group's jobs are: ${d.jobs.join(', ')}.` : `The group has no jobs yet.`
    },
    JCLG009: {
        severity: 'error',
        message: (d) => `Job group '${d.group}' has a dependency loop: ${d.cycle.join(' → ')}.`,
        suggestion: () => `A job can't wait for itself. Remove or change one of the AFTER or BEFORE statements in the loop.`
    },
    JCLG010: {
        severity: 'error',
        message: (d) => `${d.op} can only appear inside a job group.`,
        suggestion: () => `Start the group with a JOBGROUP statement, or remove this statement.`
    },

    // Site profile and suppressions (JCLN002, JCLX0xx)
    JCLN002: {
        severity: 'warning',
        message: (d) => d.message,
        suggestion: (d) => `This is a rule from your site profile (${d.rule}). Change the JCL, or the profile if the rule is wrong.`
    },
    JCLX001: {
        severity: 'info',
        message: (d) => d.code ? `JCLCHECK names '${d.code}', which isn't a diagnostic code.` : `JCLCHECK names no diagnostic code.`,
        suggestion: () => `Name the codes to hide, for example //* JCLCHECK OFF-NEXT JCLK001. Help lists every code.`
    },
    JCLX002: {
        severity: 'info',
        message: (d) => `The suppression of ${d.code} here hid nothing.`,
        suggestion: () => `Remove it, or check that it is just before the statement it was meant for.`
    },

    // Validator: dataset flow across steps (JCLF0xx)
    JCLF001: {
        severity: 'error',
        message: (d) => `Temporary dataset '${d.name}' is read in step ${d.step}, but no earlier step creates or passes it.`,
        suggestion: (d) => d.closest
            ? `Did you mean '${d.closest.name}', which step ${d.closest.step} creates?`
            : `Create it with DISP=(NEW,PASS) in an earlier step, or check the name.`
    },
    JCLF002: {
        severity: 'warning',
        message: (d) => `Dataset '${d.name}' is passed by step ${d.step}, but no later step reads it.`,
        suggestion: () => `Read it in a later step, or use DISP=(NEW,DELETE) or CATLG instead of PASS.`
    },
    JCLF003: {
        severity: 'warning',
        message: (d) => `Dataset '${d.name}' is created and catalogued again in step ${d.step}; step ${d.first} already catalogued it.`,
        suggestion: () => `The second allocation fails because the name is already catalogued. Delete it in between, or use another name.`
    },
    JCLF004: {
        severity: 'warning',
        message: (d) => `Dataset '${d.name}' is read in step ${d.step}, but step ${d.deletedBy} deletes it${d.implicit ? ' (a NEW dataset with no disposition is deleted when its step ends)' : ''}.`,
        suggestion: () => `Keep or pass it in the earlier step, for example DISP=(NEW,PASS), or create it again.`
    },
    JCLF005: {
        severity: 'error',
        message: (d) => `Referback '${d.ref}' ${d.detail}.`,
        suggestion: () => `A referback names an earlier DD: *.ddname in the same step, *.step.ddname, or *.step.procstep.ddname.`
    },

    // Validator: DD / duplicates (JCLD0xx)
    JCLD001: {
        // Valid JCL: both DDs are allocated.
        severity: 'warning',
        message: (d) => `Duplicate DD name '${d.name}' in step '${d.step}'. z/OS allocates both DD statements, but a program using this name reaches only the first one.`,
        suggestion: () => `Rename or remove one of the DD statements. To concatenate datasets, leave the name off the later DD statements.`
    },
    JCLD002: {
        severity: 'error',
        message: (d) => `DD statement is missing a data source.`,
        suggestion: () => `Specify DSN=, DUMMY, SYSOUT=, DATA, or * (instream data).`
    },
    JCLD003: {
        severity: 'error',
        message: (d) => `DD statement combines mutually exclusive parameters ('${d.a}' and '${d.b}').`,
        suggestion: () => `Choose only one of DSN, DUMMY, SYSOUT, or instream data (* / DATA) per DD statement.`
    },

    JCLD004: {
        severity: 'info',
        message: () => `This in-stream JCL will be submitted as a separate job and is not checked here.`,
        suggestion: () => `To check the nested job, paste it into the workbench on its own.`
    },

    JCLD005: {
        severity: 'error',
        message: (d) => `PATHOPTS can have only one of ORDONLY, OWRONLY and ORDWR; found ${d.modes.join(', ')}.`,
        suggestion: () => `Use ORDWR to read and write, or keep just one of ORDONLY or OWRONLY.`
    },
    JCLD006: {
        severity: 'error',
        message: () => `DISP can't be used with PATH.`,
        suggestion: () => `Use PATHDISP=(normal,abnormal) to say what happens to a z/OS UNIX file, for example PATHDISP=(KEEP,DELETE).`
    },
    JCLD007: {
        severity: 'warning',
        message: (d) => `${d.keyword} only applies to z/OS UNIX files, but this DD has no PATH.`,
        suggestion: () => `Add PATH='/path/to/file', or remove the PATH options.`
    },

    // Validator: keywords / params (JCLK0xx)
    JCLK001: {
        severity: 'warning',
        message: (d) => d.proc
            ? `'${d.keyword}' is not an EXEC keyword or a symbolic parameter of procedure '${d.proc}'.`
            : `'${d.keyword}' is not a recognized keyword for a ${d.stmt} statement.`,
        suggestion: (d) => d.closest ? `Did you mean '${d.closest}'?` : `Remove the parameter or check the spelling against the IBM JCL Reference.`
    },
    JCLK002: {
        severity: 'error',
        message: (d) => `${d.stmt} statement is missing required parameter '${d.param}'.`,
        suggestion: (d) => d.hint || `Add ${d.param}= to this statement.`
    },
    JCLK003: {
        severity: 'error',
        message: (d) => `Positional parameter '${d.value}' is not valid in this position.`,
        suggestion: () => `Positional parameters must appear before any keyword parameters.`
    },
    JCLK006: {
        severity: 'warning',
        message: () => `DLM= has no effect, because this DD statement has no in-stream data.`,
        suggestion: () => `Remove DLM=, or use DD * or DD DATA if this DD should hold in-stream data.`
    },
    JCLK007: {
        severity: 'error',
        message: () => `A NOTIFY statement can have EMAIL or USER, but not both.`,
        suggestion: () => `Keep one of them, and use a second NOTIFY statement for the other recipient.`
    },
    JCLK008: {
        severity: 'warning',
        message: (d) => `${d.keyword} can't be qualified with a procedure step.`,
        suggestion: () => `Only COND, REGION, TIME, PARM, ACCT, ADDRSPC, DPRTY, PERFORM and RD can name a procedure step (for example REGION.STEP1=4M).`
    },
    JCLK009: {
        severity: 'error',
        message: (d) => `${d.keyword}.${d.procstep} names a procedure step, but this step runs a program, not a procedure.`,
        suggestion: (d) => `Write ${d.keyword}= without the step name, or call a procedure with PROC= instead of PGM=.`
    },
    JCLK004: {
        severity: 'error',
        message: (d) => `The ${d.stmt} statement allows at most ${d.limit} positional parameter${d.limit === 1 ? '' : 's'}${d.what ? ` (${d.what})` : ''}; found ${d.found}.`,
        suggestion: () => `Remove the extra positional parameters. Check for stray commas: each comma before the first keyword starts another positional parameter.`
    },
    // A known keyword or statement that doesn't exist at the chosen z/OS level,
    // because it arrived later (reason 'since') or was removed (reason 'until').
    JCLK005: {
        severity: 'warning',
        message: (d) => {
            const what = d.kind === 'statement' ? `The ${d.name} statement` : `'${d.name}' on the ${d.stmt} statement`;
            const when = d.reason === 'until' ? `was removed after z/OS ${d.at}` : `is available from z/OS ${d.at}`;
            return `${what} ${when}. You are checking against z/OS ${d.level}.`;
        },
        suggestion: (d) => d.reason === 'until'
            ? `Choose z/OS ${d.at} or earlier, or remove '${d.name}'.`
            : `Choose z/OS ${d.at} or later, or remove '${d.name}'.`
    },

    // Validator: syntax of specific parameter values (JCLS0xx)
    JCLS001: {
        severity: 'error',
        message: (d) => `Invalid DISP value '${d.value}'.`,
        suggestion: (d) => `DISP status must be one of NEW, OLD, SHR, MOD; normal/abnormal disposition must be one of DELETE, KEEP, CATLG, UNCATLG${d.pass ? ', PASS' : ''}.`
    },
    JCLS002: {
        severity: 'warning',
        message: (d) => `Invalid SPACE parameter '${d.value}'.`,
        suggestion: () => `Use SPACE=(unit,(primary,secondary,directory)) where unit is TRK, CYL, or a block length.`
    },
    JCLS003: {
        severity: 'warning',
        message: (d) => `Invalid DCB sub-parameter '${d.value}'.`,
        suggestion: () => `Check RECFM, LRECL, BLKSIZE and DSORG values against the IBM JCL Reference.`
    },
    JCLS004: {
        severity: 'warning',
        message: (d) => `Invalid REGION value '${d.value}'.`,
        suggestion: () => `REGION must be a number of kilobytes (nnnnK) or megabytes (nnnnM), e.g. REGION=0M or REGION=4096K.`
    },
    JCLS005: {
        severity: 'warning',
        message: (d) => `Invalid TIME value '${d.value}'.`,
        suggestion: () => `Use TIME=(minutes,seconds), TIME=minutes, or TIME=1440/TIME=NOLIMIT for no limit.`
    },
    JCLS006: {
        severity: 'error',
        message: (d) => `Invalid DSN '${d.value}'.`,
        suggestion: (d) => d.hint || `Dataset names may have up to 22 qualifiers of 1-8 alphanumeric/national ($#@) characters each, separated by periods, totalling 44 characters or fewer.`
    },
    JCLS007: {
        severity: 'error',
        message: (d) => `DSN qualifier '${d.qual}' is longer than 8 characters.`,
        suggestion: () => `Shorten the qualifier to 8 characters or fewer.`
    },
    JCLS008: {
        severity: 'error',
        message: (d) => `DSN qualifier '${d.qual}' starts with an invalid character.`,
        suggestion: () => `Qualifiers must start with a letter or national character ($ # @).`
    },

    JCLS009: {
        severity: 'warning',
        message: (d) => `${d.keyword} ${d.detail}; found '${d.found}'.`,
        suggestion: (d) => d.closest ? `Did you mean '${d.closest}'?` : `Change the value of ${d.keyword} to one that is allowed.`
    },
    JCLS010: {
        severity: 'warning',
        message: (d) => d.member === '' ? `The member name in brackets is empty.` : `'${d.member}' is not a valid member name.`,
        suggestion: () => `A member name is 1-8 letters, digits or $#@, starting with a letter or $#@, in brackets after the dataset name: DSN=MY.LIB(MEMBER). A generation is (0), (+n) or (-n).`
    },
    JCLS011: {
        severity: 'warning',
        message: (d) => `Invalid DLM value '${d.value}'.`,
        suggestion: () => `A delimiter is exactly two characters. Letters, digits and $ # @ can be written as they are (DLM=@@); quote anything else (DLM='%%').`
    },

    JCLS014: {
        severity: 'info',
        message: () => `Quoted dataset names are not checked against the naming rules.`,
        suggestion: () => `Leave the quotes off unless the name really needs characters the rules don't allow.`
    },
    JCLS012: {
        severity: 'warning',
        message: (d) => `The ${d.what} is ${d.length} characters long; the maximum is ${d.max}.`,
        suggestion: (d) => `Shorten the ${d.what} to ${d.max} characters or fewer.`
    },
    JCLS013: {
        severity: 'warning',
        message: (d) => `The programmer's name '${d.value}' contains special characters and must be enclosed in apostrophes.`,
        suggestion: (d) => `Write it as '${d.value.replace(/'/g, "''")}'.`
    },

    // Name field (JCLN0xx)
    JCLN001: {
        severity: 'error',
        message: (d) => `'${d.name}' is not a valid ${d.stmt} name.`,
        suggestion: () => `Names must be 1-8 characters, start with a letter or national character ($ # @), and contain only letters, digits, or national characters.`
    },

    // PROC (JCLR0xx)
    JCLR001: {
        // It could be a catalogued procedure that wasn't supplied.
        severity: 'warning',
        message: (d) => `Referenced procedure '${d.name}' is not defined in this job stream.` + (d.libraries && d.libraries.length
            ? ` It may be found in ${d.libraries[0]}${d.libraries.length > 1 ? ` or ${d.libraries.length - 1} other ${d.libraries.length === 2 ? 'library' : 'libraries'}` : ''}.`
            : ''),
        suggestion: (d) => `Add an in-stream PROC named '${d.name}', add the catalogued procedure in the Library panel, or check for a typo.`
    },
    JCLR002: {
        severity: 'error',
        message: (d) => `Symbolic parameter '${d.sym}' is not defined in procedure '${d.proc}'${d.step ? ` when called by step '${d.step}'` : ''}.`,
        suggestion: (d) => `Add &${d.sym}= as a default on the PROC statement, or supply it on the EXEC statement.`
    },
    JCLR004: {
        severity: 'error',
        message: (d) => `PROC ${d.proc} has no step '${d.procstep}'.`,
        suggestion: (d) => d.steps.length ? `Its steps are: ${d.steps.join(', ')}.` : `The procedure has no named steps.`
    },
    JCLR005: {
        severity: 'warning',
        message: (d) => `INCLUDE member '${d.name}' is not in the library.`,
        suggestion: () => `Add the member in the Library panel, with the library from the job's JCLLIB, so its statements can be checked.`
    },
    JCLR006: {
        severity: 'error',
        message: (d) => `INCLUDE member '${d.name}' includes itself: ${d.chain.join(' → ')}.`,
        suggestion: () => `Remove the INCLUDE that leads back to a member already being included.`
    },
    JCLR007: {
        severity: 'error',
        message: (d) => `INCLUDE members are nested more than ${d.max} levels deep.`,
        suggestion: () => `Flatten the INCLUDE members so fewer of them include others.`
    },
    JCLR008: {
        severity: 'error',
        message: (d) => `A ${d.op} statement is not allowed in an INCLUDE member.`,
        suggestion: () => `INCLUDE members can't contain JOB, PROC, PEND or JCLLIB statements. Move it into the job itself.`
    },
    JCLR003: {
        severity: 'warning',
        message: (d) => `Overriding DD '${d.name}' does not match any DD in procedure step '${d.step}'.`,
        suggestion: (d) => `Check the ddname against the procedure step, or use ${d.step}.${d.name} to be explicit.`
    }
};

function makeDiagnostic(
    code,
    extra,
    overrides = {}
) {
    const entry = CATALOG[code];
    if (!entry) {
        throw new Error(`Unknown diagnostic code: ${code}`);
    }

    const data = extra || {};

    return new Diagnostic({
        code,
        message: entry.message(data),
        suggestion: entry.suggestion ? entry.suggestion(data) : null,
        severity: overrides.severity || entry.severity || (/^JCL[KSJ]/.test(code) ? SEVERITY.WARNING : SEVERITY.ERROR),
        line: overrides.line,
        column: overrides.column || 1,
        length: overrides.length || 1,
        source: overrides.source || 'validator'
    });
}

module.exports = {
    Diagnostic,
    SEVERITY,
    CATALOG,
    makeDiagnostic
};
