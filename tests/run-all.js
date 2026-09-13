/**
 * Test runner script executing all test suites using Node.js's built-in test runner.
 */

const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const path = require('node:path');

const testFiles = [
  path.join(__dirname, 'document', 'document.test.js'),
  path.join(__dirname, 'agent', 'agent.test.js'),
  path.join(__dirname, 'browser', 'browser.test.js'),
  path.join(__dirname, 'browser', 'actions.test.js'),
  path.join(__dirname, 'integration', 'workflow.test.js'),
  path.join(__dirname, 'integration', 'fixture-dryrun.test.js'),
  path.join(__dirname, 'integration', 'real-portal.test.js'),
];

console.log('Running test suites:\n' + testFiles.map((f) => ` - ${path.relative(__dirname, f)}`).join('\n') + '\n');

run({
  files: testFiles,
})
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .compose(new spec())
  .pipe(process.stdout);
