import assert from "node:assert/strict";

export function checkCoreArtifacts(paths: readonly string[]): void {
  for (const path of paths) {
    assert.ok(
      !/^dist\/(?:cjs\/|node\/)?(?:fonts\/|core\/(?:fixed-text|metrics)\.|measurement\/(?:index|inline-paint|measure|source|validate|wrap)\.)/u.test(
        path,
      ),
      `Obsolete core font/text artifact: ${path}`,
    );
  }
}

export function checkTextArtifacts(paths: readonly string[]): void {
  for (const path of paths)
    assert.ok(!/^dist\/(?:cjs\/|node\/)?fixed-text\./u.test(path), `Obsolete fixed text artifact: ${path}`);
}
