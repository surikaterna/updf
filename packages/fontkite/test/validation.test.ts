import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { prepareFont } from "@updf/fontkite";
import { entry, fixture, offset, rejects } from "./helpers.js";

test("byte budgets, signatures and unsupported features fail explicitly", async () => {
  rejects(new Uint8Array(4 * 1024 * 1024 + 1), "LIMIT");
  rejects(new Uint8Array(1));
  for (const tag of ["ttcf", "wOFF", "wOF2", "OTTO", "junk"]) {
    const bytes = await fixture();
    bytes.set(Array.from(tag, (char) => char.charCodeAt(0)));
    rejects(bytes);
  }
  for (const tag of ["CFF ", "CFF2", "fvar", "gvar", "HVAR", "COLR", "CPAL", "sbix", "SVG ", "CBDT"]) {
    const bytes = await fixture();
    bytes.set(
      Array.from(tag, (char) => char.charCodeAt(0)),
      entry(bytes, "kern"),
    );
    rejects(bytes);
  }
});

test("table-local truncation, directory overlaps and loca corruption are rejected", async () => {
  const original = await fixture();
  rejects(original.slice(0, 100));
  for (const tag of ["head", "hhea", "maxp", "hmtx", "loca", "OS/2", "name", "post", "cmap"]) {
    const bytes = original.slice();
    new DataView(bytes.buffer).setUint32(entry(bytes, tag) + 12, 1);
    rejects(bytes);
  }
  const overlap = original.slice(),
    view = new DataView(overlap.buffer);
  view.setUint32(entry(overlap, "glyf") + 8, offset(overlap, "head"));
  rejects(overlap);
  const loca = original.slice();
  new DataView(loca.buffer).setUint32(offset(loca, "loca"), 0xffffffff);
  rejects(loca);
});

test("embedding restrictions and no-subsetting flag are preserved", async () => {
  for (const flag of [2, 0x200, 0x10, 0xffff]) {
    const bytes = await fixture();
    new DataView(bytes.buffer).setUint16(offset(bytes, "OS/2") + 8, flag);
    rejects(bytes, "FONT_RIGHTS");
  }
  for (const [flag, right] of [
    [4, "preview-print"],
    [8, "editable"],
    [0x100, "installable"],
  ] as const) {
    const bytes = await fixture();
    new DataView(bytes.buffer).setUint16(offset(bytes, "OS/2") + 8, flag);
    assert.equal(prepareFont(bytes).metadata.embeddingRights, right);
  }
});

test("narrower name/OS2 profile and invalid cmap/name pointers are structured errors", async () => {
  for (const [tag, delta, value] of [
    ["OS/2", 0, 1],
    ["name", 0, 1],
    ["name", 2, 65535],
  ] as const) {
    const bytes = await fixture();
    new DataView(bytes.buffer).setUint16(offset(bytes, tag) + delta, value);
    rejects(bytes);
  }
  const bytes = await fixture();
  new DataView(bytes.buffer).setUint32(offset(bytes, "cmap") + 8, 0xffffffff);
  rejects(bytes);
  assert.ok(prepareFont(await fixture()).metadata.glyphs.length > 1000);
});

test("seeded table mutations and truncations never escape as raw parser exceptions", async () => {
  const original = await fixture();
  const tables = ["cmap", "glyf", "loca", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post"];
  let state = 0x4b495445;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  for (let i = 0; i < 80; i++) {
    const bytes = original.slice(),
      tag = tables[i % tables.length]!;
    const view = new DataView(bytes.buffer),
      start = offset(bytes, tag),
      length = view.getUint32(entry(bytes, tag) + 12);
    bytes[start + (next() % length)] = next() & 255;
    const input = i % 4 === 0 ? bytes.slice(0, next() % bytes.length) : bytes;
    try {
      prepareFont(input);
    } catch (error) {
      assert.ok(error instanceof DocumentError);
    }
  }
  assert.ok(prepareFont(original).metadata.glyphs.length > 1000);
});
