import { ownDataValue, snapshot } from "./data.js";
import { fail } from "./error.js";
import { compositionWork, type WorkLedger } from "../measurement/ledger.js";

/** Count occurrences, not unique identities; strings also charge each Unicode scalar. */
export function compositionCaptureVisitor(budget: WorkLedger, path: string) {
  return (item: unknown): void => {
    compositionWork(budget, 1, path);
    if (typeof item === "string") for (const _scalar of item) compositionWork(budget, 1, path);
  };
}

export type OutputValidator = (value: unknown, path: string) => void;
export function captureTextCallback(
  value: Record<string, unknown>,
  key: string,
  path: string,
  validate: OutputValidator,
) {
  const callback = ownDataValue(value, key, `${path}/${key}`);
  if (typeof callback !== "function") fail("FONT_RESOURCE", `${path}/${key}`, "Missing text service capability");
  return (...args: unknown[]) => {
    const path = args.at(-1) as string;
    const result = ownTextOutput(callback.apply(value, args), path);
    validate(result, path);
    return result;
  };
}
/** Clone returned data but retain opaque run identities for the resource provider. */
export function ownTextOutput<T>(value: T, path: string, visit: (item: unknown, at: string) => void = () => {}): T {
  return snapshot(
    value,
    path,
    (item, at) => {
      if (typeof item === "number" && !Number.isFinite(item)) fail("GEOMETRY", at, "Text output must be finite");
      if (!at.endsWith("/run")) return false;
      if (!item || typeof item !== "object") fail("FONT_RESOURCE", at, "Expected opaque text run");
      return true;
    },
    visit,
  );
}
