import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("optional-geometry")],
  build: {
    outDir: "dist-geometry",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/geometry/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "geometry.mjs",
    },
  },
});
