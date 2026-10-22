import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { join } from "node:path";
import { packageEdge } from "./package-edges.js";
export { packageEdge } from "./package-edges.js";

export const internalImporters: Readonly<Record<string, readonly string[]>> = {
  "@updf/core/internal-drawing": [
    "svg/src/bridge.ts",
    "layout/src/mixed-layout.ts",
    "layout/src/index.ts",
    "layout/src/native-vdom.ts",
    "layout/src/region-render.ts",
  ],
  "@updf/core/internal": [
    "barcodes/src/checks.ts",
    "layout/src/adapter-ownership.ts",
    "layout/src/adapter-content.ts",
    "layout/src/emission-nodes.ts",
    "layout/src/author-parts.ts",
    "layout/src/adapter-decorations.ts",
    "layout/src/adapter-ancestors.ts",
    "layout/src/extension-types.ts",
    "layout/src/content-data.ts",
    "layout/src/content-types.ts",
    "layout/src/content-normalize.ts",
    "layout/src/content-role.ts",
    "layout/src/auto-margin.ts",
    "layout/src/content-block-parts.ts",
    "layout/src/content-style.ts",
    "layout/src/content-paragraph.ts",
    "layout/src/content-producer.ts",
    "layout/src/content-measure.ts",
    "layout/src/natural-paint.ts",
    "layout/src/fragment-paint-preparation.ts",
    "layout/src/inline-adapters.ts",
    "layout/src/inline-background.ts",
    "layout/src/vdom.ts",
    "layout/src/transitional-vdom.ts",
    "layout/src/document-data.ts",
    "layout/src/document-types.ts",
    "layout/src/document-props.ts",
    "layout/src/mixed-layout.ts",
    "layout/src/page-size.ts",
    "layout/src/page-context.ts",
    "layout/src/page-break.ts",
    "layout/src/deferred-decoration.ts",
    "layout/src/region-render.ts",
    "layout/src/region-overflow.ts",
    "layout/src/layout.ts",
    "layout/src/template.ts",
    "layout/src/blocks.ts",
    "layout/src/paragraph-producer.ts",
    "layout/src/prepared-line-reports.ts",
    "layout/src/paragraph-emission.ts",
    "layout/src/paragraph-fragments.ts",
    "layout/src/extensions.ts",
    "layout/src/extension-producer.ts",
    "layout/src/measured-source.ts",
    "layout/src/block-compiler.ts",
    "layout/src/column-sizing.ts",
    "layout/src/column-boxes.ts",
    "layout/src/row-compiler.ts",
    "layout/src/row-data.ts",
    "layout/src/row-vdom.ts",
    "layout/src/selection-request.ts",
    "layout/src/row-producer.ts",
    "layout/src/row-boxes.ts",
    "layout/src/container-data.ts",
    "layout/src/container-placement.ts",
    "layout/src/container-producer.ts",
    "layout/src/decorations.ts",
    "layout/src/decorated-producer.ts",
    "layout/src/sizing.ts",
    "layout/src/borders.ts",
    "layout/src/shared-edge-regions.ts",
    "layout/src/shared-edge-emission.ts",
    "layout/src/shared-edge-producer.ts",
    "layout/src/shared-edge-paint.ts",
    "layout/src/shared-edge-finalize.ts",
    "layout/src/stack.ts",
    "layout/src/output-scan.ts",
    "layout/src/adapter-call.ts",
    "layout/src/container-reservation.ts",
    "layout/src/data.ts",
    "layout/src/fixed-data.ts",
    "layout/src/budget.ts",
    "layout/src/paginator.ts",
    "layout/src/axis.ts",
    "layout/src/generated-interval.ts",
    "layout/src/width-resolver.ts",
    "geometry/src/arc.ts",
    "geometry/src/color.ts",
    "geometry/src/normalize.ts",
    "geometry/src/scanner.ts",
    "geometry/src/shapes.ts",
    "svg/src/compile.ts",
    "svg/src/declaration.ts",
    "svg/src/index.ts",
    "svg/src/prepared.ts",
    "svg/src/layout.ts",
    "svg/src/layout-size.ts",
    "svg/src/style.ts",
    "svg/src/transform.ts",
    "svg/src/viewport.ts",
    "fontkit/src/cmap.ts",
    "fontkit/src/index.ts",
    "fontkit/src/load.ts",
    "fontkit/src/metadata.ts",
    "fontkit/src/sfnt.ts",
    "fontkite/src/cmap.ts",
    "fontkite/src/load.ts",
    "fontkite/src/outline.ts",
    "fontkite/src/reader.ts",
    "fontkite/src/sfnt.ts",
    "fonts/src/checks.ts",
    "fonts/src/cids.ts",
    "fonts/src/prepare.ts",
    "fonts/src/profile.ts",
    "fonts/src/provider.ts",
    "fonts/src/runtime.ts",
    "text/src/inline.ts",
    "text/src/composition.ts",
    "text-flow/src/index.ts",
    "text/src/line-height.ts",
    "text/src/lines.ts",
    "text/src/measure.ts",
    "text/src/source.ts",
    "text/src/validate.ts",
    "text/src/wrap.ts",
    "text/src/ledger.ts",
    "text/src/service.ts",
    "text/src/measurer.ts",
    "text/src/text-resources.ts",
    "text/src/runtime-output.ts",
    "text/src/index.ts",
  ],
  "@updf/geometry/internal": ["svg/src/numbers.ts"],
  "@updf/layout-boxes/internal-fragmentation": ["layout/src/measured-source.ts"],
};

