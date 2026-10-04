import { fail } from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-kernel";
import { type BoxPlacement, viewBox } from "@updf/layout-kernel/boxes";
import type { PreparedBlock } from "./protocol.js";
import type { RowAlignment } from "./row-types.js";
import type { Sizing } from "./sizing.js";

export function rowPlacement(
  box: Sizing,
  columns: readonly PreparedBlock[],
  align: RowAlignment,
  height: number,
  path: string,
): BoxPlacement {
  try {
    return viewBox({
      width: box.width,
      height,
      paddingTop: box.inset.top,
      paddingRight: box.inset.right,
      paddingBottom: box.inset.bottom,
      paddingLeft: box.inset.left,
      gap: box.gap,
      alignItems: align === "top" ? "start" : align === "middle" ? "center" : align === "bottom" ? "end" : "stretch",
      childCount: columns.length,
      childAt: (index) => {
        const column = columns[index];
        if (!column) fail("TYPE", path, "Missing prepared Column");
        return column.naturalSize;
      },
      path,
    });
  } catch (error) {
    if (error instanceof LayoutInputError) fail(error.code, error.path, error.message);
    throw error;
  }
}
