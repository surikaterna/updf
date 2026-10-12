import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { Browser } from "playwright";
import type { Profile } from "./competitors.js";
import { type Bundle, sum } from "./build.js";

export async function inputs(root: string) {
  const read = async (path: string) => Array.from(await readFile(resolve(root, "tests/fixtures", path)));
  return {
    text: "Hello bundle",
    svg: '<svg viewBox="0 0 20 10"><rect width="20" height="10" fill="red"/></svg>',
    jpeg: await read("jpeg/color-1x1.jpg"),
    png: await read("png/color-alpha.png"),
    font: await read("fonts/LiberationSans-Regular.ttf"),
    prepared: JSON.parse(await readFile(resolve(root, "tests/fixtures/fonts/liberation-sans.json"), "utf8")),
  };
}

export async function smoke(
  browser: Browser,
  profile: Profile,
  report: Bundle,
  output: string,
  payload: Awaited<ReturnType<typeof inputs>>,
) {
  const page = await browser.newPage();
  const loaded = new Set<string>();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://bundle.test") return route.abort();
    if (url.pathname === "/")
      return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Bundle proof</title>" });
    const file = resolve(output, `.${url.pathname}`);
    if (!file.startsWith(`${output}${sep}`)) return route.abort();
    loaded.add(url.pathname);
    await route.fulfill({ contentType: "text/javascript", path: file });
  });
  try {
    await page.goto("http://bundle.test/");
    const result = await page.evaluate(
      async ({ id, input, measurement }) => {
        const api = await import(`/${id}/entry.js`);
        const value = await api.run({
          ...input,
          jpeg: new Uint8Array(input.jpeg),
          png: new Uint8Array(input.png),
          font: new Uint8Array(input.font),
          prepared: { ...input.prepared, bytes: new Uint8Array(input.font) },
        });
        if (measurement) return { measurement: JSON.stringify(value), bytes: [] };
        return { measurement: "", bytes: Array.from(value as Uint8Array) };
      },
      { id: profile.id, input: payload, measurement: !!profile.measurement },
    );
    assert.deepEqual(errors, []);
    await validate(profile, result, output);
    for (const file of report.files.filter((file) => file.initial))
      assert.ok(loaded.has(`/${profile.id}/${file.path}`), `${profile.id}: static closure must actually load`);
    const files = report.files.filter((file) => loaded.has(`/${profile.id}/${file.path}`));
    return { status: "passed", loaded: sum(files), requests: [...loaded] };
  } finally {
    await page.close();
  }
}

async function validate(profile: Profile, result: { measurement: string; bytes: number[] }, output: string) {
  if (profile.measurement) {
    assert.ok(result.measurement.includes('"lines"'));
    return;
  }
  const bytes = Buffer.from(result.bytes);
  assert.ok(bytes.subarray(0, 8).toString().startsWith("%PDF-"));
  const path = resolve(output, profile.id, "sample.pdf");
  await writeFile(path, bytes);
  execFileSync("qpdf", ["--check", path], { stdio: "pipe" });
  if (profile.library !== "uPDF" || /text|layout|tables|full|prepared|fontkit/iu.test(profile.id)) {
    const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
    assert.ok(/Hello bundle|Москва/u.test(text), `${profile.id}: supplied text must survive`);
  }
  if (/images|jpeg|png|full/iu.test(profile.id)) {
    const images = execFileSync("pdfimages", ["-list", path], { encoding: "utf8" });
    assert.ok(/\bimage\b/u.test(images), `${profile.id}: image must be embedded`);
    if (/images|png|full/iu.test(profile.id))
      assert.ok(/\bsmask\b/u.test(images), `${profile.id}: alpha mask must be embedded`);
  }
}
