import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { visualPreparationCostInput } from "../../scripts/visual-preparation-cost-input.js";

type Proof = {
  captures: number;
  geometry: number;
  resolutions: number;
  prepared: number;
  scopes: string[];
  paths: string[];
  ids: string[];
  collections: number;
  missingProviderRejected: boolean;
  heights: number[];
  keys: string[][];
  bindings: string[];
  bytes: number[];
};

async function bundle(platform: "node" | "browser") {
  const built = await build({
    stdin: { contents: visualPreparationCostInput(), resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    platform,
    format: platform === "node" ? "esm" : "iife",
    ...(platform === "browser" ? { globalName: "VisualPreparationProof" } : {}),
    target: "es2022",
    write: false,
  });
  return built.outputFiles[0]!.text;
}

function assertNativeProof(result: Proof) {
  assert.equal(result.captures, 2);
  assert.equal(result.geometry, 2);
  assert.equal(result.resolutions, 2);
  assert.equal(result.prepared, 2);
  assert.equal(result.collections, 2);
  assert.equal(result.missingProviderRejected, true);
  assert.deepEqual(result.scopes, ["left", "right"]);
  assert.deepEqual(result.heights, [14, 14]);
  assert.deepEqual(result.bindings, ["Prepared0"]);
  assert.deepEqual(result.ids, [result.bindings[0], result.bindings[0]]);
  assert.equal(result.paths.length, 2);
  assert.deepEqual(result.keys, [["ordinary"], ["floating"]]);
  assert.deepEqual(result.paths, [
    "/document/children/children/0/provider/expanded/content/0/children/0",
    "/document/children/children/1/provider/expanded/children/0",
  ]);
  const pdf = Buffer.from(result.bytes).toString("latin1");
  assert.equal((pdf.match(/\/Subtype \/Form\b/g) ?? []).length, 1);
  const draws = [...pdf.matchAll(/\/(\w+) Do\b/g)];
  assert.equal(draws.length, 2);
  assert.equal(draws[0]![1], draws[1]![1]);
  assert.ok(pdf.includes("0 0 1 1 re f\n"));
}

async function browserProof(source: string): Promise<Proof> {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
  });
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const requests: string[] = [];
    await context.route("**/*", (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    // Inline injection requires no test server or live assets; every network route is denied.
    await page.addScriptTag({ content: source });
    const result = await page.evaluate(async () => {
      const api = (globalThis as unknown as { VisualPreparationProof: { proof(): Promise<Proof> } })
        .VisualPreparationProof;
      globalThis.fetch = async () => {
        throw Error("Unexpected fetch in offline native proof");
      };
      return api.proof();
    });
    assert.deepEqual(requests, []);
    return result;
  } finally {
    await browser.close();
  }
}

async function nodeProof(source: string): Promise<Proof> {
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const fetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("Unexpected fetch in offline native proof");
  };
  try {
    return await api.proof();
  } finally {
    globalThis.fetch = fetch;
  }
}

test("offline prepared ordinary and floating visuals consume one native Form in Node and Chrome", async () => {
  const node = await nodeProof(await bundle("node"));
  const browser = await browserProof(await bundle("browser"));
  assertNativeProof(node);
  assertNativeProof(browser);
  assert.deepEqual(browser, node);
  const out = "artifacts/visual-preparation-bridge-fixed";
  await mkdir(out, { recursive: true });
  await writeFile(`${out}/native-node.pdf`, Buffer.from(node.bytes));
  await writeFile(`${out}/native-chrome.pdf`, Buffer.from(browser.bytes));
  for (const platform of ["node", "chrome"]) {
    const report = execFileSync("qpdf", ["--check", `${out}/native-${platform}.pdf`], { encoding: "utf8" });
    await writeFile(`${out}/qpdf-${platform}.log`, report);
  }
  await writeFile(
    `${out}/native-proof.json`,
    JSON.stringify({ ...node, bytes: node.bytes.length, networkRequests: 0 }, null, 2),
  );
});
