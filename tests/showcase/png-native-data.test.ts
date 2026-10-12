import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import test from "node:test";
import { chunk, container, header } from "../../packages/png/test/helpers.js";
import { pageErrors, pdf, site } from "./helpers.js";

function malformedStreams(): Buffer[] {
  const valid = deflateSync(Buffer.from([0, 1, 2, 0, 3, 4]), { level: 0 });
  const adler = Buffer.from(valid),
    complement = Buffer.from(valid);
  adler[adler.length - 1] = adler[adler.length - 1]! ^ 1;
  complement[5] = complement[5]! ^ 1;
  return [
    valid.subarray(0, -1),
    adler,
    complement,
    Buffer.concat([valid, Buffer.from([0])]),
    deflateSync(Buffer.alloc(100000)),
  ];
}

test("Chromium native inflate rejects invalid/trailing zlib and excess output with recoverable diagnostics", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    let bytes: Buffer = Buffer.alloc(0);
    await page.route("**/color-alpha-*.png", (route) => route.fulfill({ status: 200, body: bytes }));
    await page.goto(app.url);
    const original = await pdf(page);
    for (const compressed of malformedStreams()) {
      bytes = container(header(0), chunk("IDAT", compressed), chunk("IEND"));
      await page.getByLabel("Example", { exact: true }).selectOption("png");
      await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
      assert.deepEqual(await pdf(page), original);
      assert.match(await page.locator("#status").innerText(), /PNG_DATA/u);
    }
    await page.unroute("**/color-alpha-*.png");
    await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
    await pdf(page);
    assert.match(await page.locator("#status").innerText(), /color PNG with alpha/u);
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});
