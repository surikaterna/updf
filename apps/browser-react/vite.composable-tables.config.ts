import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("composable-tables")],
  build: {
    outDir: "dist-composable-tables",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/tables/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "tables.mjs",
    },
  },
});
