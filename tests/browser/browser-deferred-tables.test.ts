import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { prepareFont } from "@updf/fontkit";
import { chromium } from "playwright";
import { preview } from "vite";
import { deferredTableProof } from "../../apps/browser-fonts/deferred-table-proof.js";

test("F-AUD01 data/TSX deferred cell header/body/footer text and final contexts survive Node/Chromium", async () => {
  const server = await preview({
    configFile: new URL("../../apps/browser-fonts/vite.config.ts", import.meta.url).pathname,
    preview: { host: "127.0.0.1", port: 0 },
  });
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const directory = await mkdtemp("/tmp/opencode/updf-browser-deferred-tables-");
  try {
    const page = await browser.newPage(),
      url = server.resolvedUrls?.local[0];
    assert.ok(url);
    await page.goto(url);
    const font = prepareFont(
      new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
    );
    const data = deferredTableProof(font, "data"),
      jsx = deferredTableProof(font, "jsx");
    assert.deepEqual(data, jsx);
    assert.equal(data.contexts.length, 4);
    for (const mode of ["data", "jsx"] as const) {
      await page.locator(`#deferred-table-${mode}`).waitFor({ state: "attached" });
      assert.equal(await page.locator(`#deferred-table-${mode}`).textContent(), JSON.stringify(data));
    }
    const path = `${directory}/cells.pdf`;
    await writeFile(path, new Uint8Array(data.bytes));
    execFileSync("qpdf", ["--check", path]);
    const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    assert.match(text, /CAPTURED HEAD1 P1\/2 F0\/1[\s\S]*Привет ROW1[\s\S]*CAPTURED FOOT1 P1\/2 F0\/1/u);
    assert.match(text, /CAPTURED HEAD2 P2\/2 F0\/1[\s\S]*Привет ROW2[\s\S]*CAPTURED FOOT2 P2\/2 F0\/1/u);
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
