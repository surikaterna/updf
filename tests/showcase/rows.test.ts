import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { rowExample } from "../../apps/showcase/src/rows.js";
import { pageErrors, pdf, rendered, screenshot, site } from "./helpers.js";

test("#44 actual lazy Row showcase: Node/browser PDF parity, displayed source, accessible preview and controlled oversize", async () => {
  const expected = rowExample("Hello portable PDF");
  assert.equal(expected.result.pageCount, 5);
  assert.throws(
    () => rowExample("Hello portable PDF", true),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
  );
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(app.url);
    await pdf(page);
    assert.ok(!requests.some((url) => /optional-rows-/.test(url)));
    await page.getByLabel("Example", { exact: true }).selectOption("rows");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    assert.deepEqual(await pdf(page, "rows.pdf"), expected.bytes);
    await rendered(page, 5);
    await page.getByLabel("Generated PDF preview", { exact: true }).waitFor();
    const sources = await Promise.all(
      ["rows.tsx", "chart.ts", "optional-table-svg.ts", "optional-inline-svg.ts"].map((name) =>
        readFile(new URL(`../../apps/showcase/src/${name}`, import.meta.url), "utf8"),
      ),
    );
    assert.equal(
      await page.locator("#source").textContent(),
      `${sources[0]}\n// Imported external producer: chart.ts\n${sources[1]}\n// Imported SVG adapters: optional-table-svg.ts, optional-inline-svg.ts\n${sources[2]}\n${sources[3]}`,
    );
    assert.ok(requests.some((url) => /optional-rows-/.test(url)));
    await screenshot(page, "rows");
    await page.getByLabel("Example", { exact: true }).selectOption("rows-overflow");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Atomic Row exceeds a fresh page" }).waitFor();
    assert.deepEqual(await pdf(page), expected.bytes);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
