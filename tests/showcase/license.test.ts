import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { projectLicense } from "../../scripts/project-license.js";
import { site } from "./helpers.js";

test("showcase serves the full project MIT license under the configured project subpath", async () => {
  const server = await site();
  try {
    const page = await server.browser.newPage();
    await page.goto(server.url);
    const link = page.getByRole("link", { name: "Project MIT license", exact: true });
    const href = await link.getAttribute("href");
    assert.ok(href);
    const url = new URL(href, page.url());
    assert.equal(url.pathname, "/updf/notices/LICENSE");
    const response = await page.request.get(url.href);
    assert.equal(response.status(), 200);
    assert.equal(await response.text(), projectLicense);
    assert.equal(
      await readFile(new URL("../../apps/showcase/dist/notices/LICENSE", import.meta.url), "utf8"),
      projectLicense,
    );
    assert.match(await page.locator("footer").innerText(), /Copyright \(c\) 2026 Surikat AB/);
    assert.doesNotMatch(await page.locator("footer").innerText(), /unresolved/);
  } finally {
    await server.close();
  }
});
