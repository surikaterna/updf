import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readCached, verify } from "../font-corpus/cache.js";
import { corpus } from "../font-corpus/manifest.js";

export interface SeedFont {
  readonly id: string;
  readonly sha256: string;
  readonly size: number;
  readonly fixture?: string;
}
const fixtures: readonly SeedFont[] = [
  {
    id: "fixture-liberation-regular",
    fixture: "LiberationSans-Regular.ttf",
    size: 410712,
    sha256: "76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8",
  },
  {
    id: "fixture-liberation-bold",
    fixture: "LiberationSans-Bold.ttf",
    size: 414456,
    sha256: "788abee4c806d660e8aee46689dd8540cd4bb98da03dcc9d171ce3efd99a9173",
  },
];
export function seeds(suite: string, id?: string): readonly SeedFont[] {
  assert.ok(["fixtures", "corpus", "all"].includes(suite), "Unknown fuzz suite");
  const remote = corpus
    .filter((item) => item.expected.kind === "supported")
    .map((item) => ({
      id: item.id,
      sha256: item.font.sha256,
      size: item.font.size,
    }));
  const selected = (suite === "fixtures" ? fixtures : suite === "corpus" ? remote : [...fixtures, ...remote]).filter(
    (font) => !id || font.id === id,
  );
  assert.ok(selected.length, "No matching fuzz seeds");
  return selected;
}
async function local(source: SeedFont): Promise<Uint8Array<ArrayBuffer>> {
  const url = new URL(`../../tests/fixtures/fonts/${source.fixture}`, import.meta.url);
  const bytes = new Uint8Array(source.size);
  let at = 0;
  for await (const chunk of createReadStream(url)) {
    assert.ok(chunk.length <= bytes.length - at, "Fixture exceeds pinned size");
    bytes.set(chunk, at);
    at += chunk.length;
  }
  const result = bytes.slice(0, at);
  verify(result, { ...source, url: url.href });
  return result;
}
export async function loadSeed(source: SeedFont, cache: string): Promise<Uint8Array<ArrayBuffer>> {
  const registered = seeds("all", source.id)[0]!;
  assert.equal(registered.sha256, source.sha256);
  assert.equal(registered.size, source.size);
  if (registered.fixture) return local(registered);
  const item = corpus.find((font) => font.id === source.id);
  assert.ok(item && item.font.sha256 === source.sha256, "Unknown/changed corpus seed");
  await readCached(cache, item.license);
  return readCached(cache, item.font);
}
