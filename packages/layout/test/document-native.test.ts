import assert from "node:assert/strict";
import test from "node:test";
import { isNativeNodeDataArray as nativeData } from "@updf/core/internal-drawing";

test("internal native classifier rejects removed text and recognizes supported rich nodes", () => {
  assert.equal(nativeData([{ type: "text" }]), false);
  for (const type of ["richText", "rect", "line", "path", "paintGroup", "xObject"])
    assert.equal(nativeData([{ type }]), true);
  assert.equal(nativeData([{ type: "RichText" }]), false);
});
