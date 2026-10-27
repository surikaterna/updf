/** @jsxImportSource @updf/core */
import { floatable, type FloatingBlockProps } from "@updf/text-flow";
import { Block, Paragraph } from "@updf/layout";
// @ts-expect-error paired root factory is removed, not aliased
import { createTextFlow } from "@updf/text-flow";
// @ts-expect-error atomic factory is explicit, not a root re-export
import { createAtomicTextFlow } from "@updf/text-flow";
// @ts-expect-error path types belong to /path only
import type { FloatingPathProps } from "@updf/text-flow";
// @ts-expect-error atomic props belong to /atomic only
import type { TextFlowProps } from "@updf/text-flow";
// @ts-expect-error path grammar type belongs to /path only
import type { SideShape } from "@updf/text-flow";
const f = floatable(Block);
// @ts-expect-error only the real Block component is supported
export const unsupported = floatable(Paragraph);
// @ts-expect-error dimensions and side are mandatory
export const missing = <f />;
// @ts-expect-error root has no path facade
export const path = f.Path;
// @ts-expect-error root has no atomic facade
export const atomic = f.TextFlow;
export const props: FloatingBlockProps = {
  // @ts-expect-error old untagged path objects are not source descriptors
  style: { width: 10, height: 10, float: "left", shapeOutside: { d: "M0 0Z" } },
};
export const undefinedShape: FloatingBlockProps = {
  // @ts-expect-error explicit undefined is not omission
  style: { width: 10, height: 10, float: "left", shapeOutside: undefined },
};
export type Removed = [FloatingPathProps, TextFlowProps, SideShape];
void createAtomicTextFlow;
void createTextFlow;
