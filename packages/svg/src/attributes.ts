import { properties } from "./css.js";
import { svgFail } from "./error.js";
import type { XMLElement } from "./types.js";

const shapes: Readonly<Record<string, readonly string[]>> = {
  svg: ["x", "y", "width", "height", "viewBox", "preserveAspectRatio", "version"],
  g: [],
  path: ["d"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  polygon: ["points"],
  polyline: ["points"],
  defs: [],
  style: ["type"],
  title: [],
  desc: [],
};
const inert = ["id", "data-name"];
export function tag(node: XMLElement, namespace: Readonly<Record<string, string>>): string {
  const pair = node.name.split(":");
  const prefix = pair.length === 2 ? pair[0] : "";
  const local = pair.length === 2 ? pair[1] : pair[0];
  if (
    !local ||
    pair.length > 2 ||
    (prefix && namespace[prefix] !== "http://www.w3.org/2000/svg") ||
    (!prefix && namespace[""] !== undefined && namespace[""] !== "http://www.w3.org/2000/svg")
  )
    svgFail("SVG_UNSUPPORTED", node.path, "Unsupported element namespace", node.span);
  if (!Object.hasOwn(shapes, local))
    svgFail("SVG_UNSUPPORTED", node.path, `Unsupported SVG element ${local}`, node.span);
  return local;
}
export function namespaces(
  node: XMLElement,
  parent: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const result = { ...parent };
  for (const [name, attribute] of Object.entries(node.attrs)) {
    if (name === "xmlns" || name.startsWith("xmlns:")) {
      if (
        attribute.value !== "http://www.w3.org/2000/svg" &&
        !(name === "xmlns:xlink" && attribute.value === "http://www.w3.org/1999/xlink")
      )
        svgFail("SVG_UNSUPPORTED", `${node.path}/@${name}`, "Unsupported namespace declaration", attribute.span);
      result[name === "xmlns" ? "" : name.slice(6)] = attribute.value;
    }
  }
  return Object.freeze(result);
}
export function attributes(node: XMLElement, name: string): void {
  const geometry = shapes[name] ?? [];
  const dataOnly = ["style", "title", "desc", "defs"].includes(name);
  const allowed = dataOnly
    ? [...inert, ...geometry]
    : [...inert, ...geometry, ...properties, "class", "style", "transform"];
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === "xmlns" || key.startsWith("xmlns:")) continue;
    if (!allowed.includes(key))
      svgFail("SVG_UNSUPPORTED", `${node.path}/@${key}`, "Unsupported/event/reference/visual attribute", value.span);
  }
  if (name === "svg" && node.attrs.version && !["1.0", "1.1", "2.0"].includes(node.attrs.version.value))
    svgFail("SVG_UNSUPPORTED", node.path, "Unsupported SVG version", node.attrs.version.span);
  if (name === "style" && node.attrs.type && node.attrs.type.value !== "text/css")
    svgFail("SVG_UNSUPPORTED", node.path, "Only text/css styles are supported", node.attrs.type.span);
}
