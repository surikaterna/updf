import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { type DiagnosticCode, DocumentError, render, renderUnknown } from "@updf/core";
import { jsxDEV } from "@updf/core/jsx-dev-runtime";
import { jsx, jsxs } from "@updf/core/jsx-runtime";
import { bind, type Component, definePrimitive, Fragment, h, lower, type VDOMChild, type VNode } from "@updf/core/vdom";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { createCmrTree } from "@updf/example-cmr/cmr-tree";

const rect = () => h("rect", { x: 0, y: 0, width: 10, height: 10 });
const page = (children: VDOMChild) => h("page", { width: 100, height: 100, children });
const doc = (children: VDOMChild) => h("document", { version: 1, children });
const tree = (children: VDOMChild) => doc(page(children));
const textProps = { x: 0, y: 0, width: 90, height: 24, fontSize: 10, lineHeight: 12, align: "left" } as const;

function rejects(run: () => unknown, code: DiagnosticCode, path?: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    const diagnostic = error.diagnostics[0];
    assert.ok(diagnostic);
    assert.equal(diagnostic.code, code);
    if (path !== undefined) assert.equal(diagnostic.path, path);
    return true;
  });
}

test("component CMR lowers to independent reference AST and unchanged PDF bytes", () => {
  const input = createCmrTree(cmrFixture);
  const ast = lower(input);
  assert.deepEqual(ast, createCmrDocument(cmrFixture));
  assert.deepEqual(lower(input), ast);
  assert.equal(
    createHash("sha256").update(render(ast)).digest("hex"),
    "8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22",
  );
  assert.ok(Object.isFrozen(ast) && Object.isFrozen(ast.pages) && Object.isFrozen(ast.pages[0]?.children));
});

test("signed nested translations, line endpoints, arrays/fragments and ignored children", () => {
  const shared = rect();
  const input = tree(
    h("group", {
      x: 20,
      y: 15,
      children: h("group", {
        x: -5,
        y: -3,
        children: [
          null,
          undefined,
          true,
          false,
          h(Fragment, { children: [shared, [shared]] }),
          h("line", { x: 0, y: 1, x2: 10, y2: 11 }),
        ],
      }),
    }),
  );
  assert.deepEqual(lower(input).pages[0]?.children, [
    { type: "rect", x: 15, y: 12, width: 10, height: 10 },
    { type: "rect", x: 15, y: 12, width: 10, height: 10 },
    { type: "line", x: 15, y: 13, x2: 25, y2: 23 },
  ]);
  rejects(() => lower(tree(h("group", { x: -1, children: shared }))), "GEOMETRY");
  rejects(() => lower(tree(h("group", { x: Infinity, children: shared }))), "GEOMETRY");
});

test("owned deep snapshots never freeze callers; component props and metadata cannot mutate", () => {
  const input = { data: { labels: ["before"] } };
  let observed: unknown;
  const Box: Component<typeof input> = (props, context) => {
    observed = props;
    assert.ok(Object.isFrozen(props) && Object.isFrozen(props.data) && Object.isFrozen(props.data.labels));
    assert.ok(Object.isFrozen(context) && Object.isFrozen(context.resources));
    return h("text", { ...textProps, text: props.data.labels.join("") });
  };
  const node = h(Box, input);
  input.data.labels[0] = "after";
  const metadata = [{ id: "future-resource", kind: "metadata" }];
  const first = lower(tree(node), { resourceMetadata: metadata });
  assert.notEqual(observed, input);
  assert.equal(first.pages[0]?.children[0]?.type, "text");
  assert.deepEqual(first.pages[0]?.children[0], { type: "text", ...textProps, text: "before" });
  assert.ok(!Object.isFrozen(input) && !Object.isFrozen(input.data.labels) && !Object.isFrozen(metadata));
  lower(tree(rect()));
  assert.deepEqual(lower(tree(node), { resourceMetadata: metadata }), first);
});

