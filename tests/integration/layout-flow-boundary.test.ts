import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { FragmentState as InternalState } from "../../packages/layout/src/flow-runtime/fragment-state.js";
import { FragmentState as HostState } from "../../packages/layout/src/fragment-state.js";
import { appendFixture, boundaryFixture, compileBoundary, emittedClosure } from "./layout-flow-boundary-helpers.js";

test("flow runtime emits and runs with strict ES-only types and closed JS/declaration graphs", async () => {
  const fixture = boundaryFixture();
  try {
    const entry = compileBoundary(fixture);
    const allowed = join(fixture.output, "packages/layout/src/flow-runtime");
    for (const declaration of [false, true]) {
      const closure = emittedClosure(`${entry}${declaration ? ".d.ts" : ".js"}`, allowed, declaration);
      for (const name of ["runtime", "fragment-state"])
        assert.ok(closure.has(join(allowed, `${name}${declaration ? ".d.ts" : ".js"}`)), `${name} reachable`);
      if (declaration) assert.ok(closure.has(join(allowed, "protocol.d.ts")), "Protocol reachable");
    }
    const compiled = await import(pathToFileURL(`${entry}.js`).href);
    assert.equal(typeof compiled.nativeFreeWitness().fork, "function");
  } finally {
    fixture.cleanup();
  }
});

test("host state re-export preserves the exact class", () => {
  assert.equal(HostState, InternalState);
  assert.ok(new HostState().fork() instanceof InternalState);
});

test("source boundary also rejects erased type-only host imports", () => {
  const fixture = boundaryFixture();
  try {
    writeFileSync(join(fixture.seam, "../host.ts"), 'export interface Host { tag: "host" }');
    appendFixture(join(fixture.seam, "runtime.ts"), 'import type { Host } from "../host.js";');
    assert.throws(() => compileBoundary(fixture), /Source boundary leak:/);
    const entry = compileBoundary(fixture, true);
    const allowed = join(fixture.output, "packages/layout/src/flow-runtime");
    emittedClosure(`${entry}.js`, allowed, false);
    emittedClosure(`${entry}.d.ts`, allowed, true);
  } finally {
    fixture.cleanup();
  }
});

const controls = [
  { name: "direct host runtime", injection: 'export { host } from "../host.js";', runtime: true },
  { name: "transitive host runtime", injection: 'export { host } from "./bridge.js";', runtime: true, bridge: true },
  { name: "type-only host", injection: 'import type { Host } from "../host.js"; export type Leak = Host;' },
  { name: "declaration import expression", injection: 'export type Leak = import("../host.js").Host;' },
  { name: "declaration re-export", injection: 'export type { Host } from "../host.js";' },
];

for (const control of controls) {
  test(`emitted boundary rejects ${control.name} leakage`, () => {
    const fixture = boundaryFixture();
    try {
      writeFileSync(join(fixture.seam, "../host.ts"), 'export const host = {}; export interface Host { tag: "host" }');
      if (control.bridge) writeFileSync(join(fixture.seam, "bridge.ts"), 'export { host } from "../host.js";');
      appendFixture(join(fixture.seam, "runtime.ts"), control.injection);
      const entry = compileBoundary(fixture, true);
      const allowed = join(fixture.output, "packages/layout/src/flow-runtime");
      assert.throws(() => emittedClosure(`${entry}.d.ts`, allowed, true), /Boundary leak:/);
      if (control.runtime) assert.throws(() => emittedClosure(`${entry}.js`, allowed, false), /Boundary leak:/);
      else emittedClosure(`${entry}.js`, allowed, false);
    } finally {
      fixture.cleanup();
    }
  });
}
