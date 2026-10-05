import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createUnicodeCmrDocument } from "@updf/example-cmr/cmr-unicode";
import { prepareFont } from "@updf/fontkit";
import { render } from "../fixtures/text-options.js";

test("all CMR fields use selected font and actual Cyrillic addresses/instructions extract", async () => {
  const font = prepareFont(
    new Uint8Array(await readFile(new URL("../fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url))),
  );
  const document = createUnicodeCmrDocument(font);
  assert.ok(
    document.pages[0]?.children.filter((node) => node.type === "text").every((node) => node.font === "CmrFont"),
  );
  const bytes = render(document, { resources: { CmrFont: font } });
  const directory = await mkdtemp(join(tmpdir(), "cmr-unicode-"));
  try {
    const path = join(directory, "cmr.pdf");
    await writeFile(path, bytes);
    execFileSync("qpdf", ["--check", path]);
    assert.match(
      execFileSync("pdffonts", [path], { encoding: "utf8" }),
      /LiberationSans\s+CID TrueType\s+Identity-H\s+yes\s+no\s+yes/,
    );
    const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    for (const anchor of [
      "Северные товары",
      "Магазин Пример",
      "Беречь от влаги",
      "Total: 200 kg",
      "Experimental CMR subset - not operational",
    ]) {
      assert.ok(text.includes(anchor));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
