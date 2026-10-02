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
