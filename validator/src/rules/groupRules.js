// Checks JES2 job groups built by the parser: keywords, job names, the jobs
// named by AFTER/BEFORE/CONCURRENT, their WHEN conditions, and dependency loops.

const { makeDiagnostic } = require('../errors');
const { GROUP_KEYWORDS } = require('../keywords');
const { checkKeywords, checkWhen, checkName, checkRuleValue } = require('./paramRules');

// The first dependency loop, as a list of job names ending where it started.
// Edges run from the job that must finish first to the job that waits.
function findCycle(jobs) {
    const edges = new Map(jobs.map(j => [j.name.toUpperCase(), []]));
    for (const job of jobs) {
        for (const dep of job.deps) {
            const target = dep.params.find(p => p.kind === 'keyword' && p.key === 'NAME');
            for (const name of target && dep.type !== 'CONCURRENT' ? target.subvalues || [target.value] : []) {
                const other = name.toUpperCase();
                if (edges.has(other)) {
                    const [from, to] = dep.type === 'AFTER' ? [other, job.name.toUpperCase()] : [job.name.toUpperCase(), other];
                    edges.get(from).push(to);
                }
            }
        }
    }

    const state = new Map(); // undefined: unseen, 1: on the path, 2: done
    const path = [];
    const visit = node => {
        state.set(node, 1);
        path.push(node);
        for (const next of edges.get(node)) {
            if (state.get(next) === 1) {
                return [...path.slice(path.indexOf(next)), next];
            }

            if (!state.has(next)) {
                const found = visit(next);
                if (found) {
                    return found;
                }
            }
        }

        path.pop();
        state.set(node, 2);
        return null;
    };

    for (const node of edges.keys()) {
        const found = !state.has(node) && visit(node);
        if (found) {
            return found;
        }
    }

    return null;
}

// Keywords and the values of those with a fixed set of them.
function checkStatement(node, type, diagnostics, zosLevel) {
    checkKeywords(node.params, GROUP_KEYWORDS[type], type, node.line, diagnostics, zosLevel);
    for (const p of node.params.filter(q => q.kind === 'keyword')) {
        checkRuleValue(p, GROUP_KEYWORDS[type], node.line, diagnostics);
    }
}

// A job group's conditions document ! as NOT, as well as ¬ and NOT.
function checkCondition(node, key, diagnostics) {
    checkWhen(node.params.find(p => p.kind === 'keyword' && p.key === key), node.line, diagnostics, { bangIsNot: true });
}

function checkGroup(group, diagnostics, zosLevel) {
    checkStatement(group, 'JOBGROUP', diagnostics, zosLevel);
    checkCondition(group, 'ERROR', diagnostics);
    for (const set of group.sets) {
        checkStatement(set, 'JOBSET', diagnostics, zosLevel);
    }

    const named = group.jobs.filter(j => j.name);
    const names = named.map(j => j.name.toUpperCase());
    const seen = new Set();
    for (const job of group.jobs) {
        checkName(job.name, job.type, job.line, diagnostics);
        checkStatement(job, job.type, diagnostics, zosLevel);
        const key = (job.name || '').toUpperCase();
        if (key && seen.has(key)) {
            diagnostics.push(makeDiagnostic('JCLG004', { name: job.name, group: group.name }, { line: job.line, column: 3 }));
        }

        seen.add(key);
        for (const dep of job.deps) {
            checkStatement(dep, dep.type, diagnostics, zosLevel);
            // NAME= takes one name or a list of up to 10.
            const target = dep.params.find(p => p.kind === 'keyword' && p.key === 'NAME');
            for (const name of target ? target.subvalues || [target.value] : []) {
                if (!names.includes(name.toUpperCase())) {
                    diagnostics.push(makeDiagnostic(
                        'JCLG008',
                        { name, group: group.name, jobs: named.map(j => j.name) },
                        { line: target.valueLine ?? dep.line, column: target.valueCol }
                    ));
                }
            }

            checkCondition(dep, 'WHEN', diagnostics);
        }
    }

    const cycle = findCycle(named);
    if (cycle) {
        diagnostics.push(makeDiagnostic('JCLG009', { group: group.name, cycle }, { line: group.line, column: 1 }));
    }
}

function checkJobGroups(jobGroups, jobs, diagnostics, { zosLevel } = {}) {
    for (const group of jobGroups) {
        checkGroup(group, diagnostics, zosLevel);
    }

    for (const job of jobs.filter(j => j.schedule)) {
        checkStatement(job.schedule, 'SCHEDULE', diagnostics, zosLevel);
    }
}

module.exports = { checkJobGroups, findCycle };
