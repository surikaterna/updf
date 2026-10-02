import type { NodeDefinition, PaintingGroupNode } from "@updf/core";
import { commands } from "@updf/core/internal";
import { multiply } from "@updf/core/painting";
import { mapped, svgFail } from "./error.js";
import type { Inspection } from "./inspect.js";
import { attribute } from "./numbers.js";
import { geometry } from "./shapes.js";
import { cascade, defaults, resolved, type Style } from "./style.js";
import { transform } from "./transform.js";
import type { SVGDiagnostic, SVGTarget, XMLElement } from "./types.js";
import { viewBox, viewport } from "./viewport.js";

interface State {
  readonly inspection: Inspection;
  readonly diagnostics: SVGDiagnostic[];
  commands: number;
  nodes: number;
}
function children(node: XMLElement, style: Style, hidden: boolean, state: State): readonly NodeDefinition[] {
  return Object.freeze(
    node.children.flatMap((child) => (child.kind === "element" ? emit(child, style, hidden, state) : [])),
  );
}
function nestedViewport(node: XMLElement, content: readonly NodeDefinition[]): PaintingGroupNode {
  const box = viewBox(node);
  const target = {
    x: attribute(node, "x"),
    y: attribute(node, "y"),
    w: attribute(node, "width", box[2], true),
    h: attribute(node, "height", box[3], true),
  };
  if (!target.w || !target.h) return Object.freeze({ type: "paintGroup", children: Object.freeze([]) });
  const t = transform(
    node.attrs.transform?.value,
    `${node.path}/@transform`,
    node.attrs.transform?.span ?? node.span,
    node.attrs.transform?.offsets,
  );
  const child = Object.freeze({
    type: "paintGroup",
    transform: viewport(node, target),
    children: content,
  } satisfies PaintingGroupNode);
  return Object.freeze({
    type: "paintGroup",
    transform: multiply(t, [1, 0, 0, 1, target.x, target.y]),
    clip: Object.freeze({ x: 0, y: 0, width: target.w, height: target.h }),
    children: Object.freeze([child]),
  });
}
function emit(node: XMLElement, parent: Style, suppressed: boolean, state: State): readonly NodeDefinition[] {
  const name = state.inspection.names.get(node);
  if (!name) svgFail("SVG_UNSUPPORTED", node.path, "Uninspected SVG node", node.span);
  if (["defs", "style", "title", "desc"].includes(name)) return [];
  state.nodes += name === "svg" ? 2 : 1;
  if (state.nodes > 10000) svgFail("LIMIT", node.path, "SVG emitted node budget exceeded", node.span);
  const style = cascade(node, parent, state.inspection.rules, state.diagnostics);
  const hidden = suppressed || style.display === "none";
  const matrix = transform(
    node.attrs.transform?.value,
    `${node.path}/@transform`,
    node.attrs.transform?.span ?? node.span,
    node.attrs.transform?.offsets,
  );
  try {
    if (name === "g" || name === "svg") {
      const content = children(node, style, hidden, state);
      return [
        name === "svg"
          ? nestedViewport(node, content)
          : Object.freeze({ type: "paintGroup", transform: matrix, children: content }),
      ];
    }
    const path = commands(geometry(node, name), node.path);
    state.commands += path.length;
    if (state.commands > 100000) svgFail("LIMIT", node.path, "SVG total command budget exceeded", node.span);
    const paint = resolved(style, node);
    return hidden || style.visibility !== "visible"
      ? []
      : [Object.freeze({ type: "path", commands: path, transform: matrix, paint })];
  } catch (error: unknown) {
    mapped(error, node.path, node.span);
  }
}
export function compile(
  root: XMLElement,
  target: SVGTarget,
  inspection: Inspection,
  diagnostics: SVGDiagnostic[],
): PaintingGroupNode {
  // Target clip is owned outside viewBox/root transforms, in caller viewport space.
  const style = cascade(root, defaults, inspection.rules, diagnostics);
  for (const key of ["x", "y", "width", "height"])
    if (root.attrs[key]) attribute(root, key, 0, key === "width" || key === "height");
  const state: State = { inspection, diagnostics, commands: 0, nodes: 2 };
  const sourceTransform = transform(
    root.attrs.transform?.value,
    `${root.path}/@transform`,
    root.attrs.transform?.span ?? root.span,
    root.attrs.transform?.offsets,
  );
  // Outermost SVG uses its initial 50%/50% viewport transform-origin (unlike g).
  // Root transforms act outside viewBox scaling, but inside caller placement/clip.
  const rootTransform = multiply(multiply([1, 0, 0, 1, target.w / 2, target.h / 2], sourceTransform), [
    1,
    0,
    0,
    1,
    -target.w / 2,
    -target.h / 2,
  ]);
  const matrix = multiply(rootTransform, viewport(root, target));
  const child = Object.freeze({
    type: "paintGroup",
    transform: matrix,
    children: children(root, style, style.display === "none", state),
  } satisfies PaintingGroupNode);
  return Object.freeze({
    type: "paintGroup",
    transform: Object.freeze([1, 0, 0, 1, target.x, target.y] as const),
    clip: Object.freeze({ x: 0, y: 0, width: target.w, height: target.h }),
    children: Object.freeze([child]),
  });
}
