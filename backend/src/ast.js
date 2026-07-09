// ast.js — plain-object AST node "constructors". Kept as factory functions
// (not classes) so the tree serializes cleanly to JSON for the frontend.

function JobNode(name, line) {
  return { type: 'Job', name, line, params: [], steps: [], procs: [], statements: [] };
}

function StepNode(name, opType, line) {
  // opType: 'EXEC'
  return { type: 'Step', name, line, params: [], dds: [], calledProc: null };
}

function DDNode(name, line) {
  return { type: 'DD', name, line, params: [] };
}

function ProcNode(name, line) {
  return { type: 'Proc', name, line, params: [], steps: [], endLine: null };
}

function IfNode(condition, line) {
  return { type: 'If', condition, line, thenBranch: [], elseBranch: [], endLine: null };
}

function IncludeNode(member, line) {
  return { type: 'Include', member, line };
}

function SetNode(assignments, line) {
  return { type: 'Set', assignments, line };
}

module.exports = { JobNode, StepNode, DDNode, ProcNode, IfNode, IncludeNode, SetNode };
