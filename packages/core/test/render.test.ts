import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type RenderOptions, renderUnknown as render } from "@updf/core";
import { measure as measureValidated } from "../dist/cjs/core/measure.js";
import { textWidth } from "../dist/cjs/core/metrics.js";
import { decimal, literal, value } from "../dist/cjs/core/pdf-values.js";
import { validate } from "../dist/cjs/core/validate.js";

const text = (overrides: Record<string, unknown> = {}) => ({
  type: "text",
  x: 10,
  y: 10,
  width: 80,
  height: 50,
  text: "Hello",
  fontSize: 10,
  lineHeight: 12,
  align: "left",
  ...overrides,
});
const document = (children: readonly unknown[] = [text()]) => ({
  version: 1,
  pages: [{ width: 100, height: 100, children }],
});
const pdfString = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

function measuredText(input: unknown) {
  validate(input);
  const node = measureValidated(input)[0]?.children[0];
  assert.ok(node?.type === "text");
  return node;
}

function rejects(input: unknown, code: string, path?: string, options: RenderOptions = {}) {
  assert.throws(
    () => render(input, options),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      const diagnostic = error.diagnostics[0];
      assert.ok(diagnostic);
      assert.equal(diagnostic.code, code);
      if (path !== undefined) assert.equal(diagnostic.path, path);
      assert.equal(typeof diagnostic.message, "string");
      return true;
    },
  );
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test("frozen shared nodes, repeated/interleaved render and JSON roundtrip are immutable", () => {
  const shared = freeze(text());
  const input = freeze(document([shared, shared]));
  const before = JSON.stringify(input);
  const a = render(input);
  render(document([text({ text: "different" })]));
  assert.deepEqual(render(input), a);
  assert.deepEqual(render(JSON.parse(before)), a);
  assert.equal(JSON.stringify(input), before);
  a[0] = 0;
  assert.equal(render(input)[0], 37);
});

test("exact byte offsets, stream lengths, binary header and startxref", () => {
  const bytes = render(document([text({ text: "(x)\\ /Name endstream", fontSize: 5 })]));
  const raw = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  assert.deepEqual(Array.from(bytes.slice(10, 14)), [226, 227, 207, 211]);
  const match = raw.match(/startxref\n(\d+)/);
  assert.ok(match);
  const start = Number(match[1]);
  assert.equal(raw.slice(start, start + 4), "xref");
  const entries = [...raw.matchAll(/^(\d{10}) 00000 n /gm)];
  entries.forEach((entry, i) => {
    assert.ok(raw.slice(Number(entry[1])).startsWith(`${i + 1} 0 obj\n`));
  });
  for (const match of raw.matchAll(/\/Length (\d+) >>\nstream\n/g)) {
    const begin = match.index + match[0].length;
    assert.equal(raw.slice(begin + Number(match[1]), begin + Number(match[1]) + 9), "endstream");
  }
  assert.ok(raw.includes("(\\(x\\)\\\\ /Name endstream) Tj"));
});

test("Helvetica widths, LF, spaces, wrapping, alignment and empty text", () => {
  assert.equal(textWidth("Hello", 10), 22.78);
  assert.equal(textWidth("AV", 10), 13.34); // No kerning in measurement or Tj.
  assert.equal(textWidth("a", Number.MAX_VALUE), 0.556 * Number.MAX_VALUE);
  const plan = measuredText(document([text({ text: "Hello Hello\nX", width: 30, align: "right" })]));
  assert.deepEqual(
    plan.lines.map((line) => line.text),
    ["Hello ", "Hello", "X"],
  );
  const first = plan.lines[0];
  assert.ok(first);
  assert.ok(Math.abs(first.x - 14.44) < 1e-12);
  assert.deepEqual(measuredText(document([text({ text: "" })])).lines, []);
  assert.ok(render(document([text({ text: "" })])) instanceof Uint8Array);
  assert.equal(measuredText(document([text({ text: "X", align: "center" })])).lines[0]?.x, 46.665);
});

test("wrapping rejects tokens and vertical overflow, including explicit empty LF lines", () => {
  rejects(document([text({ text: "WW", width: 10 })]), "TOKEN_OVERFLOW");
  rejects(document([text({ text: "a\nb", height: 12 })]), "VERTICAL_OVERFLOW");
  rejects(document([text({ text: "\n", height: 12 })]), "VERTICAL_OVERFLOW");
});

test("strict schema diagnostics, JSONPointer, cycles and data-only objects", () => {
  rejects({ ...document(), version: 2 }, "VERSION", "/version");
  rejects({ ...document(), "a/b~c": 1 }, "KEY", "/a~1b~0c");
  rejects(document([{ ...text(), type: "image" }]), "TYPE");
  rejects(document([text({ fontFamily: "Times" })]), "KEY");
  rejects(document([text({ align: "justify" })]), "VALUE");
  const node: Record<string, unknown> = text();
  const cycle = document([node]);
  node.text = cycle;
  rejects(cycle, "TYPE");
  rejects(document([null]), "TYPE");
  rejects(document([new Date()]), "TYPE");
  rejects(
    document([
      Object.defineProperty(text(), "text", {
        get() {
          throw new Error("invoked");
        },
      }),
    ]),
    "TYPE",
  );
  rejects({ version: 1, pages: new Array(1) }, "TYPE");
});

test("ASCII rejection includes Cyrillic, surrogate pairs and controls; no transliteration", () => {
  for (const unsupported of ["Привет", "é", "😀", "\t", "\r", "\0", "\x7f", "\ud800"]) {
    rejects(document([text({ text: unsupported })]), "CHARACTER", "/pages/0/children/0/text");
  }
});

