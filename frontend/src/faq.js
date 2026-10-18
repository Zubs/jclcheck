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
        a: 'Yes — it was built for exactly that. Every finding includes a plain-English explanation and a suggested fix instead of just an abend code, so you learn the syntax as you go.'
    },
    {
        q: 'Does JCLcheck track me or keep my JCL?',
        a: 'Your JCL is sent to the JCLcheck API to be checked, and is never stored or counted. The site counts anonymous usage with GoatCounter, with no cookies and no personal data: pages visited, where visits come from, browser, device size and country, which features are used, and which error codes appear. If your browser sends Do Not Track or Global Privacy Control, nothing is counted at all.'
    }
];
