import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { Page } from "playwright";
import { prepareFont as kite } from "@updf/fontkite";
import { prepareFont as kit } from "@updf/fontkit";
import { fontUriExample } from "../../apps/showcase/src/font-uri.js";
import type { FontEngine, FontUriControls } from "../../apps/showcase/src/font-uri-controls.js";
import { pdf } from "./helpers.js";

export async function expectedPdf(engine: FontEngine, title = "Hello portable PDF", size = 18, weight = "Regular") {
  const bytes = new Uint8Array(
    await readFile(new URL(`../fixtures/fonts/LiberationSans-${weight}.ttf`, import.meta.url)),
  );
  const font = (engine === "fontkite" ? kite : kit)(bytes);
  return fontUriExample(font, title, size).bytes;
}
export async function argumentsFor(page: Page): Promise<FontUriControls> {
  return JSON.parse((await page.locator("#source-arguments").textContent())!).controls;
}
export async function fontkitChunks(): Promise<readonly string[]> {
  const graph: { fileName: string; modules: string[] }[] = JSON.parse(
    await readFile(new URL("../../apps/showcase/dist/chunk-graph.json", import.meta.url), "utf8"),
  );
  const files = graph
    .filter((chunk) => chunk.modules.some((name) => /\/(?:node_modules|packages)\/fontkit\//u.test(name)))
    .map((chunk) => chunk.fileName);
  assert.ok(files.length > 0, "Negative graph assertion needs a real Fontkit positive control");
  return files;
}

/** A slow first module lets a real UI choice supersede the default before either engine loads. */
export async function coldFontkite(page: Page, url: string): Promise<void> {
  let release: (() => Promise<void>) | undefined;
  const pattern = "**/optional-font-uri-*.js";
  await page.route(pattern, (route) => {
    release = () => route.continue();
  });
  await page.goto(url);
  await pdf(page);
  const request = page.waitForRequest(pattern);
  await page.getByLabel("Example", { exact: true }).selectOption("font-uri");
  await request;
  await page.getByLabel("Font engine", { exact: true }).selectOption("fontkite");
  assert.ok(release);
  await release();
  await page.unroute(pattern);
  assert.deepEqual(await pdf(page), await expectedPdf("fontkite"));
}

export async function switchRemoteEngines(page: Page): Promise<void> {
  const bytes = await readFile(new URL("../fixtures/fonts/LiberationSans-Bold.ttf", import.meta.url));
  let requests = 0;
  const uri = "https://font.invalid/shared.ttf";
  await page.route(uri, (route) => {
    requests++;
    return route.fulfill({ headers: { "access-control-allow-origin": "*" }, body: bytes });
  });
  await page.getByLabel("Font file URI", { exact: true }).fill(uri);
  await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
  assert.deepEqual(await pdf(page), await expectedPdf("fontkite", undefined, 18, "Bold"));
  await page.getByLabel("Font file URI", { exact: true }).fill("unsubmitted-draft");
  await page.getByLabel("Font engine", { exact: true }).selectOption("fontkit");
  assert.deepEqual(await pdf(page), await expectedPdf("fontkit", undefined, 18, "Bold"));
  assert.match(await page.locator("#status").innerText(), /Fontkit; preparation [\d.]+ ms/u);
  await page.getByLabel("Font engine", { exact: true }).selectOption("fontkite");
  assert.deepEqual(await pdf(page), await expectedPdf("fontkite", undefined, 18, "Bold"));
  assert.match(await page.locator("#status").innerText(), /Fontkite; reused prepared font/u);
  assert.deepEqual(await argumentsFor(page), { engine: "fontkite", uri, fontSize: 18 });
  assert.equal(requests, 1, "Both engines must prepare exactly the same downloaded bytes");
}
