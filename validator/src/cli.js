// The jclcheck command: checks JCL files from a terminal or a CI pipeline and
// prints text, JSON or SARIF 2.1.0. It loads only the validator, never
// Express, and counts usage only when the user opts in (and DO_NOT_TRACK
// isn't set), through the API's POST /api/usage.

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { validate } = require('./validator');
const { profileProblem } = require('./profile');
const { ZOS_LEVELS, isZosLevel, isJes, jesAvailable } = require('./levels');
const { format } = require('./formatter');
const { version } = require('../package.json');

const USAGE = `Usage: jclcheck [options] <files or globs...>
       jclcheck format [--write] <files or globs...>

Options:
  --zos <level>          z/OS level: ${ZOS_LEVELS.join(', ')} (default ${ZOS_LEVELS[ZOS_LEVELS.length - 1]})
  --jes <JES2|JES3>      JES to check for (default JES2)
  --library <dir>        catalogued PROCs and INCLUDE members, one file per member;
                         a subdirectory named like a library (MY.PROCS.JCL) is that library
  --profile <file>       site profile (JSON)
  --format <text|json|sarif>
  --max-warnings <n>     also fail when there are more warnings than this
  --telemetry            count this run anonymously (also JCLCHECK_TELEMETRY=1)
  --write                (format) rewrite the files instead of printing one
  -h, --help             show this help

Exit codes: 0 no errors, 1 errors or too many warnings, 2 the tool couldn't run.`;

const DEFAULT_API = 'https://jclcheck.onrender.com';
const TELEMETRY_TIMEOUT_MS = 1000;
const MAX_EVENTS = 30;
const SARIF_LEVEL = { error: 'error', warning: 'warning', info: 'note' };

class UsageError extends Error {}

function readOptions(argv) {
    const { values, positionals } = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            zos: { type: 'string' },
            jes: { type: 'string' },
            library: { type: 'string' },
            profile: { type: 'string' },
            format: { type: 'string', default: 'text' },
            'max-warnings': { type: 'string' },
            telemetry: { type: 'boolean' },
            help: { type: 'boolean', short: 'h' }
        }
    });
    if (values.zos !== undefined && !isZosLevel(values.zos)) {
        throw new UsageError(`Unknown z/OS level ${values.zos}. Supported levels: ${ZOS_LEVELS.join(', ')}.`);
    }

    const jes = values.jes && values.jes.toUpperCase();
    if (jes !== undefined && (!isJes(jes) || !jesAvailable(jes, values.zos || ZOS_LEVELS[ZOS_LEVELS.length - 1]))) {
        throw new UsageError(`--jes must be JES2 or JES3, and JES3 only at z/OS 2.5 or earlier.`);
    }

    if (!['text', 'json', 'sarif'].includes(values.format)) {
        throw new UsageError('--format must be text, json or sarif.');
    }

    const max = values['max-warnings'];
    if (max !== undefined && !/^\d+$/.test(max)) {
        throw new UsageError('--max-warnings must be a whole number.');
    }

    return { ...values, jes, maxWarnings: max === undefined ? null : Number(max), patterns: positionals };
}

// One path segment of a glob as a regular expression: * is any run of
// characters and ? one character, neither crossing a /.
function segmentPattern(segment) {
    const escaped = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
    return new RegExp(`^${escaped}$`);
}

const listDir = dir => {
    try {
        return fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }
};

/** The files a glob with *, ** and ? matches, relative to `cwd` as written. */
function glob(pattern, cwd) {
    const segments = pattern.split(/[\\/]/);
    const found = new Set();
    const walk = (dir, shown, i) => {
        const join = name => (shown === null ? name : shown === '' ? `/${name}` : `${shown}/${name}`);
        if (i === segments.length) {
            return;
        }

        const segment = segments[i];
        const last = i === segments.length - 1;
        if (segment === '' && i === 0) {
            walk(path.parse(path.resolve(cwd, pattern)).root, '', 1); // an absolute pattern
        } else if (segment === '**') {
            walk(dir, shown, i + 1);
            for (const entry of listDir(dir).filter(e => e.isDirectory() && !e.name.startsWith('.'))) {
                walk(path.join(dir, entry.name), join(entry.name), i);
            }
        } else if (!/[*?]/.test(segment)) {
            walk(path.join(dir, segment), join(segment), i + 1);
            if (last && fs.existsSync(path.join(dir, segment))) {
                found.add(join(segment));
            }
        } else {
            const matches = segmentPattern(segment);
            for (const entry of listDir(dir).filter(e => matches.test(e.name) && !e.name.startsWith('.'))) {
                if (last && entry.isFile()) {
                    found.add(join(entry.name));
                } else if (!last && entry.isDirectory()) {
                    walk(path.join(dir, entry.name), join(entry.name), i + 1);
                }
            }
        }
    };

    walk(cwd, null, 0);
    return [...found].sort();
}

