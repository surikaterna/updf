import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { DocumentError, type DocumentDefinition, type NodeDefinition } from "@updf/core";
import { definePrimitive, h, type NativeProps, type VNode } from "@updf/core/vdom";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { nativeInk } from "../../packages/core/dist/cjs/core/ink.js";
import { operation } from "../../packages/core/dist/cjs/core/operation.js";
import { isNativeNodeKind, nativeNodeKinds, nativeNodeToVdom } from "@updf/core/internal-drawing";
import { richNode } from "../fixtures/rich-input.js";
import { lower, render, renderUnknown, textOptions } from "../fixtures/text-options.js";

const require = createRequire(import.meta.url);
const image = prepareJpeg(new Uint8Array(readFileSync("tests/fixtures/jpeg/color-1x1.jpg")));
const base = textOptions({ resources: { image } });
const options = { ...base, providers: [...(base.providers ?? []), jpegProvider()] };
const rectangle = { type: "rect", x: 20, y: 20, width: 10, height: 10 } as const;
const nodes: readonly NodeDefinition[] = [
  rectangle,
  { type: "line", x: 20, y: 20, x2: 30, y2: 30 },
  {
    type: "path",
    commands: [
      { type: "move", x: 20, y: 20 },
      { type: "line", x: 30, y: 30 },
    ],
  },
  richNode("A", { x: 20, y: 20, width: 50 }),
  {
    type: "paintGroup",
    transform: [1, 0, 0, 1, 10, 10],
    clip: { x: 0, y: 0, width: 80, height: 80 },
    children: [rectangle],
  },
  { type: "xObject", resource: "image", x: 20, y: 20, width: 10, height: 10 },
];
const document: DocumentDefinition = { version: 1, pages: [{ width: 100, height: 100, children: nodes }] };

function vnode(node: NodeDefinition): VNode {
  return nativeNodeToVdom(node);
}
function tree(children: readonly VNode[]): VNode {
  return h("document", { version: 1, children: h("page", { width: 100, height: 100, children }) });
}
function diagnostic(run: () => unknown, code: string, path?: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    if (path) assert.equal(error.diagnostics[0]?.path, path);
    return true;
  });
}

const owners = [
  ["rectangle", "Rectangle", "rectangleInk"],
  ["line", "Line", "lineInk"],
  ["path", "Path", "pathInk"],
  ["rich-text", "RichText", "richTextInk"],
  ["paint-group", "PaintGroup", "paintGroupInk"],
  ["xobject", "XObject", "xObjectInk"],
] as const;

function instrument() {
  const calls = new Map<string, number>();
  const restore: (() => void)[] = [];
  for (const [file, suffix, ink] of owners) {
    const module = require(`../../packages/core/dist/cjs/nodes/${file}.js`) as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const names = ["validate", "measure", "paint", "lower"].map((phase) => `${phase}${suffix}`);
    names.push(ink);
    if (file !== "paint-group") names.push(`collect${suffix}`);
    for (const name of names) {
      const original = module[name]!;
      const key = `${file}/${name}`;
      calls.set(key, 0);
      module[name] = (...args) => {
        calls.set(key, (calls.get(key) ?? 0) + 1);
        return original(...args);
      };
      restore.push(() => {
        module[name] = original;
      });
    }
  }
  return {
    calls,
    restore: () =>
      restore.forEach((reset) => {
        reset();
      }),
  };
}

test("all six native lifecycle drivers actually invoke their owner functions", () => {
  const proof = instrument();
  try {
    const ast = lower(tree(nodes.map(vnode)), options);
    render(ast, options);
    const owned = operation(options);
    assert.equal(nativeInk(ast.pages[0]!.children, owned.fonts, owned.budget.policy).empty, false);
    for (const [name, count] of proof.calls) assert.ok(count > 0, `Driver bypassed ${name}`);
  } finally {
    proof.restore();
  }
});