export function allowedInternal(file: string, specifier: string): void {
  const allowed = internalImporters[specifier];
  assert.ok(allowed?.includes(file), `Forbidden internal importer: ${file} -> ${specifier}`);
}

export function internalExports(text: string, expected: readonly string[]): void {
  const names = [...text.matchAll(/export (?:type )?\{([^}]+)\}/gu)].flatMap((match) =>
    (match[1] ?? "")
      .split(",")
      .map((name) => name.trim().replace(/^type /u, ""))
      .filter(Boolean),
  );
  assert.deepEqual(names.sort(), [...expected].sort(), "Internal export inventory expanded");
  assert.ok(!/export\s+\*/u.test(text), "Internal wildcard export");
}

export async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else result.push(path);
  }
  return result.sort();
}

export function portableGraph(modules: readonly string[], optional = false, react = false): void {
  assert.ok(
    !modules.some(
      (id) => isBuiltin(id) || id === "Buffer" || id === "process" || /(?:packages\/legacy|@updf\/legacy)/u.test(id),
    ),
    "Native closure must be portable and nonlegacy",
  );
  if (!optional)
    assert.ok(!modules.some((id) => /fontkit|restructure|brotli|unicode-trie/iu.test(id)), "Optional parser leaked");
  if (!react) assert.ok(!modules.some((id) => /(?:^|\/)(?:react|react-dom)(?:\/|$)/u.test(id)), "React leaked");
}
function sourceEdges(owner: string, text: string, path: string, root: string): void {
  for (const match of text.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/gu)) {
    if (match[1]) packageEdge(owner, match[1]);
    if (owner === "core" && match[1] === "@updf/layout-boxes/arithmetic")
      assert.equal(path.slice(join(root, "packages").length + 1), "core/src/measurement/arithmetic.ts");
  }
  for (const match of text.matchAll(/from ['"](@updf\/[^'"]+\/internal(?:-drawing|-fragmentation)?)['"]/gu)) {
    const specifier = match[1];
    assert.ok(specifier);
    allowedInternal(path.slice(join(root, "packages").length + 1), specifier);
  }
  assert.ok(!/from ['"]\.\.\/\.\.\//u.test(text), `Source crosses package via relative path: ${path}`);
}

const coreExports = [
  "DocumentError",
  "fail",
  "array",
  "finite",
  "number",
  "validateDataObject",
  "checkLimit",
  "codePoints",
  "Policy",
  "snapshot as snapshotData",
  "matrix",
  "multiply",
  "point",
  "rectangle",
  "commands",
  "paint",
  "policy",
  "ResolvedPaint",
  "createLayoutOperation",
  "measureStandaloneText",
  "contextLayoutOperation",
  "LayoutOperation",
  "exceeds",
  "sum",
  "MetricSum",
  "ContentHandle",
  "isContentData",
  "ownContentData",
  "InlineLine",
  "InlineLineHeights",
  "LineHeight",
  "InlineMetric",
  "RunMetrics",
  "NormalizedContent",
  "isVNode",
  "SemanticRecipe",
  "semanticComponent",
  "createRendererContext",
  "RendererBinding",
  "dataArray",
  "dataRecord",
  "ownDataValue",
  "pointer",
  "WorkLedger",
  "ledger",
  "work",
  "textOnce",
  "inputNode",
  "compositionWork",
  "visitPreparedText",
];
async function checkDrawingExports(root: string): Promise<void> {
  const drawing = await readFile(join(root, "packages/core/src/internal-drawing.ts"), "utf8");
  assert.ok(/export function createDrawingLayoutOperation\(/u.test(drawing));
  assert.deepEqual(
    [...drawing.matchAll(/^export function (\w+)/gmu)].map((match) => match[1]),
    ["createDrawingLayoutOperation"],
  );
  assert.ok(
    !/^export\s+(?!function createDrawingLayoutOperation\b|\{ isNativeNodeKind, nativeNodeKinds \}|\{ isNativeNodeData, isNativeNodeDataArray, nativeNodeToVdom \})/mu.test(
      drawing,
    ),
  );
  internalExports(drawing, [
    "isNativeNodeKind",
    "nativeNodeKinds",
    "isNativeNodeData",
    "isNativeNodeDataArray",
    "nativeNodeToVdom",
  ]);
  assert.ok(/export \{ isNativeNodeKind, nativeNodeKinds \} from "\.\/nodes\/metadata\.js";/u.test(drawing));
  assert.ok(
    /export \{ isNativeNodeData, isNativeNodeDataArray, nativeNodeToVdom \} from "\.\/vdom\/native-data\.js";/u.test(
      drawing,
    ),
  );
}

export async function checkSeams(root: string): Promise<void> {
  await checkResourceExports(root);
  await checkDrawingExports(root);
  internalExports(await readFile(join(root, "packages/core/src/internal.ts"), "utf8"), coreExports);
  internalExports(await readFile(join(root, "packages/geometry/src/internal.ts"), "utf8"), [
    "hasArguments",
    "numeric",
    "whitespace",
    "Scanner",
  ]);
  for (const owner of [
    "barcodes",
    "assets",
    "core",
    "layout-boxes",
    "layout",
    "tables",
    "geometry",
    "svg",
    "fonts",
    "text",
    "text-flow",
    "fontkit",
    "fontkite",
    "jpeg",
    "png",
  ]) {
    for (const path of await files(join(root, "packages", owner, "src"))) {
      const text = await readFile(path, "utf8");
      sourceEdges(owner, text, path, root);
    }
  }
}

const pdfExports = [
  "PdfScalar",
  "PdfString",
  "hex",
  "literal",
  "name",
  "PdfDictionary",
  "PdfRef",
  "PdfValue",
  "PdfWriter",
];
const resourceExports = [
  "OwnedResource",
  "createOwnedResource",
  "isOwnedResource",
  "ownedResourceBytes",
  "MeasuredRichText",
  "PageResources",
  "PaintingBinding",
  "PaintingSlot",
  "Resource",
  "ResourceCollection",
  "ResourceDefinition",
  "ResourcePhase",
  "ResourceProvider",
  "ResourceSlot",
  "TextSite",
  "XObjectSite",
  "xObjectSlot",
  "paintingSlot",
  "resourceSlot",
  "textSlot",
  "TextMetrics",
  "TextRun",
  "TextRuntime",
  "TextService",
  "TextServiceContext",
  "CompositionInput",
  "CompositionPlan",
  "ComposedTextFrame",
  "OccupiedTextBand",
  "TextMeasurer",
  "MeasureOptions",
  "InlineLine",
  "InlineMetric",
  "InlineLineHeights",
  "LineEnvelope",
  "LineHeight",
  "PrivateFragment",
  "InkBounds",
  "ParagraphDefinition",
  "RichTextInput",
  "TextFragmentMeasurement",
  "TextLineMeasurement",
  "TextMeasurement",
  "TextMeasurementInput",
  "TextRun as SourceTextRun",
  "TextStyle",
];
async function checkResourceExports(root: string): Promise<void> {
  internalExports(await readFile(join(root, "packages/core/src/pdf.ts"), "utf8"), pdfExports);
  internalExports(await readFile(join(root, "packages/core/src/resources.ts"), "utf8"), resourceExports);
}
