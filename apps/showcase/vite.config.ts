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
    },
  };
}

const base = process.env.SHOWCASE_BASE ?? "/updf/";
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error("SHOWCASE_BASE must be a root-relative directory path");

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base,
  plugins: [deliveryEvidence()],
  build: { outDir: "dist", emptyOutDir: true },
});
