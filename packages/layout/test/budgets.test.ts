import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { layoutFlow } from "@updf/layout";
import { fixed, flow } from "./fixtures.js";

test("repeated template output reserves optional cumulative text/node limits before copying pages", () => {
  const body = Array.from({ length: 19 }, () => ({ type: "pageBreak" as const }));
  const header = {
    height: 10,
    children: [
      { ...fixed("A".repeat(3000)), width: 50000 },
      { ...fixed("B".repeat(3000)), width: 50000 },
    ],
  };
  assert.throws(
    () => layoutFlow(flow(body, { width: 50000, header }), { profile: "service" }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "LIMIT" &&
      error.diagnostics[0]?.path === "/body/15",
  );
  const many = { height: 10, children: Array.from({ length: 600 }, () => fixed("A")) };
  assert.throws(
    () => layoutFlow(flow(body, { header: many }), { profile: "service" }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});
