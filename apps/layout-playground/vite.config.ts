import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

function evidence(): Plugin {
  return {
    name: "playground-evidence",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((item) => item.type === "chunk");
      this.emitFile({
        type: "asset",
        fileName: "chunk-graph.json",
        source: JSON.stringify(
          chunks.map(({ fileName, isEntry, imports, dynamicImports, modules, code }) => ({
            fileName,
            isEntry,
            imports,
            dynamicImports,
            modules: Object.keys(modules).sort(),
            bytes: Buffer.byteLength(code),
          })),
          null,
          2,
        ),
      });
      this.emitFile({
        type: "asset",
        fileName: "notices/LICENSE",
        source: readFileSync(new URL("../../LICENSE", import.meta.url)),
      });
    },
  };
}

// biome-ignore lint/style/noDefaultExport: Vite requires a default config, matching existing workspace Vite configs.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [evidence()],
  build: { outDir: "dist", emptyOutDir: true },
});