test("callback/accessor/class props and malformed arrays are rejected without calling user methods", () => {
  let calls = 0;
  const Ignore: Component<object> = () => {
    calls++;
    return rect();
  };
  rejects(() => h(Ignore, { onClick: () => calls++ }), "TYPE", "/props/onClick");
  rejects(
    () =>
      h(
        Ignore,
        Object.defineProperty({}, "data", {
          enumerable: true,
          get() {
            calls++;
            return 1;
          },
        }),
      ),
    "TYPE",
  );
  rejects(() => h(Ignore, { data: new Date() }), "TYPE");
  rejects(() => h(Ignore, { data: Object.setPrototypeOf([], null) }), "TYPE");
  rejects(() => h(Ignore, { data: new Array(1) }), "TYPE");
  rejects(() => h(Ignore, Object.defineProperty({}, "hidden", { value: 1 })), "TYPE");
  assert.equal(calls, 0);
  assert.throws(() => renderUnknown({ version: 1, pages: [nodeWithFunction()] }), DocumentError);
  function nodeWithFunction() {
    return { width: 100, height: 100, children: [{ type: () => calls++ }] };
  }
  assert.equal(calls, 0);
});

test("text children concatenate strings only, with explicit empty text and no rich text", () => {
  const ast = lower(tree(h("text", { ...textProps, children: ["Hello", [null, false, " PDF"], "\nX"] })));
  assert.deepEqual(ast.pages[0]?.children[0], { type: "text", ...textProps, text: "Hello PDF\nX" });
  assert.ok(render(lower(tree(h("text", { ...textProps, text: "" })))).length);
  const Word: Component<object> = () => "component";
  assert.deepEqual(
    lower(tree(h("text", { ...textProps, children: h(Fragment, { children: h(Word, {}) }) }))).pages[0]?.children[0],
    { type: "text", ...textProps, text: "component" },
  );
  const Both: Component<object> = () => jsx("text", { ...textProps, text: "a", children: "b" });
  rejects(() => lower(tree(h(Both, {}))), "KEY");
  const NumberChild: Component<object> = () => jsx("text", { ...textProps, children: 42 });
  rejects(() => lower(tree(h(NumberChild, {}))), "TYPE");
  const Rich: Component<object> = () => jsx("text", { ...textProps, children: rect() });
  rejects(() => lower(tree(h(Rich, {}))), "TYPE");
  const Missing: Component<object> = () => jsx("text", textProps);
  rejects(() => lower(tree(h(Missing, {}))), "TYPE");
  rejects(
    () =>
      lower(tree(h("text", { ...textProps, children: ["x".repeat(4096), "x"] })), { limits: { textCodePoints: 4096 } }),
    "LIMIT",
  );
});

test("post-expansion hierarchy and final geometry diagnostics map to VDOM paths", () => {
  rejects(() => lower(page(rect())), "VDOM_HIERARCHY", "/tree");
  rejects(() => lower(doc(rect())), "VDOM_HIERARCHY");
  rejects(() => lower(tree(page(rect()))), "VDOM_HIERARCHY");
  rejects(() => lower(tree(doc(page(rect())))), "VDOM_HIERARCHY");
  rejects(() => lower([doc(page(rect())), doc(page(rect()))]), "VDOM_HIERARCHY");
  rejects(() => lower(tree("outside text")), "TYPE");
  rejects(() => lower(doc([])), "VALUE", "/tree/props/children");
  rejects(
    () => lower(tree(h("text", { ...textProps, children: "Москва" }))),
    "CHARACTER",
    "/tree/props/children/props/children/props/children",
  );
  const Bad: Component<object> = () => h("rect", { x: 95, y: 0, width: 10, height: 10 });
  rejects(() => lower(tree(h(Bad, {}))), "BOUNDS", "/tree/props/children/props/children/expanded/props");
});

