/** @jsxImportSource @updf/core */
import { createTextFlow, type FloatingBlockProps } from "@updf/text-flow";
import { createTextSelection } from "@updf/text/selection";
import { fontRuntime } from "@updf/fonts";
// @ts-expect-error atomic factory is explicit, not a root re-export
import { createAtomicTextFlow } from "@updf/text-flow";
// @ts-expect-error path types belong to /path only
import type { FloatingPathProps } from "@updf/text-flow";
// @ts-expect-error atomic props belong to /atomic only
import type { TextFlowProps } from "@updf/text-flow";
// @ts-expect-error path grammar type belongs to /path only
import type { SideShape } from "@updf/text-flow";
const selection = createTextSelection({ runtime: fontRuntime() });
const f = createTextFlow(selection.capability);
// @ts-expect-error root has no path facade
export const path = f.Path;
// @ts-expect-error root has no atomic facade
export const atomic = f.TextFlow;
// @ts-expect-error root shape contract is rectangular
export const props: FloatingBlockProps = { style: { width: 10, height: 10, float: "left", shapeOutside: "M0 0Z" } };
export const undefinedShape: FloatingBlockProps = {
  // @ts-expect-error explicit undefined is not omission
  style: { width: 10, height: 10, float: "left", shapeOutside: undefined },
};
export type Removed = [FloatingPathProps, TextFlowProps, SideShape];
void createAtomicTextFlow;
