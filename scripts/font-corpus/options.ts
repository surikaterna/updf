import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { CorpusFont } from "./types.js";

export function options(args: readonly string[], mode: "fetch" | "test") {
  let suite = "all",
    id: string | undefined,
    output = "artifacts/font-corpus/report.json";
  let offline = false;
  let oracle: string | undefined;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    assert.ok(!seen.has(flag), `Duplicate option ${flag}`);
    seen.add(flag);
    if (flag === "--offline" && mode === "test") {
      offline = true;
      continue;
    }
    assert.ok(
      ["--suite", "--id", ...(mode === "test" ? ["--output", "--oracle"] : [])].includes(flag),
      `Unknown option ${flag}`,
    );
    const value = args[++i];
    assert.ok(value && !value.startsWith("--"), `Missing value for ${flag}`);
    if (flag === "--suite") suite = value;
    if (flag === "--id") id = value;
    if (flag === "--output") output = value;
    if (flag === "--oracle") oracle = resolve(value);
  }
  assert.ok(["all", "static-smoke", "unsupported"].includes(suite), "Unknown corpus suite");
  assert.ok(mode !== "test" || offline, "Corpus tests require --offline; fetch explicitly first");
  return { suite, id, output: resolve(output), oracle };
}
export function selected(fonts: readonly CorpusFont[], suite: string, id?: string): readonly CorpusFont[] {
  const result = fonts.filter(
    (font) =>
      (!id || font.id === id) &&
      (suite === "all" ||
        (suite === "static-smoke" ? font.expected.kind === "supported" : font.expected.kind === "unsupported")),
  );
  assert.ok(result.length, "No matching corpus entries");
  return result;
}
