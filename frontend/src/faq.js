export const LANDING_FAQ = [
    {
        q: 'Is there a free JCL checker online?',
        a: 'Yes — JCLcheck is free to use. Paste your JCL into the workbench and it runs through the same lexer, parser and rule-engine pipeline described on this page, right in your browser.'
    },
    {
        q: 'How do I validate JCL without a mainframe?',
        a: 'JCLcheck re-implements the parts of the IBM JCL Reference needed to catch structural and syntax problems — statement ordering, DD rules, keyword legality, PROC symbolics — without needing z/OS, TSO, or a green screen.'
    },
    {
        q: 'What does an online JCL check actually validate?',
        a: 'Statement order (JOB/EXEC/DD), duplicate DD names, missing or conflicting data sources, unrecognized keywords, DISP/SPACE/DCB/REGION/TIME/DSN syntax, and in-stream PROC resolution with symbolic parameters.'
    },
    {
        q: 'Is this suitable for beginners learning JCL?',
        a: "Yes — it was built for exactly that. Every finding includes a plain-English explanation and a suggested fix instead of just an abend code, so you learn the syntax as you go."
    }
];
