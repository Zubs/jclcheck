// Checks the step references in IF conditions, after PROC calls are resolved:
// each step must come earlier in the same job or PROC, and a procedure step
// must exist in the in-stream PROC that step calls.

const { makeDiagnostic } = require('../errors');

function checkIfReferences(container, where, diagnostics) {
    const stepsByName = new Map(container.steps.filter(s => s.name).map(s => [s.name.toUpperCase(), s]));
    for (const node of container.ifs || []) {
        const earlier = new Set(node.earlierSteps.map(n => n.toUpperCase()));
        for (const ref of node.refs) {
            const at = { line: ref.line, column: ref.col };
            if (!earlier.has(ref.step.toUpperCase())) {
                diagnostics.push(makeDiagnostic('JCLC004', { step: ref.step, where }, at));
                continue;
            }

            const proc = stepsByName.get(ref.step.toUpperCase()).resolvedProc;
            if (ref.procstep && proc && !proc.steps.some(s => (s.name || '').toUpperCase() === ref.procstep.toUpperCase())) {
                diagnostics.push(makeDiagnostic('JCLC005', { step: ref.step, procstep: ref.procstep, proc: proc.name }, at));
            }
        }
    }
}

module.exports = { checkIfReferences };
