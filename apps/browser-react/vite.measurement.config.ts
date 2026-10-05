import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "./module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("measurement")],
  build: {
    outDir: "dist-measurement",
    minify: "esbuild",
    lib: {
      entry: fileURLToPath(new URL("../../packages/text/dist/index.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "measurement.mjs",
    },
  },
});
