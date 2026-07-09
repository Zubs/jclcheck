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
        message: (d) => `Statement does not begin with '//'.`,
        suggestion: () => `All JCL statements must start in column 1 with '//'.`
    },
    JCLL002: {
        message: (d) => `Line exceeds the 80 character JCL record length.`,
        suggestion: () => `Split the statement using a continuation (end the line with a comma and continue in columns 4-16 of the next '//' line).`
    },
    JCLL003: {
        message: (d) => `Unterminated quoted string.`,
        suggestion: () => `Add the closing single quote. Use '' to represent a literal quote inside the string.`
    },

    // Parser-level (JCLP0xx)
    JCLP001: {
        message: (d) => `Expected a statement type (JOB, EXEC, DD, PROC, PEND, IF, SET, INCLUDE) after the name field.`,
        suggestion: () => `Check spelling and spacing - the operation field must follow the name field separated by at least one blank.`
    },
    JCLP002: {
        message: (d) => `'${d.found}' was not expected here.`,
        suggestion: (d) => d.hint || 'Check statement ordering.'
    },
    JCLP003: {
        message: (d) => `Unmatched parenthesis in parameter list.`,
        suggestion: () => `Every '(' needs a matching ')'. Count the parentheses in this parameter.`
    },
    JCLP004: {
        message: (d) => `Continuation line does not continue an open parameter list or trailing comma.`,
        suggestion: () => `Only continue a statement when the previous line ends with a comma, or a parenthesized list is still open.`
    },
    JCLP005: {
        message: (d) => `IF statement without matching ENDIF.`,
        suggestion: () => `Add a matching ENDIF to close this IF block.`
    },
    JCLP006: {
        message: (d) => `ENDIF without a matching IF.`,
        suggestion: () => `Remove this ENDIF or add a preceding IF statement.`
    },
    JCLP007: {
        message: (d) => `ELSE without a matching IF.`,
        suggestion: () => `ELSE must appear inside an open IF/THEN block.`
    },
    JCLP008: {
        message: (d) => `PEND without a matching PROC.`,
        suggestion: () => `Every in-stream PROC must begin with a PROC statement and end with PEND.`
    },
    JCLP009: {
        message: (d) => `PROC without a matching PEND.`,
        suggestion: () => `Add a PEND statement to close this procedure.`
    },

    // Validator: ordering (JCLO0xx)
    JCLO001: {
        message: (d) => `A job must begin with a JOB statement.`,
        suggestion: () => `Add '//jobname JOB (accounting)...' as the first statement.`
    },
    JCLO002: {
        message: (d) => `EXEC statement '${d.name}' appears before the JOB statement.`,
        suggestion: () => `Move the JOB statement so it is the first statement in the job.`
    },
    JCLO003: {
        message: (d) => `DD statement '${d.name}' appears before any EXEC statement.`,
        suggestion: () => `DD statements belong to a step - add an EXEC statement first.`
    },
    JCLO004: {
        message: (d) => `Only one JOB statement is allowed per job.`,
        suggestion: () => `Remove the extra JOB statement, or split into separate jobs.`
    },

    // Validator: DD / duplicates (JCLD0xx)
    JCLD001: {
        message: (d) => `Duplicate DD name '${d.name}' in step '${d.step}'.`,
        suggestion: () => `Rename one of the DD statements, or if concatenating datasets omit the ddname on the later DD statements.`
    },
    JCLD002: {
        message: (d) => `DD statement is missing a data source.`,
        suggestion: () => `Specify DSN=, DUMMY, SYSOUT=, DATA, or * (instream data).`
    },
    JCLD003: {
        message: (d) => `DD statement combines mutually exclusive parameters ('${d.a}' and '${d.b}').`,
        suggestion: () => `Choose only one of DSN, DUMMY, SYSOUT, or instream data (* / DATA) per DD statement.`
    },

    // Validator: keywords / params (JCLK0xx)
    JCLK001: {
        message: (d) => `'${d.keyword}' is not a recognized keyword for a ${d.stmt} statement.`,
        suggestion: (d) => d.closest ? `Did you mean '${d.closest}'?` : `Remove the parameter or check the spelling against the IBM JCL Reference.`
    },
    JCLK002: {
        message: (d) => `${d.stmt} statement is missing required parameter '${d.param}'.`,
        suggestion: (d) => d.hint || `Add ${d.param}= to this statement.`
    },
    JCLK003: {
        message: (d) => `Positional parameter '${d.value}' is not valid in this position.`,
        suggestion: () => `Positional parameters must appear before any keyword parameters.`
    },

    // Validator: syntax of specific parameter values (JCLS0xx)
    JCLS001: {
        message: (d) => `Invalid DISP value '${d.value}'.`,
        suggestion: (d) => `DISP status must be one of NEW, OLD, SHR, MOD; normal/abnormal disposition must be one of DELETE, KEEP, CATLG, UNCATLG${d.pass ? ', PASS' : ''}.`
    },
    JCLS002: {
        message: (d) => `Invalid SPACE parameter '${d.value}'.`,
        suggestion: () => `Use SPACE=(unit,(primary,secondary,directory)) where unit is TRK, CYL, or a block length.`
    },
    JCLS003: {
        message: (d) => `Invalid DCB sub-parameter '${d.value}'.`,
        suggestion: () => `Check RECFM, LRECL, BLKSIZE and DSORG values against the IBM JCL Reference.`
    },
    JCLS004: {
        message: (d) => `Invalid REGION value '${d.value}'.`,
        suggestion: () => `REGION must be a number of kilobytes (nnnnK) or megabytes (nnnnM), e.g. REGION=0M or REGION=4096K.`
    },
    JCLS005: {
        message: (d) => `Invalid TIME value '${d.value}'.`,
        suggestion: () => `Use TIME=(minutes,seconds), TIME=minutes, or TIME=1440/TIME=NOLIMIT for no limit.`
    },
    JCLS006: {
        message: (d) => `Invalid DSN '${d.value}'.`,
        suggestion: (d) => d.hint || `Dataset names may have up to 22 qualifiers of 1-8 alphanumeric/national ($#@) characters each, separated by periods, totalling 44 characters or fewer.`
    },
    JCLS007: {
        message: (d) => `DSN qualifier '${d.qual}' is longer than 8 characters.`,
        suggestion: () => `Shorten the qualifier to 8 characters or fewer.`
    },
    JCLS008: {
        message: (d) => `DSN qualifier '${d.qual}' starts with an invalid character.`,
        suggestion: () => `Qualifiers must start with a letter or national character ($ # @).`
    },

    // Name field (JCLN0xx)
    JCLN001: {
        message: (d) => `'${d.name}' is not a valid ${d.stmt} name.`,
        suggestion: () => `Names must be 1-8 characters, start with a letter or national character ($ # @), and contain only letters, digits, or national characters.`
    },

    // PROC (JCLR0xx)
    JCLR001: {
        message: (d) => `Referenced procedure '${d.name}' is not defined in this job stream.`,
        suggestion: (d) => `Add an in-stream PROC named '${d.name}', reference a cataloged procedure, or check for a typo.`
    },
    JCLR002: {
        message: (d) => `Symbolic parameter '${d.sym}' is not defined in procedure '${d.proc}'.`,
        suggestion: (d) => `Add &${d.sym}= as a default on the PROC statement, or supply it on the EXEC statement.`
    },
    JCLR003: {
        message: (d) => `Overriding DD '${d.name}' does not match any DD in procedure step '${d.step}'.`,
        suggestion: (d) => `Check the ddname against the procedure step, or use ${d.step}.${d.name} to be explicit.`
    },
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
        severity: overrides.severity || (code.startsWith('JCLK') || code.startsWith('JCLS') ? SEVERITY.WARNING : SEVERITY.ERROR),
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
