import { readFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { preview } from "vite";

export interface Chunk {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly modules: readonly string[];
  readonly bytes: number;
}

export function graph(): readonly Chunk[] {
  return JSON.parse(readFileSync(new URL("../../dist/chunk-graph.json", import.meta.url), "utf8"));
}

export async function withBrowser(run: (page: Page, origin: string) => Promise<void>): Promise<void> {
  const server = await preview({
    configFile: new URL("../../vite.config.ts", import.meta.url).pathname,
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string" || address.port === 4317) throw new Error("Unsafe preview address");
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.BROWSER_CHROMIUM ?? "/usr/bin/chromium",
    });
    const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 320, height: 800 } });
    await run(page, `http://127.0.0.1:${address.port}`);
  } finally {
    try {
      await browser?.close();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }
}

export async function complete(page: Page): Promise<void> {
  await page
    .locator("#status")
    .filter({ hasText: /^Complete/u })
    .waitFor();
}
