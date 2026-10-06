import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHelvetica, fontRuntime } from "@updf/fonts";
import { commands } from "../../packages/core/dist/cjs/core/content.js";
import { documentResources } from "../../packages/core/dist/cjs/core/document-resources.js";
import { literal, name } from "../../packages/core/dist/cjs/core/pdf-values.js";
import type { MeasuredPage } from "../../packages/core/dist/cjs/core/plan.js";
import { type DocumentResources, resourceSlot } from "../../packages/core/dist/cjs/core/resource-types.js";
import { serialize } from "../../packages/core/dist/cjs/core/serialize.js";
import { textSlot } from "../../packages/core/dist/cjs/core/text-paint.js";

const site = {
  text: "provider-owned",
  x: 10,
  baseline: 20,
  style: { font: "Helvetica", fontSize: 12, color: [0, 0, 0] as const },
  advance: 0,
  inkBounds: { empty: true } as const,
  runIndex: 0,
  source: { start: 0, end: 0 },
  run: fontRuntime().measure(createHelvetica(), "provider-owned", 12, "/synthetic").run,
  path: "/synthetic",
};
const page: MeasuredPage = {
  width: 200,
  height: 100,
  children: [
    {
      type: "richText",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      paragraphs: [],
      fragments: [site],
    },
  ],
};

function syntheticDocument(key: string) {
  const slot = resourceSlot<undefined>();
  const collected = documentResources(
    [page],
    [
      {
        slot,
        collectText(text, collection) {
          const resource = collection.intern(slot, key, () => ({
            category: "Font",
            phase: "bootstrap",
            payload: undefined,
            reserve(writer) {
              const ref = writer.reserve();
              return {
                ref,
                define: () =>
                  writer.define(ref, {
                    Type: name("Font"),
                    Subtype: name("Type1"),
                    BaseFont: name("Helvetica"),
                    Encoding: name("WinAnsiEncoding"),
                  }),
              };
            },
          }));
          collection.bindPainting(text.identity, textSlot, { resource, finish: () => literal("Expected text") });
        },
      },
    ],
  );
  const resources = trustedNames(collected, key);
  return {
    content: commands(page, { length: 0, maximum: Infinity }, resources.page(page)).join(""),
    bytes: serialize([page], resources),
  };
}

function trustedNames(collected: DocumentResources, key: string): DocumentResources {
  // Exercise trusted serializer boundaries independently of the core-owned naming allocator.
  return {
    page(page) {
      const selected = collected.page(page);
      return {
        resolve: selected.resolve,
        painting<T>(site: object, slot: Parameters<typeof selected.painting<T>>[1]) {
          return { ...selected.painting(site, slot), key };
        },
      };
    },
    open(writer) {
      const reserved = collected.open(writer);
      return {
        ...reserved,
        reserve(phase) {
          reserved.reserve(phase);
          const fonts = reserved.dictionary.Font;
          if (fonts && Object.hasOwn(fonts, "F1")) {
            const ref = fonts.F1!;
            delete fonts.F1;
            fonts[key] = ref;
          }
        },
      };
    },
  };
}

for (const [key, escaped] of [
  ["F1", "F1"],
  ["A B", "A#20B"],
  ["A#20B", "A#2320B"],
  ["A/B", "A#2FB"],
  ["A()<>[]{}/%B", "A#28#29#3C#3E#5B#5D#7B#7D#2F#25B"],
]) {
  test(`trusted lower-level font name ${JSON.stringify(key)} resolves in a complete PDF`, () => {
    assert.ok(key && escaped);
    const { content, bytes } = syntheticDocument(key);
    assert.equal(content, `0.5 w\nq\n0 0 0 rg\nBT /${escaped} 12 Tf 1 0 0 1 10 80 Tm (Expected text) Tj ET\nQ\n`);
    assert.ok(Buffer.from(bytes).toString("latin1").includes(`/${escaped} `));
    const directory = mkdtempSync(join(tmpdir(), "updf-text-names-"));
    try {
      const path = join(directory, "text.pdf");
      writeFileSync(path, bytes);
      const checked = spawnSync("qpdf", ["--check", path], { encoding: "utf8" });
      assert.ifError(checked.error);
      assert.equal(checked.status, 0, checked.stdout + checked.stderr);
      assert.equal(checked.stderr, "");
      const extracted = spawnSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
      assert.ifError(extracted.error);
      assert.equal(extracted.status, 0, extracted.stderr);
      assert.equal(extracted.stderr, "");
      assert.equal(extracted.stdout.trim(), "Expected text");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
