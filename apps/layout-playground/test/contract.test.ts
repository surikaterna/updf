import assert from "node:assert/strict";
import { test } from "node:test";
import { exportNative, lowerLine, MARGIN, prepareParagraph } from "../src/pdf.js";

test("D.1 reconstructs public native lines with whitespace and original UTF16 spans", () => {
  const text = "  Hello world this is a paragraph with words.\n\n Next line.  \n";
  const paragraph = prepareParagraph(text, 120);
  let recovered = "";
  const children = [];
  for (const line of paragraph.lines) {
    for (const fragment of line.fragments) {
      assert.equal(text.slice(fragment.source.start, fragment.source.end), fragment.text);
      recovered += fragment.text;
    }
    if (line.breakReason === "hard") recovered += "\n";
    const node = lowerLine({ line, x: MARGIN, y: MARGIN + line.top, width: paragraph.width });
    if (node) children.push(node);
  }
  assert.equal(recovered, text);
  const bytes = exportNative({ version: 1, pages: [{ width: 160, height: paragraph.height + 40, children }] });
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 8)), "%PDF-1.4");
});

test("D.1 rejects unsupported characters and bounds", () => {
  for (const text of ["tab\t", "é", "\r", "a".repeat(8001)]) {
    assert.throws(() => prepareParagraph(text, 120), { code: "CHARACTER", path: "/text" });
  }
});
