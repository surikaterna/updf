// Generated only inside the disposable legacy copy: Babel 6/Mocha 2 use require.
export const focusHarness = `
const fs = require('fs');
const path = require('path');
const Mocha = require('mocha');
require('babel-register');
const mocha = new Mocha({ reporter: 'spec' });
mocha.suite.on('pre-require', context => {
  context.it.only = context.it;
  context.describe.only = context.describe;
});
function visit(dir) {
  fs.readdirSync(dir).sort().forEach(name => {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) visit(file);
    else if (name.endsWith('.js')) mocha.addFile(file);
  });
}
visit(path.resolve('test'));
const result = { passed: [], pending: [], failed: [] };
const runner = mocha.run(failures => {
  fs.writeFileSync('full-result.json', JSON.stringify(result, null, 2) + '\\n');
  process.exitCode = failures ? 1 : 0;
});
runner.on('pass', test => result.passed.push(test.fullTitle()));
runner.on('pending', test => result.pending.push(test.fullTitle()));
runner.on('fail', (test, error) => result.failed.push({
  title: test.fullTitle(), name: error.name, message: error.message
}));
`;
