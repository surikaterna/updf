import { fail } from "./error.js";
import { array } from "./schema.js";
import { bounds, count, field, fragments, record } from "./text-output-shapes.js";

export function validateMeasurement(value: unknown, path: string): void {
  const result = record(value, path);
  field(result, "width", path, true);
  field(result, "consumedHeight", path, true);
  const lineCount = count(result, "lineCount", path);
  array(result.lines, Number.MAX_SAFE_INTEGER, `${path}/lines`);
  if (lineCount !== result.lines.length) fail("GEOMETRY", `${path}/lineCount`, "Invalid line count");
  result.lines.forEach((value, i) => {
    const at = `${path}/lines/${i}`;
    const line = record(value, at);
    count(line, "paragraphIndex", at);
    for (const key of ["top", "height", "advance"]) field(line, key, at, true);
    field(line, "baseline", at);
    bounds(line.inkBounds, `${at}/inkBounds`);
    fragments(line.fragments, `${at}/fragments`, false);
    if (!["hard", "soft", "paragraphEnd"].includes(line.breakReason as string))
      fail("VALUE", `${at}/breakReason`, "Expected line break reason");
  });
}
