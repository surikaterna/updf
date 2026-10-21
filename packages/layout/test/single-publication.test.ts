import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { prepare } from "../dist/blocks.js";
import { Paginator } from "../dist/paginator.js";
import { template } from "../dist/template.js";
import { flow } from "./fixtures.js";

test("paginator exposes no alternate atomic/metric-only admission entry", () => {
  for (const name of ["atomic", "fit", "fits"]) assert.equal(name in Paginator.prototype, false);
});

test("publication requires the accepted origin and cannot recompute it", () => {
  const source = ts.createSourceFile(
    "paginator.ts",
    readFileSync(new URL("../src/paginator.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(ts.isClassDeclaration)!;
  const place = declaration.members.find(
    (member): member is ts.MethodDeclaration =>
      ts.isMethodDeclaration(member) && member.name.getText(source) === "place",
  )!;
  const origin = place.parameters[2]!;
  assert.equal(origin.name.getText(source), "acceptedY");
  assert.equal(origin.questionToken, undefined);
  assert.equal(origin.initializer, undefined);
  assert.doesNotMatch(place.body!.getText(source), /materializedStart|tryMaterializedStart|\?\?/);
});

test("page controls still publish their cursor coordinate before advancing", () => {
  const operation = createDrawingLayoutOperation({});
  try {
    const geometry = template(flow([], { margins: { top: 2, right: 0, bottom: 0, left: 0 } }).pageTemplate, operation);
    const paginator = new Paginator(geometry, operation.policy);
    paginator.consume(prepare({ type: "fixed", height: 3, children: [] }, 100, "/first", operation), 0);
    paginator.consume(prepare({ type: "pageBreak" }, 100, "/break", operation), 1);
    paginator.consume(prepare({ type: "fixed", height: 1, children: [] }, 100, "/last", operation), 2);
    assert.deepEqual(
      paginator.placements.map(({ pageIndex, box }) => [pageIndex, box.y, box.height]),
      [
        [0, 2, 3],
        [0, 5, 0],
        [1, 2, 1],
      ],
    );
  } finally {
    operation.close();
  }
});
