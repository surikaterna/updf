import { readdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const coreRoot = new URL("packages/core/src/", root);
const core = [
  "index.ts",
  "types.ts",
  "internal.ts",
  ...(await readdir(new URL("core/", coreRoot))).map((file) => `core/${file}`),
  ...(await readdir(new URL("fonts/", coreRoot))).map((file) => `fonts/${file}`),
  ...(await readdir(new URL("painting/", coreRoot))).map((file) => `painting/${file}`),
  ...(await readdir(new URL("measurement/", coreRoot))).map((file) => `measurement/${file}`),
];
const source = await Promise.all(core.map((file) => readFile(new URL(file, coreRoot))));
const emitted = await Promise.all(
  core.map((file) => readFile(new URL(`packages/core/dist/${file.replace(/\.ts$/, ".js")}`, root))),
);
const declarations = await Promise.all(
  core.map((file) => readFile(new URL(`packages/core/dist/${file.replace(/\.ts$/, ".d.ts")}`, root))),
);
const bundle = await readFile(new URL("apps/browser-react/dist-core/render.mjs", root));
const vdomSource = [
  "jsx-runtime.ts",
  "jsx-dev-runtime.ts",
  ...(await readdir(new URL("vdom/", coreRoot))).map((file) => `vdom/${file}`),
];
const vdomBytes = await Promise.all(vdomSource.map((file) => readFile(new URL(file, coreRoot))));
const vdomBundle = await readFile(new URL("apps/browser-react/dist-vdom/vdom.mjs", root));
const fontsBundle = await readFile(new URL("apps/browser-react/dist-fonts/fonts.mjs", root));
const measurementBundle = await readFile(new URL("apps/browser-react/dist-measurement/measurement.mjs", root));
const flowBundle = await readFile(new URL("apps/browser-react/dist-flow/flow.mjs", root));
const tablesBundle = await readFile(new URL("apps/browser-react/dist-tables/tables.mjs", root));
const composableTablesBundle = await readFile(new URL("apps/browser-react/dist-composable-tables/tables.mjs", root));
const composableTablesSources = await Promise.all(
  (await readdir(new URL("packages/tables/src/", root))).map((file) =>
    readFile(new URL(`packages/tables/src/${file}`, root)),
  ),
);
const tableFiles = (await readdir(new URL("packages/layout/src/tables/", root))).filter((file) => file.endsWith(".ts"));
const tableSource = await Promise.all(
  tableFiles.map((file) => readFile(new URL(`packages/layout/src/tables/${file}`, root))),
);
const tableJavaScript = await Promise.all(
  tableFiles.map((file) => readFile(new URL(`packages/layout/dist/tables/${file.replace(/\.ts$/u, ".js")}`, root))),
);
const tableDeclarations = await Promise.all(
  tableFiles.map((file) => readFile(new URL(`packages/layout/dist/tables/${file.replace(/\.ts$/u, ".d.ts")}`, root))),
);
const fontkitBundle = await readFile(new URL("apps/browser-react/dist-fontkit/fontkit.mjs", root));
const adapterSource = await Promise.all(
  (await readdir(new URL("packages/fontkit/src/", root))).map((file) =>
    readFile(new URL(`packages/fontkit/src/${file}`, root)),
  ),
);
const fontAssets = await readdir(new URL("apps/browser-fonts/dist/assets/", root));
const fontBrowserBundle = await readFile(
  new URL(`apps/browser-fonts/dist/assets/${fontAssets.find((file) => file.endsWith(".js"))}`, root),
);
const assets = await readdir(new URL("apps/browser-react/dist/assets/", root));
const app = await readFile(
  new URL(`apps/browser-react/dist/assets/${assets.find((file) => file.endsWith(".js"))}`, root),
);
const pdf = await readFile(new URL("artifacts/cmr.pdf", root));
const fontProgram = await readFile(new URL("tests/fixtures/fonts/LiberationSans-Regular.ttf", root));
const fontMetadata = await readFile(new URL("tests/fixtures/fonts/liberation-sans.json", root));
const fontPdf = await readFile(new URL("artifacts/font-proof.pdf", root));
const unicodeCmr = await readFile(new URL("artifacts/cmr-unicode.pdf", root));
const geometry = await readFile(new URL("apps/browser-react/dist-geometry/geometry.mjs", root));
const geometrySources = await Promise.all(
  (await readdir(new URL("packages/geometry/src/", root)))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => readFile(new URL(`packages/geometry/src/${file}`, root))),
);
const paintingPdf = await readFile(new URL("artifacts/painting-proof.pdf", root));
const svg = await readFile(new URL("apps/browser-react/dist-svg/svg.mjs", root));
const svgSource = await Promise.all(
  (await readdir(new URL("packages/svg/src/", root)))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => readFile(new URL(`packages/svg/src/${file}`, root))),
);
const svgPdf = await readFile(new URL("artifacts/svg-proof.pdf", root));
const report = {
  coreSourceBytes: source.reduce((sum, bytes) => sum + bytes.length, 0),
  coreEmittedJavaScriptBytes: emitted.reduce((sum, bytes) => sum + bytes.length, 0),
  coreDeclarationBytes: declarations.reduce((sum, bytes) => sum + bytes.length, 0),
  coreBundleBytes: bundle.length,
  coreBundleGzipBytes: gzipSync(bundle).length,
  vdomSourceBytes: vdomBytes.reduce((sum, bytes) => sum + bytes.length, 0),
  vdomBundleBytes: vdomBundle.length,
  vdomBundleGzipBytes: gzipSync(vdomBundle).length,
  reactAppBundleBytes: app.length,
  reactAppBundleGzipBytes: gzipSync(app).length,
  onePagePdfBytes: pdf.length,
  fontProgramBytes: fontProgram.length,
  fontProgramGzipBytes: gzipSync(fontProgram).length,
  preparedMetadataBytes: fontMetadata.length,
  preparedMetadataGzipBytes: gzipSync(fontMetadata).length,
  fontProofPdfBytes: fontPdf.length,
  fontsBundleBytes: fontsBundle.length,
  measurementBundleBytes: measurementBundle.length,
  measurementBundleGzipBytes: gzipSync(measurementBundle).length,
  flowBundleBytes: flowBundle.length,
  flowBundleGzipBytes: gzipSync(flowBundle).length,
  tablesBundleBytes: tablesBundle.length,
  composableTablesBundleBytes: composableTablesBundle.length,
  composableTablesBundleGzipBytes: gzipSync(composableTablesBundle).length,
  composableTablesSourceBytes: composableTablesSources.reduce((sum, bytes) => sum + bytes.length, 0),
  tablesBundleGzipBytes: gzipSync(tablesBundle).length,
  tablesSourceBytes: tableSource.reduce((sum, bytes) => sum + bytes.length, 0),
  tablesEmittedJavaScriptBytes: tableJavaScript.reduce((sum, bytes) => sum + bytes.length, 0),
  tablesDeclarationBytes: tableDeclarations.reduce((sum, bytes) => sum + bytes.length, 0),
  fontsBundleGzipBytes: gzipSync(fontsBundle).length,
  adapterSourceBytes: adapterSource.reduce((sum, bytes) => sum + bytes.length, 0),
  optionalFontkitClosureBytes: fontkitBundle.length,
  optionalFontkitClosureGzipBytes: gzipSync(fontkitBundle).length,
  fontBrowserBundleBytes: fontBrowserBundle.length,
  fontBrowserBundleGzipBytes: gzipSync(fontBrowserBundle).length,
  unicodeCmrPdfBytes: unicodeCmr.length,
  geometrySourceBytes: geometrySources.reduce((sum, bytes) => sum + bytes.length, 0),
  geometryBundleBytes: geometry.length,
  geometryBundleGzipBytes: gzipSync(geometry).length,
  paintingProofPdfBytes: paintingPdf.length,
  svgSourceBytes: svgSource.reduce((sum, bytes) => sum + bytes.length, 0),
  svgBundleBytes: svg.length,
  svgBundleGzipBytes: gzipSync(svg).length,
  svgProofPdfBytes: svgPdf.length,
};
await writeFile(new URL("artifacts/sizes.json", root), JSON.stringify(report, null, 2) + "\n");
console.log(report);
