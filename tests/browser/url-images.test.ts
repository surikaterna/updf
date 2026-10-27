import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";
import { urlImageInput } from "../../scripts/url-image-cost-inputs.js";

type Proof = { fetches: number; policies: number; bytes: number[]; control: number[]; again: number[] };
async function bundle(platform: "node" | "browser") {
  const output = await build({
    stdin: { contents: urlImageInput(), resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    platform,
    format: platform === "node" ? "esm" : "iife",
    ...(platform === "browser" ? { globalName: "UrlImageProof" } : {}),
    target: "es2022",
    write: false,
  });
  return output.outputFiles[0]!.text;
}

async function browserProof(): Promise<Proof> {
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
    await page.addScriptTag({ content: await bundle("browser") });
    const result = await page.evaluate(async () => {
      globalThis.fetch = async () => {
        throw Error("ambient network forbidden");
      };
      return (globalThis as unknown as { UrlImageProof: { proof(): Promise<Proof> } }).UrlImageProof.proof();
    });
    assert.deepEqual(requests, []);
    return result;
  } finally {
    await browser.close();
  }
}

async function nodeProof(): Promise<Proof> {
  const api = await import(`data:text/javascript;base64,${Buffer.from(await bundle("node")).toString("base64")}`);
  const previous = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("ambient network forbidden");
  };
  try {
    return await api.proof();
  } finally {
    globalThis.fetch = previous;
  }
}

test("real mixed URL PNG/JPEG ordinary+floating Images render native PDFs offline in Node and Chrome", async () => {
  const out = "artifacts/url-images-runtime-after";
  await mkdir(out, { recursive: true });
  const results = { node: await nodeProof(), chrome: await browserProof() };
  for (const [host, result] of Object.entries(results)) {
    assert.deepEqual(result.bytes, result.control);
    assert.deepEqual(result.again, result.control);
    assert.equal(result.fetches, 4);
    const pdf = Buffer.from(result.bytes);
    assert.ok(pdf.includes(Buffer.from("/DCTDecode")));
    assert.ok(pdf.includes(Buffer.from("/FlateDecode")));
    await writeFile(`${out}/native-${host}.pdf`, pdf);
    await writeFile(`${out}/qpdf-${host}.log`, execFileSync("qpdf", ["--check", `${out}/native-${host}.pdf`]));
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", `${out}/native-${host}.pdf`, `${out}/native-${host}`]);
  }
  assert.deepEqual(await readFile(`${out}/native-node.ppm`), await readFile(`${out}/native-chrome.ppm`));
  await writeFile(
    `${out}/native-proof.json`,
    JSON.stringify(
      {
        node: { fetches: results.node.fetches, bytes: results.node.bytes.length },
        chrome: { fetches: results.chrome.fetches, bytes: results.chrome.bytes.length },
        preparedControlBytes: "equal in each host",
        normalizedPixels: "equal across hosts",
        ambientRequests: 0,
      },
      null,
      2,
    ),
  );
});
