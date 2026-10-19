// plain-object AST node "constructors". Kept as factory functions
// (not classes) so the tree serializes cleanly to JSON for the frontend.

function JobNode(name, line) {
    return {
        type: 'Job',
        name,
        line,
        params: [],
        steps: [],
        procs: [],
        ifs: [],
        notifies: [],
        statements: []
    };
}

function StepNode(
    name,
    opType,
    line
) {
    // opType: 'EXEC'
    return {
        type: 'Step',
        name,
        line,
        params: [],
        dds: [],
        calledProc: null
    };
}

function DDNode(name, line) {
    return {
        type: 'DD',
        name,
        line,
        params: []
    };
}

function ProcNode(name, line) {
    return {
        type: 'Proc',
        name,
        line,
        params: [],
        steps: [],
        ifs: [],
        endLine: null
    };
}

function IfNode(condition, line) {
    return {
        type: 'If',
        condition,
        line,
        thenBranch: [], // { name, line } of each step inside, nested IFs included
        elseBranch: [],
        sawElse: false,
        refs: [], // step references in the condition
        earlierSteps: [], // names of the steps written before this IF
        endLine: null
    };
}

function IncludeNode(member, line) {
    return {
        type: 'Include',
        member,
        line
    };
}

function SetNode(assignments, line) {
    return {
        type: 'Set',
        assignments,
        line
    };
}

module.exports = {
    JobNode,
    StepNode,
    DDNode,
    ProcNode,
    IfNode,
    IncludeNode,
    SetNode
};