test("nonenumerable schema fields and array indices fail with structured diagnostics", () => {
  const rect = { type: "rect", x: 0, y: 0, width: 10, height: 10 };
  Object.defineProperty(rect, "width", { enumerable: false });
  rejects(document([rect]), "TYPE", "/pages/0/children/0/width");
  const input = document();
  Object.defineProperty(input, "pages", { enumerable: false });
  rejects(input, "TYPE", "/pages");
  const children = [text()];
  Object.defineProperty(children, "0", { enumerable: false });
  rejects(document(children), "TYPE", "/pages/0/children/0");
});

test("unsupported array prototypes and caller traversal overrides are never invoked", () => {
  let calls = 0;
  class SkippingArray extends Array<unknown> {
    forEach() {
      calls++;
    }
    map() {
      calls++;
      return [];
    }
    [Symbol.iterator](): never {
      calls++;
      throw new Error("invoked");
    }
  }
  const bad = { type: "rect", x: 0, y: 0, width: -10, height: 10 };
  rejects(document(new SkippingArray(bad)), "TYPE", "/pages/0/children");
  rejects({ version: 1, pages: new SkippingArray(document().pages[0]) }, "TYPE", "/pages");
  rejects(document(Object.setPrototypeOf([bad], null)), "TYPE", "/pages/0/children");
  rejects({ version: 1, pages: Object.setPrototypeOf(document().pages, null) }, "TYPE", "/pages");
  const children = [bad];
  Object.defineProperty(children, "forEach", {
    get() {
      calls++;
      throw new Error("invoked");
    },
  });
  rejects(document(children), "TYPE", "/pages/0/children");
  const prototype = {
    get forEach() {
      calls++;
      throw new Error("invoked");
    },
  };
  rejects(document(Object.setPrototypeOf([bad], prototype)), "TYPE", "/pages/0/children");
  class Rect {
    get type() {
      calls++;
      throw new Error("invoked");
    }
  }
  rejects(document([new Rect()]), "TYPE", "/pages/0/children/0");
  assert.equal(calls, 0);
});

test("ASCII ink envelope baseline, tight exact-fit multiline and blank line capacity", () => {
  const input = document([text({ text: "|\n$g_", x: 0, y: 0, fontSize: 20, lineHeight: 20, height: 40 })]);
  const lines = measuredText(input).lines;
  assert.deepEqual(
    lines.map((line) => line.y),
    [15.5, 35.5],
  );
  assert.ok(render(input).length);
  rejects(document([text({ text: "|\n|", fontSize: 20, lineHeight: 20, height: 39.99 })]), "VERTICAL_OVERFLOW");
  assert.ok(render(document([text({ text: "|\n", fontSize: 20, lineHeight: 20, height: 40 })])).length);
  rejects(document([text({ text: "|\n", fontSize: 20, lineHeight: 20, height: 20 })]), "VERTICAL_OVERFLOW");
});

test("finite bounded geometry and line endpoints", () => {
  for (const width of [0, -1, NaN, Infinity, "10"]) rejects(document([text({ width })]), "GEOMETRY");
  rejects(document([text({ x: 99 })]), "BOUNDS");
  rejects(document([text({ lineHeight: 9 })]), "GEOMETRY");
  rejects(document([{ type: "line", x: 0, y: 0, x2: 0, y2: 0 }]), "GEOMETRY");
  rejects(document([{ type: "line", x: 0, y: 0, x2: 101, y2: 0 }]), "BOUNDS");
  assert.ok(render(document([{ type: "line", x: 0, y: 0, x2: 100, y2: 100 }])).length);
});

test("decimal serializer expands numeric extremes without invalid exponent syntax", () => {
  for (const number of [0, -0, 1e-7, -1e-7, 5e-324, -5e-324, 1e21, -1e21, Number.MAX_VALUE, 257.5]) {
    const result = decimal(number);
    assert.match(result, /^-?\d+(\.\d+)?$/);
    assert.equal(Number(result), number === 0 ? 0 : number);
  }
  const input = {
    version: 1,
    pages: [{ width: 1e21, height: 1e21, children: [{ type: "rect", x: 1e-7, y: 0, width: 1, height: 1 }] }],
  };
  assert.ok(pdfString(render(input)).includes("0.0000001"));
  assert.equal(value(literal("a\n\0\t\\()")), "(a\\012\\000\\011\\\\\\(\\))");
});

test("accepted page/node caps and aggregate node counting across pages", () => {
  const rect = { type: "rect", x: 0, y: 0, width: 1, height: 1 };
  const page = { width: 100, height: 100, children: Array(500).fill(rect) };
  assert.ok(render({ version: 1, pages: Array(20).fill(page) }).length);
  rejects({ version: 1, pages: Array(20).fill({ ...page, children: Array(501).fill(rect) }) }, "LIMIT", undefined, {
    profile: "service",
  });
  const boundaryText = text({ text: "x".repeat(4096), width: 80, fontSize: 0.00001, lineHeight: 0.00002 });
  assert.ok(render(document([boundaryText])).length);
});

test("optional service page/node/aggregate text/output caps replace mandatory legacy ceilings", () => {
  const service = { profile: "service" } as const;
  rejects({ version: 1, pages: Array(21).fill(document().pages[0]) }, "LIMIT", undefined, service);
  rejects(document(Array(10001).fill(text())), "LIMIT", undefined, service);
  rejects(document([text({ text: "x".repeat(4097) })]), "LIMIT", undefined, { limits: { textCodePoints: 4096 } });
  rejects(document(Array(25).fill(text({ text: "a".repeat(4096) }))), "LIMIT", undefined, service);
  const tiny = text({ text: "a\n".repeat(2048), fontSize: Number.MIN_VALUE, lineHeight: Number.MIN_VALUE });
  rejects(document(Array(24).fill(tiny)), "LIMIT", undefined, service);
});
