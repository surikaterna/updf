import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

function deliveryEvidence(): Plugin {
  return {
    name: "showcase-delivery-evidence",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === "chunk");
      this.emitFile({
        type: "asset",
        fileName: "chunk-graph.json",
        source: JSON.stringify(
          chunks.map(({ fileName, isEntry, imports, dynamicImports, modules }) => ({
            fileName,
            isEntry,
            imports,
            dynamicImports,
            modules: Object.keys(modules).sort(),
          })),
          null,
          2,
        ),
      });
      for (const name of ["LICENSE.svgpath", "REUSE.md"]) {
        this.emitFile({
          type: "asset",
          fileName: `notices/${name}`,
          source: readFileSync(new URL(`../../packages/geometry/${name}`, import.meta.url)),
        });
      }
      this.emitFile({
        type: "asset",
        fileName: "notices/LICENSE",
        source: readFileSync(new URL("../../LICENSE", import.meta.url)),
      });
      this.emitFile({
        type: "asset",
        fileName: "notices/LICENSE.pdfjs",
        source: readFileSync(new URL("../../node_modules/pdfjs-dist/LICENSE", import.meta.url)),
      });
      this.emitFile({
        type: "asset",
        fileName: "notices/LICENSE.liberation",
        source: readFileSync(new URL("../../tests/fixtures/fonts/LICENSE", import.meta.url)),
      });
      parserNotices((fileName, source) => this.emitFile({ type: "asset", fileName, source }));
    },
  };
}

function parserNotices(emit: (fileName: string, source: string) => void): void {
  const read = (path: string) => readFileSync(new URL(`../../node_modules/${path}`, import.meta.url), "utf8");
  const packages = [
    "@swc/helpers",
    "clone",
    "fast-deep-equal",
    "restructure",
    "tiny-inflate",
    "unicode-properties",
    "unicode-trie",
    "pako",
    "base64-js",
  ];
  for (const name of packages) emit(`notices/LICENSE.${name.replace(/[@/]/gu, "-")}`, read(`${name}/LICENSE`));
  emit("notices/LICENSE.tslib", read("tslib/LICENSE.txt"));
  // These upstream distributions declare MIT but omit standalone license files.
  for (const name of ["fontkit", "dfa", "brotli"]) {
    emit(`notices/${name}.metadata.json`, read(`${name}/package.json`));
    emit(`notices/${name}.README.md`, read(`${name}/${name === "brotli" ? "readme.md" : "README.md"}`));
  }
  emit("notices/brotli-decoder.txt", read("brotli/dec/decode.js").split("*/")[0] + "*/\n");
  emit("notices/LICENSE.apache-2.0", read("pdfjs-dist/LICENSE"));
}

const base = process.env.SHOWCASE_BASE ?? "/updf/";
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error("SHOWCASE_BASE must be a root-relative directory path");

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base,
  plugins: [deliveryEvidence()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("index.html", import.meta.url)),
        plasma: fileURLToPath(new URL("plasma.html", import.meta.url)),
      },
    },
  },
});
