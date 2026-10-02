import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("optional-svg")],
  build: {
    outDir: "dist-svg",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/svg/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "svg.mjs",
    },
  },
});
