import assert from "node:assert/strict";
import test from "node:test";
import {
  activateFontUri,
  fontUriControls,
  fontUriDefaults,
  resetFontUri,
  validateFontUriControls,
  type FontUriControls,
} from "../../apps/showcase/src/font-uri-controls.js";

function form(uri: string, engine: string): HTMLFormElement {
  return {
    querySelector: (selector: string) => {
      if (selector === "#font-uri") return { value: uri };
      if (selector === "#font-engine") return { value: engine };
      if (selector === "#font-uri-size") return { valueAsNumber: 24 };
      throw new Error(`Unexpected selector ${selector}`);
    },
  } as unknown as HTMLFormElement;
}

test("engine switches use active bytes/URI, while ordinary edits ignore uncommitted engine and URI drafts", () => {
  resetFontUri();
  activateFontUri("https://example.test/active.ttf", "fontkit");
  const input = form("  https://example.test/draft.ttf  ", "fontkite");
  assert.deepEqual(fontUriControls(input), { engine: "fontkit", uri: "https://example.test/active.ttf", fontSize: 24 });
  assert.deepEqual(fontUriControls(input, "engine"), {
    engine: "fontkite",
    uri: "https://example.test/active.ttf",
    fontSize: 24,
  });
  assert.deepEqual(fontUriControls(input, "submit"), {
    engine: "fontkite",
    uri: "https://example.test/draft.ttf",
    fontSize: 24,
  });
  assert.equal(fontUriControls(input).engine, "fontkit", "reading a proposal must not activate it");
  activateFontUri("https://example.test/active.ttf", "fontkite");
  assert.equal(fontUriControls(input).engine, "fontkite");
  resetFontUri();
  assert.deepEqual(fontUriControls(input), { ...fontUriDefaults, fontSize: 24 });
});

test("unknown engines fail instead of silently selecting Fontkit", () => {
  for (const engine of ["", "automatic", undefined, 1]) {
    assert.throws(
      () => validateFontUriControls({ ...fontUriDefaults, engine } as unknown as FontUriControls),
      /Font engine/u,
    );
  }
  assert.throws(() => fontUriControls(form("", "automatic"), "engine"), /Font engine/u);
});
