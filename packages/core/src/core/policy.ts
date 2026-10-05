import { ownDataValue } from "./data.js";
import { fail } from "./error.js";
import type { OwnedResource } from "./owned-resource.js";
import type { ResourceProvider } from "./resource-types.js";
import { validateDataObject as record } from "./schema.js";
import type { TextService } from "./text-service.js";

/** Optional resource budgets. Counts are nonnegative safe integers; text uses Unicode code points. */
export interface Limits {
  readonly depth?: number;
  readonly nodes?: number;
  readonly pages?: number;
  readonly textCodePoints?: number;
  readonly pathCommands?: number;
  readonly resourceBytes?: number;
  readonly outputBytes?: number;
}
export interface OperationOptions {
  readonly profile?: "trusted" | "service";
  readonly limits?: Limits;
  readonly resources?: Readonly<Record<string, OwnedResource>>;
  readonly text?: TextService;
  readonly providers?: readonly ResourceProvider[];
}
/** Service defaults: nesting, source/generated nodes, pages, scalar text, commands, unique resource/output bytes. */
export const SERVICE_LIMITS: Readonly<Required<Limits>> = Object.freeze({
  depth: 128,
  nodes: 10000,
  pages: 20,
  textCodePoints: 100000,
  pathCommands: 100000,
  resourceBytes: 8 * 1024 * 1024,
  outputBytes: 10 * 1024 * 1024,
});
export type Policy = Readonly<Required<Limits>>;
const limitKeys = Object.keys(SERVICE_LIMITS);
const trusted = Object.freeze(Object.fromEntries(limitKeys.map((key) => [key, Number.MAX_SAFE_INTEGER]))) as Policy;

export function policy(options: unknown = {}, additional: readonly string[] = []): Policy {
  record(options, ["profile", "limits", "resources", "text", "providers", ...additional], "/options");
  if ("profile" in options && options.profile !== "trusted" && options.profile !== "service")
    fail("VALUE", "/options/profile", "Expected trusted or service profile");
  if (Object.hasOwn(options, "resources") && ownDataValue(options, "resources", "/options/resources") === undefined)
    fail("TYPE", "/options/resources", "Present resources require a data value");
  const defaults = options.profile === "service" ? SERVICE_LIMITS : trusted;
  if (!("limits" in options)) return defaults;
  record(options.limits, limitKeys, "/options/limits");
  for (const key of Object.keys(options.limits)) {
    const value = options.limits[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      fail("VALUE", `/options/limits/${key}`, "Expected nonnegative safe integer");
  }
  return Object.freeze({ ...defaults, ...options.limits });
}
export function checkLimit(value: number, maximum: number, path: string, unit: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum)
    fail("LIMIT", path, `${unit} limit exceeded (maximum ${maximum})`);
  return value;
}
export function codePoints(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if ((text.codePointAt(i) ?? 0) > 0xffff) i++;
    count++;
  }
  return count;
}
