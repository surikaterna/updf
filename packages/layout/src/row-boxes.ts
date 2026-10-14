import { fail, number, validateDataObject as record } from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-boxes";
import { allocateBoxLayout, type BoxStyle, type BoxView } from "@updf/layout-boxes/boxes";
import type { RowAlignment } from "./row-types.js";
import type { Sizing } from "./sizing.js";

export function boxStyle(box: Sizing): BoxStyle {
  const { height, minHeight, maxHeight } = box.style;
  return {
    ...(height === undefined ? {} : { height }),
    ...(minHeight === undefined ? {} : { minHeight }),
    ...(maxHeight === undefined ? {} : { maxHeight }),
    overflow: box.style.overflow === "hidden" ? "clip" : "error",
    paddingTop: box.inset.top,
    paddingRight: box.inset.right,
    paddingBottom: box.inset.bottom,
    paddingLeft: box.inset.left,
  };
}
export function trackStyle(input: unknown, path: string): BoxStyle {
  if (input === undefined) return { flexGrow: 1 };
  if (typeof input === "number") return { width: number(input, path, true) };
  record(input, ["weight", "min", "max"], path);
  const weight = number(input.weight, `${path}/weight`, true);
  const min = "min" in input ? number(input.min, `${path}/min`, true) : undefined;
  const max = "max" in input ? number(input.max, `${path}/max`, true) : undefined;
  if (min !== undefined && max !== undefined && min > max)
    fail("GEOMETRY", `${path}/max`, "Contradictory track bounds");
  return {
    flexGrow: weight,
    ...(min === undefined ? {} : { minWidth: min }),
    ...(max === undefined ? {} : { maxWidth: max }),
  };
}
export function rowAllocation(
  box: Sizing,
  columns: readonly Record<string, unknown>[],
  shells: readonly Sizing[],
  align: RowAlignment,
  path: string,
) {
  const styles = shells.map((shell, i) => ({
    ...boxStyle(shell),
    ...trackStyle(columns[i]?.width ?? undefined, `${path}/tracks/${i}`),
  }));
  const view: BoxView<number, number> = {
    id: (node) => String(node),
    path: (node) => (node === -1 ? path : `${path}/children/${node}`),
    style: (node) =>
      node === -1
        ? {
            ...boxStyle(box),
            width: box.width,
            flexDirection: "row",
            gap: box.gap,
            alignItems:
              align === "top" ? "start" : align === "middle" ? "center" : align === "bottom" ? "end" : "stretch",
          }
        : styles[node]!,
    childCount: (node) => (node === -1 ? columns.length : 0),
    childAt: (_node, index) => index,
    content: (node) => (node === -1 ? undefined : node),
  };
  // Source/output budgets remain host-owned; these synthetic shells add no authored work.
  const limit = Number.MAX_SAFE_INTEGER;
  return rowKernel(
    () =>
      allocateBoxLayout({
        root: -1,
        view,
        width: box.width,
        containment: "metric",
        limits: { nodes: limit, depth: limit, childCalls: limit, measurements: limit },
      }),
    path,
    true,
  );
}
export function rowKernel<T>(run: () => T, path: string, preflight = false, hiddenPaths: readonly string[] = []): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof LayoutInputError) {
      const inset = preflight && error.path.startsWith(`${path}/children/`) && error.code === "GEOMETRY";
      const overflow =
        !preflight &&
        (error.message === "Box height cannot truncate content" ||
          (error.message === "Box height must reserve vertical insets" && !hiddenPaths.includes(error.path)));
      fail(overflow ? "VERTICAL_OVERFLOW" : error.code, inset ? `${error.path}/style` : error.path, error.message);
    }
    throw error;
  }
}
