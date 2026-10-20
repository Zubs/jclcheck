export const LANDING_FAQ = [
    {
        q: 'Is there a free JCL checker online?',
        a: 'Yes — JCLcheck is free to use. Paste your JCL into the workbench and it is sent to the JCLcheck API, which runs it through the lexer, parser and rule engine described on this page and sends back every problem it finds. Nothing is stored on the server.'
    },
    {
        q: 'How do I validate JCL without a mainframe?',
        a: 'JCLcheck re-implements the parts of the IBM JCL Reference needed to catch structural and syntax problems — statement ordering, DD rules, keyword legality, PROC symbolics — without needing z/OS, TSO, or a green screen.'
    },
    {
        q: 'What does an online JCL check actually validate?',
        a: 'Columns and continuations as z/OS reads them, statement order, several jobs per stream, JCLLIB and NOTIFY placement, IF/THEN/ELSE conditions, DD data sources (including PATH and in-stream data with DLM=), keywords and their values against your chosen z/OS level, JES2 and JES3 control statements, job groups, and PROCs and INCLUDE members, including catalogued ones you paste into the Library panel.'
    },
    {
        q: 'Is this suitable for beginners learning JCL?',
        a: 'Yes — it was built for exactly that. Every finding includes a plain-English explanation and a suggested fix instead of just an abend code, so you learn the syntax as you go.'
    },
    {
        q: 'Does JCLcheck track me or keep my JCL?',
        a: 'Your JCL is sent to the JCLcheck API to be checked, and is never stored or counted there. Your draft stays in your own browser, and a shared link carries the JCL inside the link itself. The site counts anonymous usage with GoatCounter, with no cookies and no personal data: pages visited, where visits come from, browser, device size and country, which features are used, and which error codes appear. If your browser sends Do Not Track or Global Privacy Control, nothing is counted at all.'
    }
];
