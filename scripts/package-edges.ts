import assert from "node:assert/strict";
export const manualShapeImporters = [
  "text-flow/src/index.ts",
  "text-flow/src/component-owner.ts",
  "text-flow/src/handlers.ts",
  "text-flow/src/manual-participation.ts",
  "text-flow/src/path-entry.ts",
  "text-flow/src/source-capture.ts",
  "text-flow/src/syntax.ts",
  "text-flow/src/png-alpha.ts",
  "text-flow/src/png-alpha-session.ts",
  "text-flow/src/png-alpha-projection.ts",
  "text-flow/src/png-alpha-geometry.ts",
];
export const sidePathImporters = [
  "text-flow/src/path-band.ts",
  "text-flow/src/command-band.ts",
  "text-flow/src/path.ts",
  "text-flow/src/side-selection.ts",
  "text-flow/src/rectangle-policy.ts",
  "text-flow/src/path-policy.ts",
  "text-flow/src/atomic.ts",
  "text/src/selection.ts",
  "text/src/composition-work.ts",
];
export const participationImporters = [
  "text-flow/src/component-owner.ts",
  "text-flow/src/png-alpha.ts",
  "text-flow/src/handlers.ts",
  "text-flow/src/manual-participation.ts",
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
  optionalEdge(owner, specifier);
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
function optionalEdge(owner: string, specifier: string): void {
  if (owner === "text-flow") textFlowEdge(specifier);
  if (owner === "images")
    assert.ok(
      specifier.startsWith(".") || /^@updf\/(?:core|layout|assets|png|jpeg)(?:\/|$)/u.test(specifier),
      "Images may use core/layout and explicitly selected transport/codec leaves, never text-flow",
    );
}

export function imageLeafEdge(file: string, specifier: string): void {
  if (specifier === "@updf/png/alpha")
    assert.ok(
      [
        "text-flow/src/png-shape.ts",
        "text-flow/src/png-shape-options.ts",
        "text-flow/src/png-shape-cells.ts",
        "text-flow/src/png-alpha-session.ts",
      ].includes(file),
      "Alpha inspection belongs only to the selected PNG shape leaf",
    );
  if (specifier === "@updf/png")
    assert.ok(["images/src/png.ts", "images/src/browser-png.ts"].includes(file), "PNG belongs to a selected PNG leaf");
  if (specifier === "@updf/png/normalization")
    assert.ok(
      ["images/src/browser-png.ts", "images/src/browser-png-conversion.ts", "images/src/browser-png-await.ts"].includes(
        file,
      ),
      "Normalization belongs only to the selected browser PNG implementation",
    );
  if (specifier === "@updf/jpeg")
    assert.equal(file, `images/src/${specifier.slice(6)}.ts`, "Codec belongs only to its selected format leaf");
  if (specifier === "@updf/assets")
    assert.ok(
      ["images/src/load.ts", "images/src/load-options.ts", "images/src/source-error.ts"].includes(file),
      "Transport belongs to the load leaf",
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
      specifier === "@updf/png/alpha" ||
      specifier === "@updf/images/internal-preparation" ||
      /^@updf\/(?:core|layout)(?:\/|$)/u.test(specifier),
    "Text flow must depend only on core/layout and its selected composition contract; no font loader or decoder",
  );
}
