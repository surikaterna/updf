import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("optional-fontkit")],
  build: {
    outDir: "dist-fontkit",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/fontkit/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "fontkit.mjs",
    },
  },
});
