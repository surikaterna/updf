import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createNoticeRenderer, sampleNotice } from "../../examples/agents/notice.js";

test("agent notice reuses composition, measures wrapping and preserves frozen caller data", () => {
  const renderer = createNoticeRenderer();
  const before = JSON.stringify(sampleNotice);
  assert.deepEqual(renderer.render(sampleNotice), renderer.render(sampleNotice));
  assert.equal(JSON.stringify(sampleNotice), before);
  const longer = { ...sampleNotice, message: "Measured variable content. ".repeat(20) };
  const original = renderer.document(sampleNotice).pages[0]?.children[4];
  const changed = renderer.document(longer).pages[0]?.children[4];
  assert.ok(original?.type === "richText" && changed?.type === "richText");
  assert.ok(changed.height > original.height);
  assert.deepEqual(renderer.render(sampleNotice), createNoticeRenderer().render(sampleNotice));
  assert.throws(() => renderer.render({ ...sampleNotice, recipient: "" }), /recipient/);
  assert.throws(() => renderer.render({ ...sampleNotice, issuedOn: "today" }), /issuedOn/);
  assert.throws(() => renderer.render({ ...sampleNotice, message: "Content ".repeat(2000) }), /use Flow/);
});

test("agent notice PDF passes qpdf and extracts expected labels within page bounds", async () => {
  const directory = await mkdtemp(join(tmpdir(), "updf-agent-notice-"));
  try {
    const path = join(directory, "notice.pdf");
    await writeFile(path, createNoticeRenderer().render(sampleNotice));
    execFileSync("qpdf", ["--check", path]);
    assert.match(execFileSync("pdfinfo", [path], { encoding: "utf8" }), /Pages:\s+1\b/);
    const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    for (const label of ["Document notice", "NOTICE-001", "2026-10-06", "Example Customer", "requested documents"]) {
      assert.ok(text.includes(label), label);
    }
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    const words = [...bbox.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)"/gu)];
    assert.ok(words.length > 20);
    for (const word of words) {
      assert.ok(Number(word[1]) >= 40 && Number(word[3]) <= 555);
      assert.ok(Number(word[2]) >= 40 && Number(word[4]) <= 802);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
