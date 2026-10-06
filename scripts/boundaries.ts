import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { join } from "node:path";

export const internalImporters: Readonly<Record<string, readonly string[]>> = {
  "@updf/core/internal-drawing": ["layout/src/mixed-layout.ts", "layout/src/index.ts"],
  "@updf/core/internal": [
    "layout/src/index.ts",
    "layout/src/adapter-ownership.ts",
    "layout/src/adapter-content.ts",
    "layout/src/emission-nodes.ts",
    "layout/src/author-parts.ts",
    "layout/src/adapter-decorations.ts",
    "layout/src/adapter-ancestors.ts",
    "layout/src/extension-types.ts",
    "layout/src/content-data.ts",
    "layout/src/content-types.ts",
    "layout/src/text-style.ts",
    "layout/src/content-normalize.ts",
    "layout/src/content-role.ts",
    "layout/src/auto-margin.ts",
    "layout/src/content-block-parts.ts",
    "layout/src/content-line-containers.ts",
    "layout/src/content-style.ts",
    "layout/src/content-paragraph.ts",
    "layout/src/content-producer.ts",
    "layout/src/content-measure.ts",
    "layout/src/natural-paint.ts",
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
    "layout/src/native-vdom.ts",
    "layout/src/layout.ts",
    "layout/src/template.ts",
    "layout/src/blocks.ts",
    "layout/src/paragraph-producer.ts",
    "layout/src/paragraph-emission.ts",
    "layout/src/paragraph-fragments.ts",
    "layout/src/extensions.ts",
    "layout/src/extension-producer.ts",
    "layout/src/block-compiler.ts",
    "layout/src/column-sizing.ts",
    "layout/src/row-compiler.ts",
    "layout/src/row-data.ts",
    "layout/src/row-vdom.ts",
    "layout/src/row-producer.ts",
    "layout/src/row-placement.ts",
    "layout/src/container-data.ts",
    "layout/src/container-paint.ts",
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
    "layout/src/budget.ts",
    "layout/src/paginator.ts",
    "layout/src/axis.ts",
    "layout/src/generated-interval.ts",
    "layout/src/width-resolver.ts",
    "layout/src/tables/index.ts",
    "layout/src/tables/vdom.ts",
    "layout/src/tables/layout.ts",
    "layout/src/tables/validate.ts",
    "layout/src/tables/measure.ts",
    "layout/src/tables/producer.ts",
    "layout/src/tables/paint.ts",
    "layout/src/tables/ink.ts",
    "geometry/src/arc.ts",
    "geometry/src/color.ts",
    "geometry/src/normalize.ts",
    "geometry/src/scanner.ts",
    "geometry/src/shapes.ts",
    "svg/src/compile.ts",
    "svg/src/declaration.ts",
    "svg/src/index.ts",
    "svg/src/style.ts",
    "svg/src/transform.ts",
    "svg/src/viewport.ts",
    "fontkit/src/cmap.ts",
    "fontkit/src/index.ts",
    "fontkit/src/metadata.ts",
    "fontkit/src/sfnt.ts",
    "fonts/src/checks.ts",
    "fonts/src/cids.ts",
    "fonts/src/prepare.ts",
    "fonts/src/profile.ts",
    "fonts/src/provider.ts",
    "fonts/src/runtime.ts",
    "text/src/inline.ts",
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
export function packageEdge(owner: string, specifier: string): void {
  if (owner === "jpeg")
    assert.ok(
      specifier.startsWith(".") || ["@updf/core", "@updf/core/resources", "@updf/core/pdf"].includes(specifier),
      "JPEG must use public core data/resource/PDF surfaces only",
    );
  if (owner === "core")
    assert.ok(
      specifier === "@updf/layout-kernel/arithmetic" || specifier.startsWith("."),
      "Core may depend only on kernel arithmetic, not fonts/text/boxes/layout/tables",
    );
  if (owner === "layout-kernel") assert.ok(specifier.startsWith("."), "Kernel must have zero runtime dependencies");
  if (owner === "text")
    assert.ok(
      specifier.startsWith(".") || specifier.startsWith("@updf/core") || specifier === "@updf/layout-kernel/arithmetic",
      "Text must depend only on core and kernel arithmetic",
    );
  if (owner === "fonts")
    assert.ok(specifier.startsWith(".") || specifier.startsWith("@updf/core"), "Fonts must depend only on core");
  if (owner === "layout")
    assert.ok(
      specifier.startsWith(".") || /^@updf\/(?:core|text|layout-kernel)(?:\/|$)/u.test(specifier),
      "Layout must remain core/text/kernel-only, without a font implementation",
    );
  if (owner === "tables")
    assert.ok(
      specifier.startsWith(".") ||
        ["@updf/core", "@updf/core/vdom", "@updf/core/jsx-runtime", "@updf/layout"].includes(specifier),
      "Tables must use supported public layout/core surfaces only",
    );
}
function sourceEdges(owner: string, text: string, path: string, root: string): void {
  for (const match of text.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/gu)) {
    if (match[1]) packageEdge(owner, match[1]);
    if (owner === "core" && match[1] === "@updf/layout-kernel/arithmetic")
      assert.equal(path.slice(join(root, "packages").length + 1), "core/src/measurement/arithmetic.ts");
  }
  for (const match of text.matchAll(/from ['"](@updf\/[^'"]+\/internal(?:-drawing)?)['"]/gu)) {
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
];
export async function checkSeams(root: string): Promise<void> {
  await checkResourceExports(root);
  internalExports(await readFile(join(root, "packages/core/src/internal.ts"), "utf8"), coreExports);
  const drawing = await readFile(join(root, "packages/core/src/internal-drawing.ts"), "utf8");
  assert.ok(/export function createDrawingLayoutOperation\(/u.test(drawing));
  assert.deepEqual(
    [...drawing.matchAll(/^export function (\w+)/gmu)].map((match) => match[1]),
    ["createDrawingLayoutOperation"],
  );
  assert.ok(!/^export\s+(?!function createDrawingLayoutOperation\b)/mu.test(drawing));
  assert.ok(!/export\s+\*|export\s+\{/u.test(drawing), "Drawing seam must not re-export internals");
  internalExports(await readFile(join(root, "packages/geometry/src/internal.ts"), "utf8"), [
    "hasArguments",
    "numeric",
    "whitespace",
    "Scanner",
  ]);
  for (const owner of [
    "core",
    "layout-kernel",
    "layout",
    "tables",
    "geometry",
    "svg",
    "fonts",
    "text",
    "fontkit",
    "jpeg",
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
