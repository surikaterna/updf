export function smokeFixture(entry: string, deepPrefix: string): string {
  return `
const assert = require('assert');
const crypto = require('crypto');
const loaded = require(${JSON.stringify(entry)});
assert.equal(typeof loaded, 'object');
assert.equal(loaded.__esModule, true);
assert.equal(typeof loaded.default, 'function');
const a4 = require(${JSON.stringify(`${deepPrefix}/boxes/a4`)}).default;
const Stream = require(${JSON.stringify(`${deepPrefix}/stream`)}).default;
assert.deepEqual(a4, [0, 0, 595.28, 841.89]);
assert.equal(typeof Stream, 'function');
const doc = new loaded.default();
doc.addPage();
assert.ok(doc.currentPage().object.Contents.object instanceof Stream);
doc.currentPage().object.Contents.object.append('BT /G 12 Tf 40 800 Td (Legacy smoke) Tj ET');
const out = [];
doc.write(chunk => out.push(chunk));
const bytes = Buffer.from(out.join(''), 'ascii');
assert.ok(bytes.toString('ascii').startsWith('%PDF-'));
console.log(JSON.stringify({ bytes: bytes.length,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  exportKeys: Object.keys(loaded), defaultCommonJS: true }));
`;
}
