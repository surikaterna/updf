import assert from "node:assert/strict";
import test from "node:test";
import { hex, literal, name, value } from "../dist/core/pdf-values.js";
import { type PdfDictionary, PdfWriter } from "../dist/core/pdf-writer.js";

const raw = (bytes: Uint8Array) => Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

test("typed values escape syntax and snapshot nested structures", () => {
  const writer = new PdfWriter();
  const items = [1e-7, true, null, hex("00fF"), literal("a\n\0\\()")];
  const dictionary = { "a /#\xff": name("b /#\xff"), Items: items };
  const root = writer.add(dictionary);
  items[0] = 99;
  dictionary["a /#\xff"] = name("changed");
  const output = raw(writer.seal(root));
  assert.ok(output.includes("/a#20#2F#23#FF /b#20#2F#23#FF"));
  assert.ok(output.includes("/Items [0.0000001 true null <00fF> (a\\012\\000\\\\\\(\\))]"));
});

test("forward refs are owned, defined once, resolved at seal and unusable afterward", () => {
  const writer = new PdfWriter();
  const root = writer.reserve();
  const child = writer.reserve();
  writer.define(root, { Child: child });
  assert.throws(() => writer.seal(root), /Unresolved/);
  const foreign = new PdfWriter().reserve();
  assert.throws(() => writer.define(child, { Foreign: foreign }), /Foreign/);
  assert.throws(() => writer.define(foreign, null), /Foreign/);
  writer.define(child, null);
  assert.throws(() => writer.define(child, null), /Duplicate/);
  assert.ok(raw(writer.seal(root)).includes("/Child 2 0 R"));
  assert.throws(() => writer.reserve(), /sealed/);
  assert.throws(() => writer.define(root, null), /sealed/);
  assert.throws(() => writer.defineStream(root, []), /sealed/);
  assert.throws(() => writer.seal(root), /sealed/);
});

test("ordinary kind keys remain dictionaries directly, nested, in arrays and in stream metadata", () => {
  const dictionaries: PdfDictionary[] = [
    { kind: 1, Other: true },
    ...["name", "literal", "hex"].map((tag) => ({ kind: literal(tag), value: literal("ordinary") })),
  ];
  const expected = [
    "<< /kind 1 /Other true >>",
    ...["name", "literal", "hex"].map((tag) => `<< /kind (${tag}) /value (ordinary) >>`),
  ];
  dictionaries.forEach((dictionary, index) => {
    const writer = new PdfWriter();
    const root = writer.add(dictionary);
    writer.add({ Nested: dictionary, Items: [dictionary] });
    writer.defineStream(writer.reserve(), [], dictionary);
    const output = raw(writer.seal(root));
    assert.ok(output.includes(`1 0 obj\n${expected[index]}\nendobj`));
    assert.ok(output.includes(`/Nested ${expected[index]} /Items [${expected[index]}]`));
    assert.ok(output.includes(`${expected[index]?.replace("<<", "<< /Length 0")}\nstream\nendstream`));
  });
});

test("malformed branded scalars and unbranded scalar lookalikes are rejected", () => {
  const brand = Object.getOwnPropertySymbols(name("test"))[0];
  assert.ok(brand);
  assert.throws(() => new PdfWriter().add({ [brand]: "unknown", value: "test" } as never), /Invalid/);
  for (const scalar of [name("test"), literal("test"), hex("00")]) {
    assert.throws(() => new PdfWriter().add({ ...scalar, value: 1 } as never), /Invalid/);
  }
  assert.throws(() => value({ kind: "name", value: "test" } as never), /Invalid/);
});

test("invalid finite values, raw syntax, cyclic and excessive nesting are rejected", () => {
  for (const number of [NaN, Infinity, -Infinity]) assert.throws(() => new PdfWriter().add(number), /Nonfinite/);
  assert.throws(() => new PdfWriter().add(hex("abc")), /hex/);
  assert.throws(() => new PdfWriter().add(literal("😀")), /bytes/);
  assert.throws(() => new PdfWriter().add("<< /Raw true >>" as never), /Invalid/);
  const cycle: PdfDictionary = {};
  Object.assign(cycle, { cycle });
  assert.throws(() => new PdfWriter().add(cycle), /Cyclic/);
  let nested: PdfDictionary = {};
  for (let i = 0; i < 65; i++) nested = { nested };
  assert.throws(() => new PdfWriter().add(nested), /deeply/);
});

function binaryDocument(maximum?: number): Uint8Array {
  const writer = new PdfWriter(maximum);
  const root = writer.reserve();
  const stream = writer.reserve();
  writer.define(root, { Payload: stream });
  const bytes = new Uint8Array([0, 255, 10, 13, 128]);
  writer.defineStream(stream, [bytes, "endstream\n"], { FilterName: name("test") });
  bytes.fill(42);
  return writer.seal(root);
}

test("binary length, exact whole-output budget, xref offsets and deterministic allocation", () => {
  const bytes = binaryDocument();
  assert.deepEqual(binaryDocument(), bytes);
  assert.deepEqual(binaryDocument(bytes.length), bytes);
  assert.throws(() => binaryDocument(bytes.length - 1), /output bytes/);
  const output = raw(bytes);
  assert.ok(output.includes("/Length 15 /FilterName /test >>\nstream\n\0\xff\n\r\x80endstream\nendstream"));
  const start = Number(output.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(output.slice(start, start + 4), "xref");
  [...output.matchAll(/^(\d{10}) 00000 n /gm)].forEach((entry, i) => {
    assert.ok(output.slice(Number(entry[1])).startsWith(`${i + 1} 0 obj\n`));
  });
});

test("streams cannot override structural length or leak mutable dictionary data", () => {
  const writer = new PdfWriter();
  const root = writer.reserve();
  assert.throws(() => writer.defineStream(root, [], { Length: 99 }), /overridden/);
  assert.throws(() => writer.defineStream(root, ["😀"]), /bytes/);
  const dictionary = { Label: literal("original") };
  writer.defineStream(root, ["abc\n"], dictionary);
  dictionary.Label = literal("mutated");
  const bytes = writer.seal(root);
  assert.ok(raw(bytes).includes("/Label (original)"));
  bytes.fill(0);
  assert.ok(raw(binaryDocument()).startsWith("%PDF"));
});

test("stream budget rejection precedes binary snapshot access", () => {
  const writer = new PdfWriter(300);
  const root = writer.reserve();
  let copies = 0;
  const bytes = new Proxy(new Uint8Array(1024), {
    get(target, key) {
      if (key === Symbol.iterator) copies++;
      return Reflect.get(target, key, target);
    },
  });
  assert.throws(() => writer.defineStream(root, [bytes]), /output bytes/);
  assert.equal(copies, 0);
  writer.define(root, null);
  assert.ok(writer.seal(root).length <= 300);
});

test("root references need not be object one and many opaque chunks avoid argument limits", () => {
  const writer = new PdfWriter();
  writer.add(null);
  const root = writer.reserve();
  writer.defineStream(root, Array<string>(150000).fill("x"));
  const output = raw(writer.seal(root));
  assert.ok(output.includes("/Root 2 0 R"));
  assert.ok(output.includes("/Length 150000 >>"));
});
