import { gzipSync } from "node:zlib";
import { bundle, here, verifyRoot } from "./bundle.mjs";

const root = verifyRoot();
const scopes = {
  allocator: "../../packages/layout/src/width-resolver.ts",
  formbarBridge: "bridge.mjs",
  terminalAdapter: "terminal.ts",
  combinedCLI: "cli.mjs",
};
async function report(entry) {
  const result = await bundle(entry, root);
  const output = result.outputFiles[0];
  const metadata = Object.values(result.metafile.outputs)[0];
  const retained = Object.entries(metadata.inputs).filter(([, info]) => info.bytesInOutput > 0);
  const pdfLeak = retained.filter(([path]) =>
    /packages\/(core|fontkit)\/src\/(pdf|font|document|render|serialize|painting|vdom|measurement)/i.test(path),
  );
  const label = (path) => path.replace(root, "FORMBAR_ROOT").replace(here, "PROOF_ROOT");
  return {
    raw: output.contents.length,
    gzip: gzipSync(output.contents).length,
    inputs: Object.keys(result.metafile.inputs).map(label),
    retained: retained.map(([path, info]) => ({ path: label(path), bytes: info.bytesInOutput })),
    externalDependencies: metadata.imports
      .filter((item) => !item.path.startsWith("node:"))
      .map((item) => ({ path: label(item.path), kind: item.kind })),
    externalNodeBuiltins: metadata.imports.filter((item) => item.path.startsWith("node:")).map((item) => item.path),
    pdfLeak: pdfLeak.map(([path]) => label(path)),
  };
}
for (const [scope, entry] of Object.entries(scopes)) {
  const runtime = await report(entry);
  const bootstrap = scope === "combinedCLI" ? await report("run.mjs") : undefined;
  console.log(JSON.stringify({ scope, ...runtime, bootstrap }));
}
verifyRoot();
