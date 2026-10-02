import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { moduleGraph } from "../browser-react/module-graph.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [moduleGraph("fontkit-browser")],
  build: { target: "es2022" },
});
