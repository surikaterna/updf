import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("tables")],
  build: {
    outDir: "dist-tables",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/layout/dist/tables/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "tables.mjs",
    },
  },
});
