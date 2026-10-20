#!/usr/bin/env node
// Entry point for the jclcheck command (see src/cli.js).

const { run } = require('../src/cli');

run(process.argv.slice(2)).then(code => {
    process.exitCode = code;
}, err => {
    process.stderr.write(`jclcheck: ${err.stack || err.message}\n`);
    process.exitCode = 2;
});
