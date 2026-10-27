import { fail } from "./error.js";
import { checkCapabilityScope, type CapabilityScope, type CapabilityOrigin } from "./operation-capability.js";

declare const requestBrand: unique symbol;
/** Version-one trusted request identity; no feature protocol or resolver lives in core. */
export interface TextServiceRequest<T> {
  readonly [requestBrand]: T;
}
export type TextServiceBinding<T> = (origin: CapabilityOrigin, check: () => void) => T;
export type TextServiceProvider = (
  request: TextServiceRequest<unknown>,
  scope: CapabilityScope,
) => TextServiceBinding<unknown>;
let requests: WeakSet<object> | undefined;
export function createTextServiceRequest<T>(): TextServiceRequest<T> {
  const request = Object.freeze(Object.create(null)) as TextServiceRequest<T>;
  requests ??= new WeakSet();
  requests.add(request);
  return request;
}
export function checkTextServiceRequest(value: unknown): asserts value is TextServiceRequest<unknown> {
  if (!value || typeof value !== "object" || !requests?.has(value))
    fail("MEASUREMENT_CONTEXT", "", "Expected owned version-one text service request");
}
export function requestTextService<T>(scope: CapabilityScope, request: TextServiceRequest<T>): TextServiceBinding<T> {
  checkCapabilityScope(scope);
  checkTextServiceRequest(request);
  if (!scope.textProvider) fail("FONT_RESOURCE", "", "Text service does not support optional selection requests");
  const bind = scope.textProvider(request, scope);
  if (typeof bind !== "function") fail("FONT_RESOURCE", "", "Text service request requires an operation binding");
  return bind as TextServiceBinding<T>;
}
