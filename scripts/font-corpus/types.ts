import assert from "node:assert/strict";

export interface Asset {
  readonly url: string;
  readonly size: number;
  readonly sha256: string;
}
export type Expectation =
  | { readonly kind: "supported" }
  | {
      readonly kind: "unsupported";
      readonly code: string;
      readonly message: string;
      readonly reason: string;
    };
export interface CorpusFont {
  readonly id: string;
  readonly font: Asset;
  readonly license: Asset;
  readonly licenseId: "OFL-1.1";
  readonly tags: readonly string[];
  readonly expected: Expectation;
}
export function validateAsset(asset: Asset): void {
  assert.match(asset.sha256, /^[a-f0-9]{64}$/u, "Expected SHA-256 cache identity");
  assert.ok(Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= 4 * 1024 * 1024, "Invalid asset size");
  const url = new URL(asset.url);
  assert.equal(url.origin, "https://raw.githubusercontent.com", "Only pinned raw GitHub assets are allowed");
  assert.equal(url.search + url.hash + url.username + url.password, "");
  assert.match(url.pathname, /^\/[^/]+\/[^/]+\/[a-f0-9]{40}\/.+/u, "Expected commit-pinned source URL");
}
export function validateCorpus(fonts: readonly CorpusFont[]): void {
  assert.ok(fonts.length > 0 && fonts.length <= 100, "Empty or excessive corpus");
  const ids = new Set<string>();
  const sizes = new Map<string, number>();
  for (const item of fonts) {
    assert.match(item.id, /^[a-z0-9-]+$/u);
    assert.ok(!ids.has(item.id), "Duplicate corpus ID");
    ids.add(item.id);
    assert.equal(item.licenseId, "OFL-1.1");
    assert.ok(item.expected.kind === "supported" || item.expected.kind === "unsupported");
    for (const asset of [item.font, item.license]) {
      validateAsset(asset);
      assert.ok(!sizes.has(asset.sha256) || sizes.get(asset.sha256) === asset.size, "Conflicting content size");
      sizes.set(asset.sha256, asset.size);
    }
  }
}