interface BadgeProps {
  readonly label: string;
}
function isBadge(value: unknown): value is BadgeProps {
  return typeof value === "object" && value !== null && "label" in value && typeof value.label === "string";
}
const Badge = definePrimitive<BadgeProps>("Badge", isBadge, (props) => h("text", { ...textProps, text: props.label }));

test("registry installation is local and identity-based; no native override or duplicate name", () => {
  const input = tree(h(Badge.Type, { label: "registry" }));
  assert.ok(render(lower(input, { registry: [Badge.definition] })).length);
  rejects(() => lower(input), "VDOM_REGISTRY");
  rejects(() => lower(input, { registry: [Badge.definition, Badge.definition] }), "VDOM_REGISTRY");
  const other = definePrimitive<BadgeProps>("Badge", isBadge, () => rect());
  rejects(() => lower(input, { registry: [other.definition] }), "VDOM_REGISTRY");
  rejects(() => definePrimitive("Text", isBadge, () => rect()), "VDOM_REGISTRY");
  rejects(
    () =>
      Badge.definition.expand(
        { label: 42 },
        {
          resources: [],
          measurement: {
            measureText: () => {
              throw new Error("Invalid props must reject before measurement");
            },
          },
        },
      ),
    "TYPE",
  );
});

test("active-path cycles reject arrays/nodes but reused DAGs and interleaved calls are safe", async () => {
  const cycle: VDOMChild[] = [];
  cycle.push(cycle);
  rejects(() => lower(cycle), "VDOM_CYCLE", "/tree/0");
  rejects(() => h(Fragment, { children: cycle }), "VDOM_CYCLE");
  const Loop: Component<object> = () => self;
  const self: VNode = h(Loop, {});
  rejects(() => lower(self), "VDOM_CYCLE");
  const Bound = bind(() => rect(), {});
  const input = tree([h(Bound, {}), h(Bound, {})]);
  const outputs = await Promise.all([
    Promise.resolve().then(() => lower(input)),
    Promise.resolve().then(() => lower(input)),
  ]);
  assert.deepEqual(outputs[0], outputs[1]);
  assert.equal(outputs[0]?.pages[0]?.children.length, 2);
});

test("nonprogressing expansion rejects without a mandatory depth cap; optional source nodes stop invocation", () => {
  let calls = 0;
  const Recursive: Component<object> = () => {
    calls++;
    return h(Recursive, {});
  };
  rejects(() => lower(tree(h(Recursive, {}))), "VDOM_CYCLE");
  assert.ok(calls > 0 && calls < 128);
  calls = 0;
  const Last: Component<object> = () => {
    calls++;
    return rect();
  };
  const input = tree([...Array<VDOMChild>(9997).fill(rect()), h(Last, {})]);
  rejects(() => lower(input, { profile: "service" }), "LIMIT");
  assert.equal(calls, 0);
  const Throwing: Component<object> = () => {
    throw new Error("trusted failure");
  };
  rejects(() => lower(tree(h(Throwing, {}))), "VDOM_COMPONENT");
  assert.equal(lower(tree(Array<VDOMChild>(9997).fill(rect()))).pages[0]?.children.length, 9997);
});

test("production/development JSX constructors share ownership; keys stay out of props and AST", () => {
  const WithKey: Component<object> = (props) => {
    assert.ok(!("key" in props));
    return rect();
  };
  const input = jsxs(
    "document",
    {
      version: 1,
      children: jsxDEV(
        "page",
        { width: 100, height: 100, children: jsx(WithKey, {}, "component-key") },
        "page-key",
        true,
        { fileName: "test" },
        undefined,
      ),
    },
    "root-key",
  );
  assert.deepEqual(lower(input), lower(tree(rect())));
  assert.ok(!JSON.stringify(lower(input)).includes("key"));
  rejects(() => h(WithKey, { key: "data" }), "KEY", "/props/key");
});
