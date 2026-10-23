import assert from "node:assert/strict";
export const sidePathImporters = [
  "text-flow/src/path-band.ts",
  "text-flow/src/path.ts",
  "text-flow/src/side-selection.ts",
  "text-flow/src/rectangle-policy.ts",
  "text-flow/src/path-policy.ts",
  "text-flow/src/atomic.ts",
  "text/src/selection.ts",
  "text/src/composition-work.ts",
];
export const participationImporters = [
  "text-flow/src/sibling.ts",
  "text-flow/src/sibling-source.ts",
  "text-flow/src/sibling-selection.ts",
  "text-flow/src/side-selection.ts",
  "text-flow/src/side-policy.ts",
  "text-flow/src/path-policy.ts",
];

const barcodeImports = new Set([
  "@updf/core",
  "@updf/core/internal",
  "@updf/core/vdom",
  "@updf/core/painting",
  "@updf/layout-boxes/arithmetic",
]);

export function packageEdge(owner: string, specifier: string): void {
  if (owner === "text-flow") textFlowEdge(specifier);
  if (owner === "barcodes")
    assert.ok(specifier.startsWith(".") || barcodeImports.has(specifier), "Barcodes must keep encoders local");
  if (owner === "fontkite")
    assert.ok(
      specifier.startsWith(".") ||
        specifier === "@updf/layout-boxes/numeric" ||
        /^@updf\/(?:core|fonts|assets)(?:\/|$)/u.test(specifier),
      "Fontkite must not depend on Fontkit or optional engines",
    );
  if (owner === "assets") assert.ok(specifier.startsWith("."), "Asset transport must have zero runtime dependencies");
  if (owner === "png")
    assert.ok(
      specifier.startsWith(".") || ["@updf/core", "@updf/core/resources", "@updf/core/pdf"].includes(specifier),
      "PNG must use public core surfaces and native compression streams only",
    );
  if (owner === "jpeg")
    assert.ok(
      specifier.startsWith(".") || ["@updf/core", "@updf/core/resources", "@updf/core/pdf"].includes(specifier),
      "JPEG must use public core data/resource/PDF surfaces only",
    );
  if (owner === "core")
    assert.ok(
      specifier === "@updf/layout-boxes/arithmetic" || specifier.startsWith("."),
      "Core may depend only on kernel arithmetic, not fonts/text/boxes/layout/tables",
    );
  if (owner === "layout-boxes") assert.ok(specifier.startsWith("."), "Boxes must have zero runtime dependencies");
  if (owner === "text")
    assert.ok(
      specifier.startsWith(".") ||
        specifier.startsWith("@updf/core") ||
        ["@updf/layout-boxes/arithmetic", "@updf/layout-boxes/numeric"].includes(specifier),
      "Text must depend only on core and inventoried kernel arithmetic/numeric helpers",
    );
  if (owner === "fonts")
    assert.ok(specifier.startsWith(".") || specifier.startsWith("@updf/core"), "Fonts must depend only on core");
  if (owner === "layout")
    assert.ok(
      specifier.startsWith(".") || /^@updf\/(?:core|text|layout-boxes)(?:\/|$)/u.test(specifier),
      "Layout must remain core/text/kernel-only, without a font implementation",
    );
  if (owner === "tables")
    assert.ok(
      specifier.startsWith(".") ||
        ["@updf/core", "@updf/core/vdom", "@updf/core/jsx-runtime", "@updf/layout"].includes(specifier),
      "Tables must use supported public layout/core surfaces only",
    );
}
function textFlowEdge(specifier: string): void {
  assert.ok(
    specifier.startsWith(".") ||
      specifier === "@updf/text/composition" ||
      specifier === "@updf/text/selection" ||
      specifier === "@updf/text/internal-interpolation" ||
      specifier === "@updf/layout-boxes/fragmentation" ||
      specifier === "@updf/layout-boxes/numeric" ||
      specifier === "@updf/geometry" ||
      /^@updf\/(?:core|layout)(?:\/|$)/u.test(specifier),
    "Text flow must depend only on core/layout and its selected composition contract; no font loader or decoder",
  );
}
