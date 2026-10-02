import { attributes, namespaces, tag } from "./attributes.js";
import { stylesheet } from "./css.js";
import { svgFail } from "./error.js";
import { concatenate } from "./source.js";
import type { ClassRule, SVGDiagnostic, XMLElement, XMLText } from "./types.js";

export interface Inspection {
  readonly names: ReadonlyMap<XMLElement, string>;
  readonly rules: readonly ClassRule[];
}
function inertText(node: XMLElement): readonly XMLText[] {
  const result: XMLText[] = [];
  for (const child of node.children) {
    if (child.kind !== "text")
      svgFail("SVG_UNSUPPORTED", child.path, "Inert/style content must be text only", child.span);
    result.push(child);
  }
  return result;
}
function visit(
  node: XMLElement,
  parent: Readonly<Record<string, string>>,
  names: Map<XMLElement, string>,
  rules: ClassRule[],
  diagnostics: SVGDiagnostic[],
  budget: { count: number },
  root: boolean,
): void {
  const scope = namespaces(node, parent);
  const name = tag(node, scope);
  if (root && name !== "svg") svgFail("SVG_XML", node.path, "Expected a single SVG root", node.span);
  attributes(node, name);
  names.set(node, name);
  if (["style", "title", "desc"].includes(name)) {
    const content = inertText(node);
    if (name === "style") {
      const logical = concatenate(content, node.span);
      rules.push(...stylesheet(logical.value, `${node.path}/text`, logical.span, diagnostics, budget, logical.offsets));
    }
    return;
  }
  for (const child of node.children) {
    if (child.kind === "text") {
      if (child.text.trim()) svgFail("SVG_UNSUPPORTED", child.path, "SVG visual text is unsupported", child.span);
      continue;
    }
    const childName = tag(child, namespaces(child, scope));
    if (name === "defs" && childName !== "style")
      svgFail(
        "SVG_UNSUPPORTED",
        child.path,
        "defs is restricted to stylesheet declarations, not referenced artwork",
        child.span,
      );
    if (!["svg", "g", "defs"].includes(name) && !["title", "desc"].includes(childName))
      svgFail("SVG_UNSUPPORTED", child.path, "Drawing elements cannot contain visual children", child.span);
    visit(child, scope, names, rules, diagnostics, budget, false);
  }
}
export function inspect(root: XMLElement, diagnostics: SVGDiagnostic[]): Inspection {
  const names = new Map<XMLElement, string>();
  const rules: ClassRule[] = [];
  visit(root, {}, names, rules, diagnostics, { count: 0 }, true);
  return Object.freeze({ names, rules: Object.freeze(rules) });
}
