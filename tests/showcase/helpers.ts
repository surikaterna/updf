import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { preview } from "vite";

export async function site() {
  const server = await preview({
    configFile: new URL("../../apps/showcase/vite.config.ts", import.meta.url).pathname,
    preview: { host: "127.0.0.1", port: 0 },
  });
  try {
    const browser = await chromium.launch({
      executablePath: process.env.SHOWCASE_CHROMIUM ?? "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const url = server.resolvedUrls?.local[0];
    assert.ok(url);
    assert.ok(url.endsWith("/updf/"));
    return {
      browser,
      url,
      close: async () => {
        await browser.close();
        await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
      },
    };
  } catch (error) {
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
    throw error;
  }
}

export async function pdf(page: Page, savedName?: string): Promise<Uint8Array> {
  await page.locator('#demo-form[aria-busy="false"]').waitFor();
  const link = page.getByRole("link", { name: "Download PDF", exact: true });
  await link.waitFor();
  const result = await link.evaluate(async (element) => {
    if (!(element instanceof HTMLAnchorElement)) throw new Error("Expected anchor");
    const response = await fetch(element.href);
    return {
      type: response.headers.get("content-type"),
      bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
    };
  });
  assert.equal(result.type, "application/pdf");
  const bytes = new Uint8Array(result.bytes);
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith("%PDF-"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  const event = page.waitForEvent("download");
  await link.click();
  const download = await event;
  const directory = new URL("../../artifacts/showcase/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await download.saveAs(new URL(savedName ?? download.suggestedFilename(), directory).pathname);
  const path = await download.path();
  assert.ok(path);
  assert.deepEqual(new Uint8Array(await readFile(path)), bytes);
  assert.equal(await page.locator("#open").getAttribute("href"), await link.getAttribute("href"));
  return bytes;
}

export async function rendered(page: Page, count = 1): Promise<number[]> {
  await page.locator('#demo-form[aria-busy="false"]').waitFor();
  const canvases = page.locator("#preview canvas");
  assert.equal(await canvases.count(), count);
  const ink = await canvases.evaluateAll((elements) =>
    elements.map((element) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
      const context = element.getContext("2d");
      if (!context) throw new Error("Missing context");
      const data = context.getImageData(0, 0, element.width, element.height).data;
      let dark = 0;
      let white = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i + 3] ?? 0) < 200) continue;
        if ((data[i] ?? 255) < 100 && (data[i + 1] ?? 255) < 100 && (data[i + 2] ?? 255) < 100) dark += 1;
        if ((data[i] ?? 0) > 245 && (data[i + 1] ?? 0) > 245 && (data[i + 2] ?? 0) > 245) white += 1;
      }
      return { dark, white, total: data.length / 4 };
    }),
  );
  assert.ok(
    ink.every(({ dark, white, total }) => dark > 100 && white > total * 0.2),
    `Expected opaque PDF marks on paper, got ${JSON.stringify(ink)}`,
  );
  return ink.map(({ dark }) => dark);
}

export async function source(page: Page, name: string): Promise<void> {
  const expected = await readFile(new URL(`../../apps/showcase/src/${name}`, import.meta.url), "utf8");
  assert.equal(await page.locator("#source").textContent(), expected);
}

export async function observeUrls(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    const active = new Set<string>();
    Object.assign(window, { activePdfUrls: active });
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
  });
}

export function pageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: new URL(`../../artifacts/showcase/${name}.png`, import.meta.url).pathname,
    fullPage: true,
  });
}