// Shells expand globs; this covers the ones they pass through (on Windows,
// or quoted). A pattern that matches nothing is kept, so it is reported as a
// file that can't be read.
function expand(patterns, cwd) {
    return patterns.flatMap(p => {
        const matches = /[*?]/.test(p) ? glob(p, cwd) : [];
        return matches.length ? matches : [p];
    });
}

function readLibrary(dir) {
    const entries = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            for (const file of fs.readdirSync(full, { withFileTypes: true }).filter(f => f.isFile())) {
                entries.push({ dsn: item.name.toUpperCase(), member: memberName(file.name), source: fs.readFileSync(path.join(full, file.name), 'utf8') });
            }
        } else if (item.isFile()) {
            entries.push({ dsn: null, member: memberName(item.name), source: fs.readFileSync(full, 'utf8') });
        }
    }

    return entries;
}

function memberName(file) {
    return path.parse(file).name.toUpperCase();
}

function readProfile(file) {
    let profile;
    try {
        profile = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        throw new UsageError(`Can't read the profile ${file}: ${err.message}`);
    }

    const problem = profileProblem(profile);
    if (problem) {
        throw new UsageError(`The profile ${file} isn't valid: ${problem}`);
    }

    return profile;
}

const shown = result => result.diagnostics.filter(d => !d.suppressed);
const where = (file, d) => (d.member ? `${file}[${d.member}]` : file);

function textReport(results) {
    return results.flatMap(({ file, result }) => shown(result).map(d =>
        `${where(file, d)}:${d.line}:${d.column}  ${d.severity}  ${d.code}  ${d.message}${d.suggestion ? ` (${d.suggestion})` : ''}`));
}

function sarifReport(results) {
    const rules = new Map();
    const sarifResults = [];
    for (const { file, result } of results) {
        for (const d of result.diagnostics) {
            if (!rules.has(d.code)) {
                rules.set(d.code, {
                    id: d.code,
                    shortDescription: { text: d.message },
                    help: { text: d.suggestion || d.message },
                    helpUri: 'https://jclcheck.xyz/app',
                    defaultConfiguration: { level: SARIF_LEVEL[d.severity] }
                });
            }

            sarifResults.push({
                ruleId: d.code,
                level: SARIF_LEVEL[d.severity],
                message: { text: d.suggestion ? `${d.message} ${d.suggestion}` : d.message },
                locations: [{
                    physicalLocation: {
                        artifactLocation: { uri: file.split(path.sep).join('/') },
                        region: { startLine: d.line, startColumn: d.column }
                    },
                    ...(d.member ? { message: { text: `In library member ${d.member}` } } : {})
                }],
                ...(d.suppressed ? { suppressions: [{ kind: 'inSource' }] } : {})
            });
        }
    }

    return {
        $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
        version: '2.1.0',
        runs: [{
            tool: { driver: { name: 'JCLcheck', version, informationUri: 'https://jclcheck.xyz', rules: [...rules.values()] } },
            results: sarifResults
        }]
    };
}

const bucket = n => (n === 1 ? '1' : n <= 10 ? '2-10' : n <= 100 ? '11-100' : '100+');

function ciName(env) {
    if (env.GITHUB_ACTIONS) {
        return 'github';
    }

    if (env.GITLAB_CI) {
        return 'gitlab';
    }

    if (env.JENKINS_URL) {
        return 'jenkins';
    }

    return env.CI ? 'other' : 'none';
}

function usageEvents(options, results, env) {
    const all = results.flatMap(r => shown(r.result));
    const outcome = all.some(d => d.severity === 'error') ? 'errors' : all.some(d => d.severity === 'warning') ? 'warnings' : 'clean';
    const optionNames = ['zos', 'jes', 'library', 'profile'].filter(o => options[o] !== undefined);
    if (options.maxWarnings !== null) {
        optionNames.push('max-warnings');
    }

    const events = [
        'cli/run',
        `cli/version/${version}`,
        `cli/node/${process.versions.node.split('.')[0]}`,
        ...(['linux', 'darwin', 'win32'].includes(process.platform) ? [`cli/os/${process.platform}`] : []),
        `cli/files/${bucket(Math.max(results.length, 1))}`,
        `cli/result/${outcome}`,
        `cli/format/${options.format}`,
        ...optionNames.map(o => `cli/option/${o}`),
        `cli/ci/${ciName(env)}`
    ];
    const codes = [...new Set(all.map(d => d.code))].map(c => `cli/diag/${c}`);
    return [...events, ...codes].slice(0, MAX_EVENTS);
}

// DO_NOT_TRACK always wins; otherwise only an explicit opt-in counts.
function telemetryMode(options, env) {
    if (env.DO_NOT_TRACK && env.DO_NOT_TRACK !== '0') {
        return 'off';
    }

    if (env.JCLCHECK_TELEMETRY === 'debug') {
        return 'debug';
    }

    return options.telemetry || env.JCLCHECK_TELEMETRY === '1' ? 'on' : 'off';
}

