export type FillRule = "nonzero" | "evenodd";
export interface ShapeOptions {
  readonly fillRule?: FillRule;
}
export interface URLSource {
  readonly kind: "url";
  readonly src: string;
}
export interface PathSource {
  readonly kind: "path";
  readonly d: string;
  readonly fillRule: FillRule;
}
export interface PolygonSource {
  readonly kind: "polygon";
  readonly points: readonly number[];
  readonly fillRule: FillRule;
}
export type ShapeSource = URLSource | PathSource | PolygonSource;

function invalid(field: string): never {
  throw new TypeError(`Source.${field}: invalid source data`);
}
function rule(value: unknown, supplied: boolean): FillRule {
  if (!supplied) return "nonzero";
  if (!value || typeof value !== "object" || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    invalid("options");
  for (const key of Reflect.ownKeys(value)) {
    const property = Object.getOwnPropertyDescriptor(value, key)!;
    if (key !== "fillRule" || !("value" in property)) invalid("options");
  }
  if (!Object.hasOwn(value, "fillRule")) return "nonzero";
  const result = (value as ShapeOptions).fillRule;
  if (result !== "nonzero" && result !== "evenodd") invalid("fillRule");
  return result;
}
function url(src: string): URLSource {
  if (arguments.length !== 1 || typeof src !== "string" || src.length === 0) invalid("url.src");
  return Object.freeze({ kind: "url", src });
}
function path(d: string, options?: ShapeOptions): PathSource {
  if (arguments.length > 2 || typeof d !== "string") invalid("path.d");
  return Object.freeze({ kind: "path", d, fillRule: rule(options, arguments.length === 2) });
}
function polygon(points: readonly number[], options?: ShapeOptions): PolygonSource {
  const fillRule = rule(options, arguments.length === 2);
  if (
    arguments.length > 2 ||
    !Array.isArray(points) ||
    Object.getPrototypeOf(points) !== Array.prototype ||
    points.length < 6 ||
    points.length > 8190 ||
    points.length % 2
  )
    invalid("polygon.points");
  if (Reflect.ownKeys(points).length !== points.length + 1) invalid("polygon.points");
  const copy: number[] = [];
  for (let index = 0; index < points.length; index++) {
    const property = Object.getOwnPropertyDescriptor(points, String(index));
    if (!property || !("value" in property) || typeof property.value !== "number" || !Number.isFinite(property.value))
      invalid("polygon.points");
    copy.push(property.value);
  }
  return Object.freeze({ kind: "polygon", points: Object.freeze(copy), fillRule });
}
/** Pure immutable data builders. Invalid arguments throw TypeError; no parsing or I/O occurs. */
export const Source = Object.freeze({ url, path, polygon });
