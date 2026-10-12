import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { loadFont } from "@updf/fontkit/load";
import { fontUriExample } from "../../apps/showcase/src/font-uri.js";

test("font URI showcase uses the loaded face in real PDFs and handles both control-size endpoints", async () => {
  const directory = await mkdtemp("/tmp/opencode/updf-font-uri-");
  try {
    const font = await loadFont(
      new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
    );
    for (const size of [10, 32]) {
      const result = fontUriExample(font, "W".repeat(40), size);
      const path = join(directory, `${size}.pdf`);
      await writeFile(path, result.bytes);
      execFileSync("qpdf", ["--check", path]);
      assert.match(execFileSync("pdffonts", [path], { encoding: "utf8" }), /LiberationSans/u);
      const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
      assert.match(text, /shared span styling/u);
      assert.match(text, /Static TrueType only/u);
      assert.deepEqual(result.bytes, fontUriExample(font, "W".repeat(40), size).bytes);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
