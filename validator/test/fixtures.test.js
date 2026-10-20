// Checks every `.jcl` fixture under test/fixtures/ against its
// `.expected.json` file. See test/helpers/fixtureTests.js for the todo rules.

const path = require('node:path');
const { registerFixtureTests } = require('./helpers/fixtureTests');

registerFixtureTests(path.join(__dirname, 'fixtures'));
