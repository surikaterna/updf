import assert from "node:assert/strict";
import test from "node:test";
import { nativeData } from "../src/document-native.js";

test("internal native classifier rejects removed text and recognizes supported rich nodes", () => {
  assert.equal(nativeData([{ type: "text" }]), false);
  for (const type of ["richText", "rect", "line", "path", "paintGroup", "xObject"])
    assert.equal(nativeData([{ type }]), true);
  assert.equal(nativeData([{ type: "RichText" }]), false);
});
