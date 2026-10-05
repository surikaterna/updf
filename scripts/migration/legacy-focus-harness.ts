// Only the historical suite/test declarations and done callbacks are adapted.
// Assertions and fixtures execute unchanged in a disposable CommonJS copy.
export const focusHarness = `
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const definitions = [];
const titles = [];
let pending = false;
global.describe = (title, body) => {
  titles.push(title);
  body();
  titles.pop();
};
global.xdescribe = (title, body) => {
  const previous = pending;
  pending = true;
  global.describe(title, body);
  pending = previous;
};
global.it = (title, body) => definitions.push({ title: [...titles, title].join(' '), body, pending });
global.it.only = (title, body) => {
  global.it(title, body);
  definitions.at(-1).only = true;
};
function visit(dir) {
  fs.readdirSync(dir).sort().forEach(name => {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) visit(file);
    else if (name.endsWith('.js')) require(file);
  });
}
visit(path.resolve('test'));
const focused = !process.env.UPDF_LEGACY_FULL && definitions.some(item => item.only);
function invoke(body, done) {
  try { return body(done); }
  catch (error) {
    // Historical should errors have lazy fields lost by Node's IPC serialization.
    const transferable = new Error(error.message);
    transferable.name = error.name;
    throw transferable;
  }
}
for (const item of definitions.filter(item => !focused || item.only)) {
  const options = { skip: item.pending, timeout: 2000 };
  if (item.body.length) test(item.title, options, (_context, done) => invoke(item.body, done));
  else test(item.title, options, () => invoke(item.body));
}
`;

export const legacyReporter = `
const fs = require('fs');
module.exports = async function* (events) {
  const result = { passed: [], pending: [], failed: [] };
  for await (const event of events) {
    const { type, data } = event;
    if (type === 'test:stdout' || type === 'test:stderr') yield data.message;
    if (type === 'test:pass') {
      result[data.skip ? 'pending' : 'passed'].push(data.name);
    }
    if (type === 'test:fail') {
      const error = data.details.error.cause || data.details.error;
      result.failed.push({ title: data.name, name: error.name, message: error.message });
    }
    if (type === 'test:pass' || type === 'test:fail') {
      const label = type === 'test:pass' && data.skip ? 'test:skip' : type;
      yield label + ': ' + data.name + '\\n';
    }
  }
  fs.writeFileSync('full-result.json', JSON.stringify(result, null, 2) + '\\n');
};
`;