async function sendUsage(events, env, fetchImpl) {
    try {
        await fetchImpl(`${env.JCLCHECK_API || DEFAULT_API}/api/usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
            signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS)
        });
    } catch {
        // Counting must never change what the user sees.
    }
}

// jclcheck format: prints one formatted file, or rewrites files with --write.
function runFormat(argv, { cwd, stdout, stderr }) {
    let parsed;
    try {
        parsed = parseArgs({ args: argv, allowPositionals: true, options: { write: { type: 'boolean' } } });
    } catch (err) {
        stderr(`jclcheck: ${err.message}\n\n${USAGE}\n`);
        return 2;
    }

    const files = expand(parsed.positionals, cwd);
    if (!files.length || (files.length > 1 && !parsed.values.write)) {
        stderr(`jclcheck format: give one file, or use --write to format several in place.\n`);
        return 2;
    }

    let code = 0;
    for (const file of files) {
        const full = path.resolve(cwd, file);
        let source;
        try {
            source = fs.readFileSync(full, 'utf8');
        } catch (err) {
            stderr(`jclcheck: can't read ${file}: ${err.code === 'ENOENT' ? 'no such file' : err.message}\n`);
            code = 2;
            continue;
        }

        const result = format(source);
        for (const note of result.notes) {
            stderr(`${file}:${note.line}  ${note.message}\n`);
        }

        if (result.refused) {
            stderr(`${file}: ${result.refused}\n`);
            code = Math.max(code, 1);
        }

        if (!parsed.values.write) {
            stdout(result.text);
        } else if (result.text !== source) {
            fs.writeFileSync(full, result.text);
            stderr(`formatted ${file}\n`);
        }
    }

    return code;
}

/**
 * Runs the command. Returns the exit code; output goes to `stdout`/`stderr`.
 * @param {string[]} argv the arguments after the command name
 */
async function run(argv, {
    env = process.env,
    cwd = process.cwd(),
    stdout = text => process.stdout.write(text),
    stderr = text => process.stderr.write(text),
    fetchImpl = globalThis.fetch
} = {}) {
    if (argv[0] === 'format') {
        return runFormat(argv.slice(1), { cwd, stdout, stderr });
    }

    let options;
    try {
        options = readOptions(argv);
    } catch (err) {
        stderr(`jclcheck: ${err.message}\n\n${USAGE}\n`);
        return 2;
    }

    if (options.help) {
        stdout(`${USAGE}\n`);
        return 0;
    }

    if (!options.patterns.length) {
        stderr(`${USAGE}\n`);
        return 2;
    }

    let library = [];
    let profile = null;
    try {
        library = options.library ? readLibrary(path.resolve(cwd, options.library)) : [];
        profile = options.profile ? readProfile(path.resolve(cwd, options.profile)) : null;
    } catch (err) {
        stderr(`jclcheck: ${err instanceof UsageError ? err.message : `Can't read the library ${options.library}: ${err.message}`}\n`);
        return 2;
    }

    const files = expand(options.patterns, cwd);
    const results = [];
    let failed = false;
    for (const file of files) {
        let source;
        try {
            source = fs.readFileSync(path.resolve(cwd, file), 'utf8');
        } catch (err) {
            stderr(`jclcheck: can't read ${file}: ${err.code === 'ENOENT' ? 'no such file' : err.message}\n`);
            failed = true;
            continue;
        }

        results.push({ file, result: validate(source, { zosLevel: options.zos, jes: options.jes, library, profile }) });
    }

    if (options.format === 'json') {
        stdout(`${JSON.stringify({ files: results.map(({ file, result }) => ({ file, diagnostics: result.diagnostics, stats: result.stats })) }, null, 2)}\n`);
    } else if (options.format === 'sarif') {
        stdout(`${JSON.stringify(sarifReport(results), null, 2)}\n`);
    } else {
        const lines = textReport(results);
        if (lines.length) {
            stdout(`${lines.join('\n')}\n`);
        }
    }

    const errors = results.reduce((n, r) => n + r.result.stats.errors, 0);
    const warnings = results.reduce((n, r) => n + r.result.stats.warnings, 0);
    if (options.format === 'text' && (errors || warnings)) {
        stderr(`${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'} in ${results.length} file${results.length === 1 ? '' : 's'}\n`);
    }

    const tooManyWarnings = options.maxWarnings !== null && warnings > options.maxWarnings;
    if (tooManyWarnings) {
        stderr(`jclcheck: ${warnings} warnings, more than --max-warnings ${options.maxWarnings}\n`);
    }

    const mode = telemetryMode(options, env);
    if (mode !== 'off') {
        const events = usageEvents(options, results, env);
        if (mode === 'debug') {
            stderr(`jclcheck telemetry (debug, nothing sent):\n${events.map(e => `  ${e}`).join('\n')}\n`);
        } else {
            await sendUsage(events, env, fetchImpl);
        }
    }

    if (failed) {
        return 2;
    }

    return errors > 0 || tooManyWarnings ? 1 : 0;
}

module.exports = { run, sarifReport, usageEvents, glob };
