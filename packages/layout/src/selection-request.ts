import type { SelectionRequest } from "@updf/layout-boxes/fragmentation";
import { exceeds, sum } from "@updf/core/internal";
import type { FragmentRequest, FragmentRequestContext } from "./protocol.js";

/** Resolved geometry needs a capacity check, not a registered source or a new work ledger. */
export function frameFits(request: FragmentRequest, height: number): boolean {
  return (
    request.offset === 0 &&
    (request.mode === "complete" || !exceeds(sum([request.usedHeight, height]), request.freshHeight))
  );
}

/** Carry operation services without transporting an unrelated parent's physical bounds. */
export function selectionContext(request: FragmentRequest, offset: number, width: number): FragmentRequestContext {
  return {
    offset,
    width,
    ...(request.budget ? { budget: request.budget } : {}),
    ...(request.state ? { state: request.state } : {}),
    ...(request.reserve ? { reserve: request.reserve } : {}),
  };
}

export function unitSelectionRequest(request: FragmentRequest): SelectionRequest {
  const { offset, width } = request;
  return request.mode === "complete"
    ? { mode: "complete", offset, width }
    : { offset, width, height: request.freshHeight, usedHeight: request.usedHeight };
}
