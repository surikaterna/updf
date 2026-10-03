import { fail, validateDataObject } from "@updf/core/internal";

export function documentProps(
  value: unknown,
  fields: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  validateDataObject(value, fields, path);
  for (const key of Object.keys(value))
    if (value[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined fields");
}
