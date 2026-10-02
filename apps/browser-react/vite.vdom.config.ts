import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("vdom")],
  build: {
    outDir: "dist-vdom",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/core/dist/vdom/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "vdom.mjs",
    },
  },
});