test("all six AST/VDOM paths preserve native data, operators, clips, text and resources", () => {
  const ast = lower(tree(nodes.map(vnode)), options);
  assert.deepEqual(ast, document);
  const bytes = render(ast, options);
  assert.deepEqual(bytes, render(document, options));
  const pdf = Buffer.from(bytes).toString("latin1");
  for (const operator of [" re S", " l S", " re W n", " Tf ", "/X1 Do", "1 0 0 -1 0 100 cm"])
    assert.ok(pdf.includes(operator), operator);
});

test("kind inventory is exact and primitive reservation is case-insensitive, not native construction", () => {
  assert.equal(Object.isFrozen(nativeNodeKinds), true);
  assert.deepEqual(new Set(nativeNodeKinds), new Set(nodes.map((node) => node.type)));
  for (const kind of nativeNodeKinds) {
    assert.equal(isNativeNodeKind(kind), true);
    for (const name of [kind[0]!.toUpperCase() + kind.slice(1), kind.toUpperCase()])
      diagnostic(
        () =>
          definePrimitive(
            name,
            (_): _ is object => true,
            () => null,
          ),
        "VDOM_REGISTRY",
      );
  }
  for (const name of ["Document", "Page", "Group"])
    diagnostic(
      () =>
        definePrimitive(
          name,
          (_): _ is object => true,
          () => null,
        ),
      "VDOM_REGISTRY",
    );
  assert.equal(
    definePrimitive(
      "CustomShape",
      (_): _ is object => true,
      () => null,
    ).definition.name,
    "CustomShape",
  );
  for (const kind of ["RichText", "RECT", "__proto__", "text"]) assert.equal(isNativeNodeKind(kind), false);
});

test("every owner key policy rejects AST/VDOM extras before running accessors", () => {
  for (const node of nodes) {
    const input = { ...node, unsupported: true };
    diagnostic(
      () => renderUnknown({ ...document, pages: [{ ...document.pages[0], children: [input] }] }, options),
      "KEY",
      "/pages/0/children/0/unsupported",
    );
    const { type, ...props } = input;
    diagnostic(() => lower(tree([h(type, props as NativeProps[typeof type])]), options), "KEY");
    let accessed = false;
    const accessor = Object.defineProperty({ ...node }, "x", {
      enumerable: true,
      get: () => {
        accessed = true;
        return 0;
      },
    });
    diagnostic(
      () => renderUnknown({ version: 1, pages: [{ width: 100, height: 100, children: [accessor] }] }, options),
      "TYPE",
    );
    assert.equal(accessed, false);
  }
});

test("unknown kinds never fall through to path/rectangle policy", () => {
  for (const type of ["__proto__", "constructor", "Path", "text", "notNative"])
    diagnostic(
      () =>
        renderUnknown(
          { version: 1, pages: [{ width: 100, height: 100, children: [{ ...rectangle, type }] }] },
          options,
        ),
      "TYPE",
      "/pages/0/children/0/type",
    );
});

test("driver keeps deep group traversal, cycle tracking and command quotas", () => {
  let node: NodeDefinition = rectangle;
  for (let depth = 0; depth < 256; depth++) node = { type: "paintGroup", children: [node] };
  const input = { version: 1, pages: [{ width: 100, height: 100, children: [node] }] };
  renderUnknown(input, { ...options, limits: { depth: 300 } });
  diagnostic(() => renderUnknown(input, { ...options, limits: { depth: 100 } }), "LIMIT");
  diagnostic(() => render(document, { ...options, limits: { pathCommands: 4 } }), "LIMIT", "/pages/0/children/0");
  const cycle: { type: "paintGroup"; children: unknown[] } = { type: "paintGroup", children: [] };
  cycle.children.push(cycle);
  diagnostic(() => renderUnknown({ ...input, pages: [{ ...input.pages[0], children: [cycle] }] }, options), "TYPE");
});
