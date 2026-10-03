import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("flow")],
  build: {
    outDir: "dist-flow",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/layout/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "flow.mjs",
    },
  },
});
