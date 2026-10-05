import assert from "node:assert/strict";
import test from "node:test";
import { hex, literal, name, value } from "../dist/core/pdf-values.js";
import { type PdfDictionary, PdfWriter } from "../dist/core/pdf-writer.js";

const raw = (bytes: Uint8Array) => Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

function rootedWriter(maximum?: number) {
  const writer = new PdfWriter(maximum);
  const root = writer.reserve();
  writer.setRoot(root);
  return { writer, root };
}

test("typed values escape syntax and snapshot nested structures", () => {
  const { writer, root } = rootedWriter();
  const items = [1e-7, true, null, hex("00fF"), literal("a\n\0\\()")];
  const dictionary = { "a /#\xff": name("b /#\xff"), Items: items };
  writer.define(root, dictionary);
  items[0] = 99;
  dictionary["a /#\xff"] = name("changed");
  const output = raw(writer.seal());
  assert.ok(output.includes("/a#20#2F#23#FF /b#20#2F#23#FF"));
  assert.ok(output.includes("/Items [0.0000001 true null <00fF> (a\\012\\000\\\\\\(\\))]"));
});

test("forward refs are owned, defined once, resolved at seal and unusable afterward", () => {
  const { writer, root } = rootedWriter();
  const child = writer.reserve();
  writer.define(root, { Child: child });
  assert.throws(() => writer.seal(), /Unresolved/);
  const foreign = new PdfWriter().reserve();
  assert.throws(() => writer.define(child, { Foreign: foreign }), /Foreign/);
  assert.throws(() => writer.define(foreign, null), /Foreign/);
  writer.define(child, null);
  assert.throws(() => writer.define(child, null), /Duplicate/);
  assert.ok(raw(writer.seal()).includes("/Child 2 0 R"));
  assert.throws(() => writer.reserve(), /sealed/);
  assert.throws(() => writer.define(root, null), /sealed/);
  assert.throws(() => writer.defineStream(root, []), /sealed/);
  assert.throws(() => writer.seal(), /sealed/);
  assert.throws(() => writer.setRoot(root), /sealed/);
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
    const { writer, root } = rootedWriter();
    writer.define(root, dictionary);
    writer.add({ Nested: dictionary, Items: [dictionary] });
    writer.defineStream(writer.reserve(), [], dictionary);
    const output = raw(writer.seal());
    assert.ok(output.includes(`1 0 obj\n${expected[index]}\nendobj`));
    assert.ok(output.includes(`/Nested ${expected[index]} /Items [${expected[index]}]`));
    assert.ok(output.includes(`${expected[index]?.replace("<<", "<< /Length 0")}\nstream\nendstream`));
  });
});

test("malformed branded scalars and unbranded scalar lookalikes are rejected", () => {
  const brand = Object.getOwnPropertySymbols(name("test"))[0];
  assert.ok(brand);
  assert.throws(() => rootedWriter().writer.add({ [brand]: "unknown", value: "test" } as never), /Invalid/);
  for (const scalar of [name("test"), literal("test"), hex("00")]) {
    assert.throws(() => rootedWriter().writer.add({ ...scalar, value: 1 } as never), /Invalid/);
  }
  assert.throws(() => value({ kind: "name", value: "test" } as never), /Invalid/);
});

test("invalid finite values, raw syntax, cyclic and excessive nesting are rejected", () => {
  for (const number of [NaN, Infinity, -Infinity]) assert.throws(() => rootedWriter().writer.add(number), /Nonfinite/);
  assert.throws(() => rootedWriter().writer.add(hex("abc")), /hex/);
  assert.throws(() => rootedWriter().writer.add(literal("😀")), /bytes/);
  assert.throws(() => rootedWriter().writer.add("<< /Raw true >>" as never), /Invalid/);
  const cycle: PdfDictionary = {};
  Object.assign(cycle, { cycle });
  assert.throws(() => rootedWriter().writer.add(cycle), /Cyclic/);
  let nested: PdfDictionary = {};
  for (let i = 0; i < 65; i++) nested = { nested };
  assert.throws(() => rootedWriter().writer.add(nested), /deeply/);
});

function binaryDocument(maximum?: number): Uint8Array {
  const { writer, root } = rootedWriter(maximum);
  const stream = writer.reserve();
  writer.define(root, { Payload: stream });
  const bytes = new Uint8Array([0, 255, 10, 13, 128]);
  writer.defineStream(stream, [bytes, "endstream\n"], { FilterName: name("test") });
  bytes.fill(42);
  return writer.seal();
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
  const { writer, root } = rootedWriter();
  assert.throws(() => writer.defineStream(root, [], { Length: 99 }), /overridden/);
  assert.throws(() => writer.defineStream(root, ["😀"]), /bytes/);
  const dictionary = { Label: literal("original") };
  writer.defineStream(root, ["abc\n"], dictionary);
  dictionary.Label = literal("mutated");
  const bytes = writer.seal();
  assert.ok(raw(bytes).includes("/Label (original)"));
  bytes.fill(0);
  assert.ok(raw(binaryDocument()).startsWith("%PDF"));
});

