import assert from "node:assert/strict";
import test from "node:test";
import { projectLicense, validatePackedNotices, validateProjectLicense } from "../../scripts/project-license.js";

test("the full authoritative project MIT license is required, not metadata or partial clauses", () => {
  assert.doesNotThrow(() => validateProjectLicense(projectLicense));
  for (const text of [
    "MIT",
    projectLicense.split("Permission")[0] ?? "",
    projectLicense.replace("Copyright (c) 2026 Surikat AB", "Copyright (c) 2025 Someone Else"),
    projectLicense.replace("copies or substantial portions of the Software.", ""),
    projectLicense.split('THE SOFTWARE IS PROVIDED "AS IS"')[0] ?? "",
  ]) {
    assert.throws(() => validateProjectLicense(text), /Full authoritative project MIT license/);
  }
});

test("packed licenses must be present and complete, with any required third-party notice unchanged", () => {
  const fontello = "retained third-party notice\n";
  const contents = new Map([
    ["LICENSE", projectLicense],
    ["LICENSE.svgpath", fontello],
  ]);
  assert.doesNotThrow(() => validatePackedNotices(contents));
  assert.doesNotThrow(() => validatePackedNotices(contents, fontello));
  assert.throws(() => validatePackedNotices(new Map()), /Packed project LICENSE is required/);
  contents.set("LICENSE", "MIT");
  assert.throws(() => validatePackedNotices(contents), /Full authoritative project MIT license/);
  contents.set("LICENSE", projectLicense);
  contents.delete("LICENSE.svgpath");
  assert.throws(() => validatePackedNotices(contents, fontello), /Packed Fontello notice/);
  contents.set("LICENSE.svgpath", "replacement notice");
  assert.throws(() => validatePackedNotices(contents, fontello), /Packed Fontello notice/);
});
