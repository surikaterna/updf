import { fail, type LayoutOperation, sum } from "@updf/core/internal";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { MeasureContext } from "./extension-types.js";
import type { PreparedBlock } from "./protocol.js";

export interface VisualRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface VisualReferenceRequest {
  readonly operation: LayoutOperation;
  readonly lifetime: ExtensionLifetime;
  readonly source: object;
  readonly width: number;
  readonly height: number | undefined;
}
interface Report extends VisualReferenceRequest {
  readonly rectangle: VisualRectangle;
  readonly direct: boolean;
}
const contexts = new WeakMap<object, VisualReferenceRequest>();
const reports = new WeakMap<object, Report>();

export function bindVisualReferenceContext(context: object, request: VisualReferenceRequest): void {
  contexts.set(context, request);
}
/** Publish the existing placement object, not another evaluation of placement arithmetic. */
export function publishVisualReference<T extends object>(
  context: MeasureContext,
  measured: T,
  rectangle: VisualRectangle,
): T {
  const request = contexts.get(context);
  if (!request?.lifetime.active || !Object.isFrozen(rectangle))
    fail("MEASUREMENT_CONTEXT", context.sourcePath, "Expected active immutable visual placement");
  reports.set(measured, { ...request, rectangle, direct: true });
  return measured;
}
export function forwardMeasuredReference(from: object, to: object, request: VisualReferenceRequest): void {
  const report = reports.get(from);
  if (!report) return;
  if (
    !request.lifetime.active ||
    report.operation !== request.operation ||
    report.lifetime !== request.lifetime ||
    report.source !== request.source ||
    report.width !== request.width ||
    report.height !== request.height
  )
    fail("MEASUREMENT_CONTEXT", "", "Foreign or stale visual measurement report");
  reports.set(to, report);
}
export function liftDirectVisualReference(
  child: PreparedBlock,
  parent: PreparedBlock,
  origin: { readonly x: number; readonly y: number },
): void {
  const report = reports.get(child);
  if (!report?.direct) return;
  if (!report.lifetime.active) fail("MEASUREMENT_CONTEXT", "", "Visual reference lifetime has closed");
  const rectangle = Object.freeze({
    ...report.rectangle,
    x: sum([origin.x, report.rectangle.x]),
    y: sum([origin.y, report.rectangle.y]),
  });
  reports.set(parent, { ...report, rectangle, direct: false });
}
export function forwardVisualReference(from: object, to: object): void {
  const report = reports.get(from);
  if (report) reports.set(to, { ...report, direct: false });
}
export function relayVisualReference(context: MeasureContext, from: object, to: object): void {
  const report = reports.get(from);
  if (!report) return;
  const request = contexts.get(context);
  if (!request?.lifetime.active || report.operation !== request.operation || report.lifetime !== request.lifetime)
    fail("MEASUREMENT_CONTEXT", context.sourcePath, "Foreign visual content report");
  reports.set(to, { ...request, rectangle: report.rectangle, direct: false });
}
export function readVisualReference(value: object, operation: LayoutOperation, lifetime: ExtensionLifetime) {
  const report = reports.get(value);
  if (!report || !lifetime.active || report.operation !== operation || report.lifetime !== lifetime)
    fail("MEASUREMENT_CONTEXT", "", "Expected this active operation's visual reference report");
  return report.rectangle;
}
export function hasVisualReference(value: object): boolean {
  return reports.has(value);
}