test("stream budget rejection precedes binary snapshot access", () => {
  const { writer, root } = rootedWriter(300);
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
  assert.ok(writer.seal().length <= 300);
});

test("root references need not be object one and many opaque chunks avoid argument limits", () => {
  const writer = new PdfWriter();
  const child = writer.reserve();
  const root = writer.reserve();
  writer.setRoot(root);
  writer.define(child, null);
  writer.defineStream(root, Array<string>(150000).fill("x"));
  const output = raw(writer.seal());
  assert.ok(output.includes("/Root 2 0 R"));
  assert.ok(output.includes("/Length 150000 >>"));
});

function laterRootWriter(rootId: number, maximum?: number) {
  const writer = new PdfWriter(maximum);
  const refs = Array.from({ length: rootId }, () => writer.reserve());
  const root = refs[rootId - 1]!;
  writer.setRoot(root);
  for (const ref of refs.slice(0, -1)) writer.define(ref, null);
  return { writer, root };
}

function laterRootDocument(rootId: number, bytes: Uint8Array, maximum?: number): Uint8Array {
  const { writer, root } = laterRootWriter(rootId, maximum);
  writer.defineStream(root, [bytes]);
  return writer.seal();
}

for (const rootId of [10, 100]) {
  test(`root ${rootId} has an exact cap and rejects cap minus one before binary copying`, () => {
    let copies = 0;
    const bytes = new Proxy(new Uint8Array(1024), {
      get(target, key) {
        if (key === Symbol.iterator) {
          copies++;
          return target[Symbol.iterator].bind(target);
        }
        return Reflect.get(target, key, target);
      },
    });
    const expected = laterRootDocument(rootId, new Uint8Array(1024));
    assert.ok(raw(expected).includes(`/Root ${rootId} 0 R`));
    const { writer, root } = laterRootWriter(rootId, expected.length - 1);
    assert.throws(() => writer.defineStream(root, [bytes]), /output bytes/);
    assert.equal(copies, 0);
    assert.deepEqual(laterRootDocument(rootId, bytes, expected.length), expected);
    assert.equal(copies, 1);
  });
}

test("root selection is owned, required before snapshots, immutable and resolved at seal", () => {
  const writer = new PdfWriter();
  const root = writer.reserve();
  const foreign = new PdfWriter().reserve();
  assert.throws(() => writer.setRoot(foreign), /Foreign/);
  assert.throws(() => writer.setRoot(undefined as never), /Foreign/);
  assert.throws(() => writer.define(root, null), /root must be selected/);
  assert.throws(() => writer.defineStream(root, []), /root must be selected/);
  assert.throws(() => writer.add(null), /root must be selected/);
  assert.throws(() => writer.seal(), /root must be selected/);
  writer.setRoot(root);
  assert.throws(() => writer.setRoot(root), /already selected/);
  assert.throws(() => writer.setRoot(writer.reserve()), /already selected/);
  assert.throws(() => writer.seal(), /Unresolved/);
});

test("pre-root add rejection preserves recovery output and object numbering", () => {
  const control = rootedWriter();
  const controlChild = control.writer.add(null);
  control.writer.define(control.root, { Child: controlChild });
  const expected = control.writer.seal();

  const writer = new PdfWriter(expected.length);
  const root = writer.reserve();
  assert.throws(() => writer.add(null), /root must be selected/);
  assert.throws(() => writer.add(null), /root must be selected/);
  writer.setRoot(root);
  const child = writer.add(null);
  writer.define(root, { Child: child });
  const actual = writer.seal();
  assert.ok(raw(actual).includes("/Child 2 0 R"));
  assert.deepEqual(actual, expected);
  assert.throws(() => writer.add(null), /sealed/);
});

test("root selection checks complete framing before any definitions", () => {
  const { writer, root } = rootedWriter();
  writer.define(root, null);
  const maximum = writer.seal().length - "null".length - 1;
  const limited = new PdfWriter(maximum);
  const pending = limited.reserve();
  assert.throws(() => limited.setRoot(pending), /output bytes/);
  assert.throws(() => limited.defineStream(pending, []), /root must be selected/);
});
