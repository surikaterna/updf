import { DocumentError } from "@updf/core";
import { renderSVG } from "@updf/svg";

const declaration = process.argv[2] === "declaration";
const source = declaration
  ? '<svg width="100" height="100"><style>.a{fill:r' + " ".repeat(900000) + "z}</style></svg>"
  : '<svg width="100" height="100"><style><![CDATA[' + "/* ".repeat(300000) + "]]></style></svg>";
if (Buffer.byteLength(source) >= 1024 * 1024) throw new Error("Probe must exercise CSS, not the source budget");
try {
  renderSVG(source, { x: 0, y: 0, w: 100, h: 100 });
  process.exitCode = 2;
} catch (error: unknown) {
  if (
    !(error instanceof DocumentError) ||
    error.diagnostics[0]?.code !== (declaration ? "PAINT" : "SVG_STYLE") ||
    !error.message.includes(declaration ? "Unsupported color" : "Unterminated CSS comment")
  )
    process.exitCode = 3;
}
