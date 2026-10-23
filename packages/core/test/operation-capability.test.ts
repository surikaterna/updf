import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { bindOperationCapabilityContext, createLayoutOperation, createOperationCapability } from "@updf/core/internal";
import { useOperationCapability } from "@updf/core/resources";
import { h, lower, type ComponentContext } from "@updf/core/vdom";

function rejects(invoke: () => unknown, path = "") {
  assert.throws(
    invoke,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT" &&
      error.diagnostics[0]?.path === path,
  );
}
test("ordinary operations never initialize an unselected capability; selected initialization is lazy and singular", () => {
  let initialized = 0;
  const capability = createOperationCapability((scope) => {
    initialized++;
    return () => ({ budget: scope.budget, bindings: scope.bindings });
  });
  const ordinary = createLayoutOperation({});
  assert.ok(!("composeText" in ordinary) && !("composedText" in ordinary));
  rejects(() => useOperationCapability(ordinary, capability));
  ordinary.close();
  assert.equal(initialized, 0);
  const selected = createLayoutOperation({ capability, limits: { nodes: 19 } });
  assert.equal(initialized, 0);
  const first = useOperationCapability(selected, capability);
  assert.equal(initialized, 1);
  assert.equal(first.budget.policy.nodes, 19);
  assert.ok(!("compositionWork" in first.budget));
  assert.equal(useOperationCapability(selected, capability).budget, first.budget);
  assert.equal(initialized, 1);
  selected.close();
  rejects(() => useOperationCapability(selected, capability));
});

test("multiple VDOM contexts share one actual operation selection and initialization", () => {
  let initialized = 0;
  const capability = createOperationCapability(() => {
    initialized++;
    let visits = 0;
    return (origin, check) => () => {
      check();
      return { visit: ++visits, path: origin.path };
    };
  });
  const reports: { visit: number; path: string }[] = [];
  let retained: (() => { visit: number; path: string }) | undefined;
  const component = (_props: object, context: ComponentContext) => {
    retained = useOperationCapability(context, capability);
    reports.push(retained());
    return null;
  };
  lower(
    h("document", {
      version: 1,
      children: h("page", { width: 10, height: 10, children: [h(component, {}), h(component, {})] }),
    }),
    { capability },
  );
  assert.equal(initialized, 1);
  assert.deepEqual(
    reports.map((item) => item.visit),
    [1, 2],
  );
  assert.notEqual(reports[0]!.path, reports[1]!.path);
  rejects(() => retained!(), reports[1]!.path);
});
test("generic access binds the real origin and lifetime and rejects absent/wrong/forged selectors", () => {
  const capability = createOperationCapability(() => (origin, check) => () => {
    check();
    return { path: origin.path, active: true };
  });
  const wrong = createOperationCapability(() => () => 1);
  const operation = createLayoutOperation({ capability });
  const context = {},
    origin = { path: "/adapter/0" },
    lifetime = { active: true };
  bindOperationCapabilityContext(context, operation, origin, lifetime);
  const api = useOperationCapability(context, capability);
  assert.deepEqual(api(), { path: "/adapter/0", active: true });
  rejects(() => useOperationCapability(context, wrong), origin.path);
  rejects(() => useOperationCapability({}, capability));
  rejects(() => useOperationCapability(context, { ...capability }), origin.path);
  origin.path = "/adapter/retry";
  assert.equal(api().path, origin.path);
  lifetime.active = false;
  rejects(() => useOperationCapability(context, capability), origin.path);
  rejects(api, origin.path);
  operation.close();
  rejects(api, origin.path);
});
