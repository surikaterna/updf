import type { SourceSpan } from "@updf/core";
import { finite, number, validateDataObject as record } from "@updf/core/internal";
import { placePainting, preparePainting, type PreparedPainting } from "./compile.js";
import { mapped, svgFail } from "./error.js";
import { inspect } from "./inspect.js";
import type { SVGCompilation, SVGDiagnostic, SVGTarget, XMLElement } from "./types.js";

declare const preparedBrand: unique symbol;
/** Owned, reusable SVG painting. Only this package can create a valid handle. */
export interface PreparedSvg {
  readonly [preparedBrand]: true;
  /** Frozen preparation warnings; structured input has paths but no invented XML spans. */
  readonly diagnostics: readonly SVGDiagnostic[];
  readonly width: number;
  readonly height: number;
}
const paintings = new WeakMap<PreparedSvg, PreparedPainting>();

export function checkedTarget(target: SVGTarget, span?: SourceSpan): SVGTarget {
  try {
    record(target, ["x", "y", "w", "h"], "/target");
    return {
      x: finite(target.x, "/target/x"),
      y: finite(target.y, "/target/y"),
      w: number(target.w, "/target/w", true),
      h: number(target.h, "/target/h", true),
    };
  } catch (error: unknown) {
    mapped(error, "/svg", span);
  }
}
export function prepareRoot(root: XMLElement): PreparedSvg {
  const diagnostics: SVGDiagnostic[] = [];
  const painting = preparePainting(root, inspect(root, diagnostics), diagnostics);
  const handle = Object.freeze({
    diagnostics: Object.freeze(diagnostics),
    width: painting.viewport.box[2],
    height: painting.viewport.box[3],
  }) as PreparedSvg;
  paintings.set(handle, painting);
  return handle;
}
export function ownedPainting(graphic: PreparedSvg): PreparedPainting {
  const painting = paintings.get(graphic);
  if (!painting) svgFail("SVG_GEOMETRY", "/graphic", "Expected an owned PreparedSvg handle");
  return painting;
}
export function assertPrepared(graphic: PreparedSvg): PreparedPainting {
  const painting = ownedPainting(graphic);
  const warning = graphic.diagnostics[0];
  if (warning)
    svgFail(
      "SVG_STYLE",
      warning.path,
      `${warning.message}; use compilePreparedSVG to inspect/accept warnings`,
      warning.span,
    );
  return painting;
}
/** Place an authentic prepared painting at a point viewport without reparsing geometry or styles. */
export function compilePreparedSVG(graphic: PreparedSvg, target: SVGTarget): SVGCompilation {
  const painting = ownedPainting(graphic);
  const node = placePainting(painting, checkedTarget(target));
  return Object.freeze({ node, diagnostics: graphic.diagnostics });
}
