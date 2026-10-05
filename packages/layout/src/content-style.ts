import {
  fail,
  type LayoutOperation,
  type LineHeight,
  validateDataObject as record,
  snapshotData,
} from "@updf/core/internal";
import { type TextStyle, validateLineHeight } from "@updf/text";
import { backgroundColor } from "./inline-background.js";
export type StyleSources = Readonly<Record<keyof TextStyle, string>>;
export function initialOrigins(path: string): StyleSources {
  return { font: `${path}/style/font`, fontSize: `${path}/style/fontSize`, color: `${path}/style/color` };
}
export function styleOrigins(base: StyleSources, override: unknown, path: string): StyleSources {
  if (!override || typeof override !== "object") return base;
  const result = { ...base };
  for (const key of ["font", "fontSize", "color"] as const) if (key in override) result[key] = `${path}/${key}`;
  return result;
}

export function textStyle(
  base: Omit<TextStyle, "font"> & { readonly font?: string },
  override: unknown,
  path: string,
  operation: LayoutOperation,
): TextStyle {
  const value = override as Readonly<Record<string, unknown>>;
  const result = snapshotData(
    {
      ...base,
      ...("font" in value ? { font: value.font } : {}),
      ...("fontSize" in value ? { fontSize: value.fontSize } : {}),
      ...("color" in value ? { color: value.color } : {}),
    },
    path,
  ) as Omit<TextStyle, "font"> & { readonly font?: string };
  return operation.resolveStyle(result, path);
}
export function authorStyle(override: unknown, path: string, paragraph = false): Readonly<Record<string, unknown>> {
  const value = override === undefined ? {} : override;
  record(
    value,
    ["font", "fontSize", "color", "lineHeight", ...(paragraph ? ["textAlign"] : ["backgroundColor"])],
    path,
  );
  for (const key of Object.keys(value))
    if (value[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined style fields");
  if ("lineHeight" in value) validateLineHeight(value.lineHeight as LineHeight, `${path}/lineHeight`);
  if ("backgroundColor" in value) backgroundColor(value.backgroundColor, `${path}/backgroundColor`);
  if ("textAlign" in value && !["left", "center", "right"].includes(value.textAlign as string))
    fail("VALUE", `${path}/textAlign`, "Expected text alignment");
  return value;
}
