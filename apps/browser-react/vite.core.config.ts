import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("pdf-core")],
  build: {
    outDir: "dist-core",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/core/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "render.mjs",
    },
  },
});
