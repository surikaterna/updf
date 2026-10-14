import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { appendFixture, boundaryFixture, compileBoundary, emittedClosure } from "./layout-flow-boundary-helpers.js";

function allowed(fixture: ReturnType<typeof boundaryFixture>, declaration: boolean): [string, string] {
  const suffix = declaration ? ".d.ts" : ".js";
  return [
    join(fixture.output, `packages/layout/src/flow-composition/stack-model${suffix}`),
    join(fixture.output, `packages/layout-boxes/src/arithmetic${suffix}`),
  ];
}

function runtimeArithmetic(fixture: ReturnType<typeof boundaryFixture>): void {
  const directory = join(fixture.output, "node_modules/@updf/layout-boxes");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ type: "module", exports: { "./arithmetic": "./arithmetic.js" } }),
  );
  writeFileSync(
    join(directory, "arithmetic.js"),
    'export { MetricSum } from "../../../packages/layout-boxes/src/arithmetic.js";',
  );
}

test("stack model strict ES-only source, JS and declaration closures execute both functions", async () => {
  const fixture = boundaryFixture("stack-model");
  try {
    const entry = compileBoundary(fixture);
    for (const declaration of [false, true]) {
      const paths = allowed(fixture, declaration);
      const closure = emittedClosure(`${entry}${declaration ? ".d.ts" : ".js"}`, paths, declaration);
      assert.ok(closure.has(paths[0]), "Model reachable");
      if (!declaration) assert.ok(closure.has(paths[1]), "Actual arithmetic reachable");
      assert.equal(closure.size, declaration ? 2 : 3);
    }
    runtimeArithmetic(fixture);
    const compiled = await import(pathToFileURL(`${entry}.js`).href);
    const witness = compiled.stackModelWitness();
    assert.equal(witness.height, 1.25);
    assert.equal(witness.result.height, 1.25);
    assert.equal(witness.label, "native-free");
    assert.equal(witness.same, true);
    assert.deepEqual(
      witness.result.entries.map(({ start, end }: { start: number; end: number }) => [start, end]),
      [
        [0, 2],
        [2, 3],
        [3, 46],
        [46, 48],
        [48, 91],
      ],
    );
    assert.deepEqual(
      witness.calls.map((call: unknown[]) => call.slice(1)),
      Array.from({ length: 5 }, () => [Number.MAX_SAFE_INTEGER, "/native-free", "Block extent"]),
    );
  } finally {
    fixture.cleanup();
  }
});

test("stack model source rejects erased unused host types after successful compilation", () => {
  const fixture = boundaryFixture("stack-model");
  try {
    writeFileSync(join(fixture.seam, "../host.ts"), 'export interface Host { tag: "host" }');
    appendFixture(join(fixture.seam, "stack-model.ts"), 'import type { Host } from "../host.js";');
    const entry = compileBoundary(fixture, true);
    assert.throws(() => compileBoundary(fixture), /Source boundary leak:/);
    for (const declaration of [false, true])
      emittedClosure(`${entry}${declaration ? ".d.ts" : ".js"}`, allowed(fixture, declaration), declaration);
  } finally {
    fixture.cleanup();
  }
});

const controls = [
  { name: "direct runtime", injection: 'export { host } from "../host.js";', runtime: true },
  { name: "transitive runtime", injection: 'export { host } from "./bridge.js";', runtime: true, bridge: true },
  { name: "type import", injection: 'import type { Host } from "../host.js"; export type Leak = Host;' },
  { name: "type import expression", injection: 'export type Leak = import("../host.js").Host;' },
  { name: "type re-export", injection: 'export type { Host } from "../host.js";' },
];

for (const control of controls) {
  test(`stack model boundary rejects ${control.name}`, () => {
    const fixture = boundaryFixture("stack-model");
    try {
      writeFileSync(join(fixture.seam, "../host.ts"), 'export const host = {}; export interface Host { tag: "host" }');
      if (control.bridge) writeFileSync(join(fixture.seam, "bridge.ts"), 'export { host } from "../host.js";');
      appendFixture(join(fixture.seam, "stack-model.ts"), control.injection);
      const entry = compileBoundary(fixture, true);
      assert.throws(() => compileBoundary(fixture), /Source boundary leak:/);
      assert.throws(() => emittedClosure(`${entry}.d.ts`, allowed(fixture, true), true), /Boundary leak:/);
      if (control.runtime)
        assert.throws(() => emittedClosure(`${entry}.js`, allowed(fixture, false), false), /Boundary leak:/);
      else emittedClosure(`${entry}.js`, allowed(fixture, false), false);
    } finally {
      fixture.cleanup();
    }
  });
}
