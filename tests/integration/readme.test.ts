import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { cmrFixture, createCmrDocument } from "@updf/example-cmr/cmr";
import { bytes as heading } from "../../apps/node/dist/heading.js";
import { bytes as hello } from "../../apps/node/dist/hello.js";
import { fontBytes, svgBytes } from "../../apps/node/dist/optional.js";
import { render } from "../fixtures/text-options.js";

test("README complete TS/TSX sources stay synchronized and produce actual PDFs", async () => {
  const readme = await readFile(new URL("../../readme.md", import.meta.url), "utf8");
  for (const name of ["hello.ts", "heading.tsx"]) {
    const source = await readFile(new URL(`../../apps/node/src/${name}`, import.meta.url), "utf8");
    assert.ok(readme.includes(source.trim()), `README drift: ${name}`);
  }
  for (const bytes of [hello, heading, svgBytes, fontBytes]) {
    assert.ok(bytes instanceof Uint8Array && bytes.length > 100);
    assert.ok(new TextDecoder("ascii").decode(bytes.subarray(0, 8)).startsWith("%PDF-"));
  }
  assert.ok(fontBytes.length > 400000);
});

test("documented compiled standalone server command serves the exact CMR PDF", async () => {
  const child = spawn(process.execPath, [new URL("../../apps/node/dist/server.js", import.meta.url).pathname], {
    stdio: "pipe",
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Standalone server startup timeout")), 10000);
      child.stdout.once("data", (data) => {
        clearTimeout(timer);
        if (String(data).includes("http://127.0.0.1:3001/cmr.pdf")) resolve();
        else reject(new Error("Unexpected server startup output"));
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exited ${code}`));
      });
    });
    const response = await fetch("http://127.0.0.1:3001/cmr.pdf");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    const expected = render(createCmrDocument(cmrFixture));
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expected);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  }
});
