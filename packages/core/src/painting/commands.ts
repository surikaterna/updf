import { fail } from "../core/error.js";
import { array, finite, validateDataObject as record } from "../core/schema.js";
import type { PathCommand } from "./types.js";

export function commands(value: unknown, path: string): readonly PathCommand[] {
  array(value, Number.MAX_SAFE_INTEGER, path);
  let started = false;
  return Object.freeze(
    value.map((item, i): PathCommand => {
      const at = `${path}/${i}`;
      record(item, ["type", "x", "y", "x1", "y1", "x2", "y2"], at);
      if (item.type === "close") {
        record(item, ["type"], at);
        if (!started) fail("GEOMETRY", at, "Close requires a subpath");
        return Object.freeze({ type: "close" });
      }
      if (item.type !== "move" && item.type !== "line" && item.type !== "cubic")
        fail("TYPE", `${at}/type`, "Unsupported typed path command");
      if (item.type === "move") started = true;
      if (!started) fail("GEOMETRY", at, "Path must begin with move");
      record(item, item.type === "cubic" ? ["type", "x", "y", "x1", "y1", "x2", "y2"] : ["type", "x", "y"], at);
      const end = { x: finite(item.x, `${at}/x`), y: finite(item.y, `${at}/y`) };
      return Object.freeze(
        item.type === "cubic"
          ? {
              type: "cubic",
              ...end,
              x1: finite(item.x1, at),
              y1: finite(item.y1, at),
              x2: finite(item.x2, at),
              y2: finite(item.y2, at),
            }
          : { type: item.type, ...end },
      );
    }),
  );
}
