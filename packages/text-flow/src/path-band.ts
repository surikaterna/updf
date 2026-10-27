import { DocumentError, fail, validateDataObject } from "@updf/core/internal";
import { parsePathData } from "@updf/geometry";
import { prepareCommands, type Charge, type PathBand } from "./command-band.js";
export { prepareCommands } from "./command-band.js";
export type { Charge, PathBand } from "./command-band.js";

export type SideShape = "rect" | string | { readonly d: string; readonly fillRule?: "nonzero" | "evenodd" };
export interface PathShape {
  readonly d: string;
  readonly fillRule: "nonzero" | "evenodd";
  readonly dataPath?: string;
}
export function pathShape(input: unknown, path: string): PathShape | undefined {
  if (input === undefined || input === "rect") return undefined;
  const object = typeof input === "string" ? { d: input } : input;
  validateDataObject(object, ["d", "fillRule"], path);
  const dataPath = typeof input === "string" ? path : `${path}/d`;
  if (typeof object.d !== "string") fail("TYPE", dataPath, "Expected SVG path data, not a resource URL");
  const fillRule = Object.hasOwn(object, "fillRule") ? object.fillRule : "nonzero";
  if (fillRule !== "nonzero" && fillRule !== "evenodd") fail("VALUE", `${path}/fillRule`, "Unknown path fill rule");
  return Object.freeze({ d: object.d, fillRule, dataPath });
}
export function authoredGeometry<T>(read: () => T, root: string, path: string): T {
  try {
    return read();
  } catch (error) {
    if (!(error instanceof DocumentError)) throw error;
    const diagnostic = error.diagnostics[0];
    if (!diagnostic || (diagnostic.path !== root && !diagnostic.path.startsWith(`${root}/`))) throw error;
    throw new DocumentError(diagnostic.code, path + diagnostic.path.slice(root.length), diagnostic.message, diagnostic);
  }
}
export function preparePathBand(
  shape: PathShape,
  width: number,
  height: number,
  side: "left" | "right",
  charge: Charge,
  path: string,
): PathBand {
  // Input scanning and normalized retained edge work are distinct charges.
  charge(shape.d.length + 1);
  const commands = authoredGeometry(() => parsePathData(shape.d), "/path", shape.dataPath ?? `${path}/d`);
  return prepareCommands(commands, width, height, side, charge, path);
}
