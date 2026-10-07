import type { SvgNode } from "./authoring-types.js";
import { svgFail } from "./error.js";
import type { Attribute, XMLElement, XMLText } from "./types.js";

interface Budget {
  bytes: number;
  elements: number;
  entries: number;
  readonly active: Set<object>;
}
function payload(value: string, path: string, budget: Budget): string {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    let bytes = code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes = 4;
        i++;
      }
    }
    budget.bytes += bytes;
    if (budget.bytes > 1024 * 1024) svgFail("LIMIT", path, "SVG structured payload exceeds 1 MiB UTF-8");
  }
  return value;
}
export function dataFields(value: unknown, path: string, limit: number): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    svgFail("SVG_GEOMETRY", path, "Expected a structured data object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype)
    svgFail("SVG_GEOMETRY", path, "Expected a plain structured data object");
  const keys = Reflect.ownKeys(value);
  if (keys.length > limit) svgFail("LIMIT", path, "Structured property budget exceeded");
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor) || !descriptor.enumerable)
      svgFail("SVG_GEOMETRY", path, "Expected enumerable string-keyed data properties, not accessors");
    result[key] = descriptor.value;
  }
  return result;
}
function attrs(value: unknown, path: string, budget: Budget): Readonly<Record<string, Attribute>> {
  const fields = dataFields(value, path, 64);
  const result: Record<string, Attribute> = Object.create(null);
  for (const [key, entry] of Object.entries(fields)) {
    const location = `${path}/@${key}`;
    const field = dataFields(entry, location, 1);
    if (typeof field.value !== "string") svgFail("SVG_GEOMETRY", location, "Attribute values must be strings");
    result[payload(key, location, budget)] = Object.freeze({ value: payload(field.value, location, budget) });
  }
  return Object.freeze(result);
}
function arrayChildren(
  value: readonly unknown[],
  path: string,
  depth: number,
  budget: Budget,
): (XMLElement | XMLText)[] {
  const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
  if (!Number.isSafeInteger(length) || length > 20000) svgFail("LIMIT", path, "Structured array budget exceeded");
  if (Reflect.ownKeys(value).length !== length + 1) svgFail("SVG_GEOMETRY", path, "Expected a dense data array");
  const result: (XMLElement | XMLText)[] = [];
  for (let i = 0; i < length; i++) {
    const entry = Object.getOwnPropertyDescriptor(value, String(i));
    if (!entry || !("value" in entry)) svgFail("SVG_GEOMETRY", `${path}/${i}`, "Array accessors are forbidden");
    result.push(...visit(entry.value, `${path}/${i}`, depth, budget));
  }
  return result;
}
function element(value: object, path: string, depth: number, budget: Budget): XMLElement {
  const fields = dataFields(value, path, 4);
  if (fields.kind !== "element" || typeof fields.name !== "string" || !Array.isArray(fields.children))
    svgFail("SVG_GEOMETRY", path, "Expected an SVG element with name, attrs and children");
  if (++budget.elements > 10000) svgFail("LIMIT", path, "SVG element budget exceeded");
  return Object.freeze({
    kind: "element",
    name: payload(fields.name, path, budget),
    attrs: attrs(fields.attrs, path, budget),
    children: Object.freeze(visit(fields.children, `${path}/children`, depth + 1, budget)),
    path,
  });
}
function visit(value: unknown, path: string, depth: number, budget: Budget): (XMLElement | XMLText)[] {
  if (depth > 65 || budget.active.size > 128 || ++budget.entries > 40000)
    svgFail("LIMIT", path, "SVG structured depth/node budget exceeded");
  if (value === null || value === undefined || value === false) return [];
  if (typeof value === "string") return [Object.freeze({ kind: "text", text: payload(value, path, budget), path })];
  if (typeof value !== "object") svgFail("SVG_GEOMETRY", path, "Unsupported SVG child; numbers are attributes only");
  if (!Array.isArray(value) && depth > 64) svgFail("LIMIT", path, "SVG element depth budget exceeded");
  if (budget.active.has(value)) svgFail("SVG_GEOMETRY", path, "Cyclic SVG data");
  budget.active.add(value);
  const result = Array.isArray(value)
    ? arrayChildren(value, path, depth, budget)
    : [element(value, path, depth, budget)];
  budget.active.delete(value);
  return result;
}
export function structuredRoot(node: SvgNode): XMLElement {
  const nodes = visit(node, "/svg", 0, { bytes: 0, elements: 0, entries: 0, active: new Set() });
  const root = nodes[0];
  if (nodes.length !== 1 || root?.kind !== "element") svgFail("SVG_GEOMETRY", "/svg", "Expected one SVG root");
  return root;
}
