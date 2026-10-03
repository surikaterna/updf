import type { NodeDefinition } from "@updf/core";

export function nativeData(input: unknown): input is readonly NodeDefinition[] {
  if (!Array.isArray(input)) return false;
  return input.every((node) => {
    if (!node || typeof node !== "object") return false;
    const type = Object.getOwnPropertyDescriptor(node, "type")?.value;
    return ["text", "richText", "rect", "line", "path", "paintGroup"].includes(type);
  });
}
