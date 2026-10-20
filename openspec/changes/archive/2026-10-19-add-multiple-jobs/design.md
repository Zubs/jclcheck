# Design

## Context

`parser.parse` returns `{ job, procs }`, reports `JCLO004` for a second JOB and ignores `NULL` entries. `validator.validate` runs `runProcRules(job, procs)`, `checkAllParams(job)` and `checkDDStatements(job)` once, and checks every PROC body. `JobNode` already has a `procs` array.

## Decisions

1. **Parser state.** `jobs = []`, `job` = the current job. On JOB: push a new `JobNode`, attach any PROCs collected before the first job to it. On `NULL`: `job = null; ended = true`. A `STMT` other than JOB while `ended` gets `JCLO007` (at the operation column) and is skipped, so its contents can't leak into another job. PROC statements add the PROC to `procs` and to the current job's `procs` (or the pre-job list).
2. **Validator loops jobs.** For each job: resolve its PROC calls against `job.procs`, check DD overrides, `checkAllParams`, `checkDDStatements`. Symbolic parameters and PROC bodies are checked once for all PROCs. `procRules` exports the pieces; `runProcRules` is replaced by per-job calls.
3. **JES placement per job.** "Before the JOB statement" means the next JCL statement is a JOB; "after the JOB statement" means a JOB came earlier; JES3 "before the first EXEC" resets at every JOB.
4. **Stats.** `jobCount = jobs.length`, `stepCount` sums job steps.
5. **Catalog.** `JCLO004` is removed; `JCLO007` added. `JCLO005`/`JCLO006` stay reserved for features 11 and 22.

## Risks / Trade-offs

- [API consumers reading `ast.job` break] → Noted in README and Spec.md; the only known consumer (the workbench) doesn't read it.
