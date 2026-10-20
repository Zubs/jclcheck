# jclcheck

Check z/OS JCL without a mainframe. `jclcheck` reads JCL the way z/OS does
(80-column records, continuations, in-stream data, JES2 and JES3 statements)
and reports each problem with its line and column, a code, a plain-English
explanation and a suggested fix. It is the engine behind
[jclcheck.xyz](https://jclcheck.xyz), and it has no dependencies.

It is static checking only: nothing is run, and datasets and catalogued
procedures can't be confirmed to exist unless you supply the procedures.

## Command line

Node 22 or later.

```bash
npx jclcheck jcl/*.jcl                       # file:line:column  severity  code  message
npx jclcheck "jcl/**/*.jcl" --format sarif > jclcheck.sarif
npx jclcheck format jcl/payroll.jcl          # print it laid out in the usual columns
npx jclcheck format --write jcl/*.jcl        # or rewrite the files
```

| Option | What it does |
|---|---|
| `--zos <level>` | The z/OS level to check against: 2.3, 2.4, 2.5, 3.1 or 3.2 (the default). |
| `--jes <JES2\|JES3>` | The JES to check for (JES3 only at z/OS 2.5 and earlier). |
| `--library <dir>` | Catalogued PROCs and INCLUDE members, one file per member (`MYPROC.jcl`). A subdirectory named like a library (`MY.PROCS.JCL/`) is that library, searched in the job's JCLLIB order. |
| `--profile <file>` | A site profile, as JSON (below). |
| `--format text\|json\|sarif` | Text (the default), JSON (`{ files: [{ file, diagnostics, stats }] }`) or SARIF 2.1.0. |
| `--max-warnings <n>` | Also fail when there are more warnings than this. |

It exits with 0 when there are no errors, 1 when a file has an error or there
are too many warnings, and 2 when it can't run (a bad option, or a file it
can't read; the other files are still checked). Quoted globs (`*`, `**`, `?`)
are expanded by the command itself.

### GitHub Actions

Each diagnostic shows on its line of the pull request:

```yaml
name: JCL
on: [pull_request]
jobs:
  jclcheck:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx jclcheck "jcl/**/*.jcl" --format sarif > jclcheck.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: jclcheck.sarif
```

## In your own code

```js
const { validate, format } = require('jclcheck');

const result = validate(source, { zosLevel: '3.1', jes: 'JES2' });
for (const d of result.diagnostics) {
    console.log(`${d.line}:${d.column} ${d.severity} ${d.code} ${d.message}`);
}
console.log(result.stats.valid); // true when there are no errors

const { text, changed, notes, refused } = format(source);
```

`validate(source, options)` takes `zosLevel`, `jes`, `library` (a list of
`{ dsn, member, source }` catalogued procedures and INCLUDE members) and
`profile`. It returns `{ diagnostics, ast, datasets, stats, zosLevel, jes }`.
Each diagnostic has `code`, `severity` (`error`, `warning` or `info`), `line`,
`column`, `length`, `message`, `suggestion` and `source`, plus `member` when it
is inside a library member and `suppressed: true` when a comment hid it.

The package also exports `keywordHelp(zosLevel)` (plain-English descriptions of
every keyword), `profileProblem(profile)` and the supported levels
(`ZOS_LEVELS`, `DEFAULT_ZOS_LEVEL`, `isZosLevel`, ...).

## Suppressions and site profile

`//* JCLCHECK OFF-NEXT JCLK001` hides that code on the next statement, and
`//* JCLCHECK OFF JCLK001` hides it until `//* JCLCHECK ON JCLK001` or the end
of the job. They are JCL comments, so the job still runs unchanged. A site
profile adds your shop's rules:

```json
{
  "names": { "job": ["AR*"], "step": "STEP%%" },
  "allowed": { "CLASS": ["A", "B"] },
  "dsnPrefixes": ["AR", "SYS1"],
  "extraKeywords": { "EXEC": ["LOCALKW"] },
  "severity": { "JCLS014": "off", "JCLK001": "error" }
}
```

## Usage counting

Off unless you opt in with `JCLCHECK_TELEMETRY=1` or `--telemetry`, and
`DO_NOT_TRACK=1` always turns it off. An opted-in run sends one small list of
events (version, Node major version, OS, CI system, number of files, result,
format, options used and diagnostic codes, never any JCL or file names), with
a 1-second limit. `JCLCHECK_TELEMETRY=debug` prints the list and sends nothing.

## Links

- Workbench: https://jclcheck.xyz
- Source and issues: https://github.com/Zubs/jclcheck

MIT licensed.
