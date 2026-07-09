// test/run.js
const fs = require('fs');
const path = require('path');
const { validate } = require('../src/validator');

function run(file) {
  const source = fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8');
  console.log(`\n===== ${file} =====`);
  const result = validate(source);
  console.log('stats:', result.stats);
  for (const d of result.diagnostics) {
    console.log(`  [${d.severity.toUpperCase()}] L${d.line}:${d.column} ${d.code} - ${d.message}${d.suggestion ? '  (fix: ' + d.suggestion + ')' : ''}`);
  }
  return result;
}

run('valid.jcl');
run('broken.jcl');
run('proc.jcl');
