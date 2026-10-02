import type { Plugin } from "vite";

/** Build evidence from Rollup's actual input graph, not inferred bundle sizes. */
export function moduleGraph(label: string): Plugin {
  return {
    name: "declarative-module-graph",
    generateBundle() {
      const modules = [...this.getModuleIds()].sort();
      this.emitFile({
        type: "asset",
        fileName: "module-graph.json",
        source: JSON.stringify({ label, modules }, null, 2),
      });
    },
  };
}
