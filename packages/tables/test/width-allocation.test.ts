import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createExtensions, defineBlockAdapter, document, extension, flow, layout } from "@updf/layout";
import { retainAllocation, reuseAllocation } from "../src/widths.js";

function diagnostic(callback: () => unknown, code: string, path = /./u) {
  assert.throws(
    callback,
    (cause: unknown) =>
      cause instanceof DocumentError &&
      cause.diagnostics[0]?.code === code &&
      path.test(cause.diagnostics[0]?.path ?? ""),
  );
}
test("allocation capabilities reject copies, cross-operation and closed contexts and charge every reuse", () => {
  let token: object | undefined;
  let closed: (() => unknown) | undefined;
  const columns = Object.freeze(Array.from({ length: 100 }, () => Object.freeze({ width: 1 })));
  const adapter = defineBlockAdapter<{ reuse: boolean; twice?: boolean }>({
    name: "allocation.probe",
    validate: (value) => value as { reuse: boolean; twice?: boolean },
    measure(props, context) {
      if (!props.reuse) token = retainAllocation(columns, context);
      assert.ok(token);
      diagnostic(() => reuseAllocation({ ...token }, context), "TYPE");
      assert.equal(reuseAllocation(token, context), columns);
      closed = () => reuseAllocation(token as object, context);
      if (props.twice) reuseAllocation(token, context);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 100, height: 0 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 0, nodes: [] }),
      };
    },
  });
  const root = (reuse: boolean, twice = false) =>
    document({
      children: flow({
        pageSize: { width: 100, height: 100 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions: createExtensions([adapter]),
        children: extension(adapter, { reuse, twice }),
      }),
    });
  layout(root(false));
  assert.ok(closed);
  diagnostic(closed, "MEASUREMENT_CONTEXT");
  diagnostic(() => layout(root(true)), "MEASUREMENT_CONTEXT");
  diagnostic(
    () => layout(root(false, true), { profile: "service", limits: { nodes: 180 } }),
    "LIMIT",
    /\/props\/columns$/u,
  );
});
