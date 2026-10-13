import assert from "node:assert/strict";
import test from "node:test";
import { mappings } from "../src/cmap.js";
import { Reader } from "../src/reader.js";
import { diagnostic } from "./helpers.js";
import { words } from "./outline-helpers.js";

function grouped(groups: readonly (readonly number[])[]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(28 + groups.length * 12),
    view = new DataView(bytes.buffer);
  bytes.set(words([0, 1, 3, 10, 0, 12, 12, 0]));
  view.setUint32(16, 16 + groups.length * 12);
  view.setUint32(24, groups.length);
  for (const [i, group] of groups.entries()) {
    for (const [j, value] of group.entries()) view.setUint32(28 + i * 12 + j * 4, value);
  }
  return bytes;
}

test("format12 mappings preserve non-BMP scalars and filter unsupported text", () => {
  const result = mappings(
    new Reader(
      grouped([
        [65, 66, 1],
        [0x301, 0x301, 3],
        [0x10780, 0x10780, 4],
      ]),
    ),
    5,
  );
  assert.deepEqual(
    [...result],
    [
      [65, 1],
      [66, 2],
      [0x10780, 4],
    ],
  );
});

test("format12 rejects overlapping, out-of-range, truncated and excessive groups", () => {
  for (const groups of [
    [[65, 64, 1]],
    [
      [65, 66, 1],
      [66, 67, 3],
    ],
    [[0x110000, 0x110000, 1]],
    [[65, 66, 4]],
  ]) {
    assert.throws(() => mappings(new Reader(grouped(groups)), 5), diagnostic());
  }
  assert.throws(() => mappings(new Reader(grouped([[65, 66, 1]]).slice(0, -1)), 5), diagnostic());
  const bytes = grouped([]);
  new DataView(bytes.buffer).setUint32(24, 65536);
  assert.throws(() => mappings(new Reader(bytes), 5), diagnostic("LIMIT"));
});

test("format4 range arrays apply delta only to nonzero IDs and validate pointers", () => {
  const bytes = words([0, 1, 3, 1, 0, 12, 4, 38, 0, 4, 4, 1, 0, 67, 65535, 0, 65, 65535, 1, 1, 4, 0, 1, 0, 2]);
  assert.deepEqual(
    [...mappings(new Reader(bytes), 5)],
    [
      [65, 2],
      [67, 3],
    ],
  );
  const malformed = bytes.slice();
  new DataView(malformed.buffer).setUint16(40, 2);
  assert.throws(() => mappings(new Reader(malformed), 5), diagnostic());
});
