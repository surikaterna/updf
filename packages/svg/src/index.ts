import type { PaintingGroupNode, SourceSpan } from "@updf/core";
import { finite, number, record } from "@updf/core/internal";
import { compile } from "./compile.js";
import { mapped, svgFail } from "./error.js";
import { inspect } from "./inspect.js";
import type { SVGCompilation, SVGDiagnostic, SVGTarget } from "./types.js";
import { parseXML } from "./xml.js";

export { SVGError } from "./error.js";
export type { SVGCompilation, SVGDiagnostic, SVGTarget } from "./types.js";

/** Pure optional adapter; warning-bearing legacy CSS requires explicit compileSVG use. */
export function compileSVG(source: string, target: SVGTarget): SVGCompilation {
  const root = parseXML(source);
  const diagnostics: SVGDiagnostic[] = [];
  const span: SourceSpan = { start: 0, end: 0 };
  let checked: SVGTarget;
  try {
    record(target, ["x", "y", "w", "h"], "/target");
    checked = {
      x: finite(target.x, "/target/x"),
      y: finite(target.y, "/target/y"),
      w: number(target.w, "/target/w", true),
      h: number(target.h, "/target/h", true),
    };
  } catch (error: unknown) {
    mapped(error, "/svg", span);
  }
  const node = compile(root, checked, inspect(root, diagnostics), diagnostics);
  return Object.freeze({ node, diagnostics: Object.freeze(diagnostics) });
}
export function renderSVG(source: string, target: SVGTarget): PaintingGroupNode {
  const result = compileSVG(source, target);
  const warning = result.diagnostics[0];
  if (warning)
    svgFail("SVG_STYLE", warning.path, `${warning.message}; use compileSVG to inspect/accept warnings`, warning.span);
  return result.node;
}
