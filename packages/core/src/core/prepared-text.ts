import type { WorkLedger } from "../measurement/ledger.js";
import { compositionWork } from "../measurement/ledger.js";
import { exceeds } from "../measurement/arithmetic.js";
import type { PreparedTextNode } from "../types.js";
import type { CompositionInput, CompositionPlan, ComposedTextFrame } from "./composition-types.js";
import { snapshot } from "./data.js";
import { fail } from "./error.js";
import type { OwnedResource } from "./owned-resource.js";
import { authorizePreparedText, isPreparedTextPayload } from "./prepared-text-ownership.js";
import { number, validateDataObject } from "./schema.js";
import { compositionCaptureVisitor } from "./text-capture.js";
import { type ResolvedTextResources, textService } from "./text-resources.js";

interface PreparedText {
  readonly width: number;
  readonly height: number;
  readonly plan: CompositionPlan;
  readonly resources: ReadonlyMap<string, OwnedResource>;
}
const payloadData = new WeakMap<object, PreparedText>();
export function visitPreparedText(payload: unknown, path: string, visit: (text: string) => void): void {
  const data = isPreparedTextPayload(payload) ? payloadData.get(payload) : undefined;
  if (!data) fail("MEASUREMENT_CONTEXT", path, "Expected authorized prepared text payload");
  for (const fragment of data.plan.fragments) visit(fragment.text);
}

export function preparedTextData(
  node: Pick<PreparedTextNode, "payload" | "width" | "height">,
  fonts: ResolvedTextResources,
  path: string,
): PreparedText {
  const data = isPreparedTextPayload(node.payload) ? payloadData.get(node.payload) : undefined;
  if (!data) fail("MEASUREMENT_CONTEXT", `${path}/payload`, "Expected authorized prepared text payload");
  if (node.width !== data.width || node.height !== data.height)
    fail("GEOMETRY", path, "Prepared text dimensions must match exactly");
  for (const [id, resource] of data.resources)
    if (fonts.bindings.get(id) !== resource) fail("FONT_RESOURCE", path, "Prepared text resource identity mismatch");
  return data;
}
function captureInput(input: CompositionInput, budget: WorkLedger, path: string): CompositionInput {
  compositionWork(budget, 1, path);
  const captured = snapshot(input, path, undefined, compositionCaptureVisitor(budget, path));
  validateDataObject(captured, ["width", "maxHeight", "paragraphs"], path);
  number(captured.width, `${path}/width`, true);
  number(captured.maxHeight, `${path}/maxHeight`);
  return captured;
}
function sealPlan(input: CompositionInput, plan: CompositionPlan, fonts: ResolvedTextResources, path: string) {
  if (plan.measurement.width !== input.width) fail("GEOMETRY", path, "Composition width must match exactly");
  const height = plan.measurement.consumedHeight;
  if (exceeds(height, input.maxHeight)) fail("VERTICAL_OVERFLOW", path, "Composition exceeds maxHeight");
  if (plan.bands.length !== plan.measurement.lineCount) fail("GEOMETRY", path, "Expected one band per line");
  plan.bands.forEach((band, i) => {
    const line = plan.measurement.lines[i];
    const scale = Math.max(Math.abs(line?.top ?? 0), Math.abs(line?.baseline ?? 0), line?.height ?? 0);
    if (exceeds(-band.top, 0, scale) || exceeds(band.bottom, height))
      fail("FONT_INK", path, "Occupied band exceeds composed frame");
  });
  const resources = new Map<string, OwnedResource>();
  for (const fragment of plan.fragments) {
    const ink = fragment.inkBounds;
    if (
      !ink.empty &&
      (exceeds(-ink.left, 0, Math.max(Math.abs(fragment.x), fragment.advance, fragment.style.fontSize)) ||
        exceeds(ink.right, input.width) ||
        exceeds(-ink.top, 0, Math.max(Math.abs(fragment.baseline), fragment.style.fontSize)) ||
        exceeds(ink.bottom, height))
    )
      fail("FONT_INK", path, "Prepared text ink exceeds composed frame");
    const id = fragment.style.font;
    const resource = fonts.bindings.get(id);
    if (!resource) fail("FONT_RESOURCE", path, "Missing composed font binding");
    resources.set(id, resource);
  }
  const payload = Object.freeze(Object.create(null)) as object;
  payloadData.set(payload, { width: input.width, height, plan, resources });
  authorizePreparedText(payload);
  return payload;
}
/** Frames expire with the operation; emitted sealed payloads deliberately do not. */
export function compositionMethods(fonts: ResolvedTextResources, budget: WorkLedger, check: () => void) {
  const frames = new WeakMap<object, object>();
  return {
    composeText(input: CompositionInput, path: string): ComposedTextFrame {
      check();
      const compose = textService(fonts, path).compose;
      if (!compose) fail("FONT_RESOURCE", path, "Text service lacks optional composition capability");
      const captured = captureInput(input, budget, path);
      const plan = compose(captured, { bindings: fonts.bindings, budget }, path);
      const payload = sealPlan(captured, plan, fonts, path);
      const frame = Object.freeze({
        width: captured.width,
        height: plan.measurement.consumedHeight,
        measurement: plan.measurement,
        bands: plan.bands,
      }) as ComposedTextFrame;
      frames.set(frame, payload);
      return frame;
    },
    composedText(frame: ComposedTextFrame, path: string): PreparedTextNode {
      check();
      const payload = frame && frames.get(frame);
      if (!payload) fail("MEASUREMENT_CONTEXT", path, "Expected a frame owned by this active operation");
      return Object.freeze({ type: "preparedText", x: 0, y: 0, width: frame.width, height: frame.height, payload });
    },
  };
}
