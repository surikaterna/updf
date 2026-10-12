import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { costInputs } from "./cost-inputs.js";

const original = costInputs(false);
export const fontLoadSources = {
  drawing: original.drawing!,
  helvetica: original.helvetica!,
  fontkit: original.fontkit!,
  transport: `import {createAssetLoader} from '@updf/assets';const loader=createAssetLoader({fetch:globalThis.fetch});export const load=source=>loader.load(source);`,
  loadedFont: original
    .fontkit!.replace(
      "import {prepareFont} from '@updf/fontkit';",
      "import {loadFont} from '@updf/fontkit/load'; import {createAssetLoader} from '@updf/assets';const loader=createAssetLoader({fetch:globalThis.fetch});",
    )
    .replace("pdf = bytes =>", "pdf = async bytes =>")
    .replace("prepareFont(bytes)", "await loadFont(bytes,{loader})"),
};

export async function measureFontLoad(root = process.cwd(), baseline = false) {
  const report = [];
  for (const [profile, contents] of Object.entries(fontLoadSources)) {
    if (baseline && ["transport", "loadedFont"].includes(profile)) continue;
    const result = await build({
      stdin: { contents, resolveDir: root },
      bundle: true,
      minify: true,
      target: "es2022",
      platform: "browser",
      conditions: ["browser"],
      format: "esm",
      metafile: true,
      write: false,
    });
    const modules = Object.keys(result.metafile.inputs),
      bytes = result.outputFiles[0]!.contents;
    assert.ok(!modules.some((path) => /packages\/(?:jpeg|png|image|svg|geometry|layout|tables)\//u.test(path)));
    if (profile !== "transport" && profile !== "loadedFont")
      assert.ok(!modules.some((path) => /packages\/assets\//u.test(path)));
    if (profile === "transport")
      assert.ok(!modules.some((path) => /packages\/(?:core|fonts|text|fontkit)\//u.test(path)));
    if (["drawing", "helvetica", "transport"].includes(profile))
      assert.ok(!modules.some((path) => /node_modules\/fontkit\//u.test(path)));
    assert.ok(!modules.some((path) => /packages\/[^/]+\/(?:src|dist\/(?:cjs|node))\//u.test(path)));
    report.push({ profile, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length, modules });
  }
  return report;
}
