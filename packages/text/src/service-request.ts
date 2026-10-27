import { createTextServiceRequest, fail } from "@updf/core/internal";
import type { CapabilityScope } from "@updf/core/internal";
import type { TextServiceRequest, TextServiceBinding, TextServiceProvider } from "@updf/core/resources";
import type { ResolvedTextResources } from "./text-resources.js";

type Resolver = (scope: CapabilityScope) => ResolvedTextResources;
type Factory<T> = (scope: CapabilityScope, resolve: Resolver) => TextServiceBinding<T>;
let factories: WeakMap<object, Factory<unknown>> | undefined;
/** Trusted optional modules supply logic, while the service keeps its existing resolver. */
export function defineServiceRequest<T>(factory: Factory<T>): TextServiceRequest<T> {
  const request = createTextServiceRequest<T>();
  factories ??= new WeakMap();
  factories.set(request, factory);
  return request;
}
export function serviceProvider(resolve: Resolver): TextServiceProvider {
  return (request, scope) => {
    const factory = factories?.get(request);
    if (!factory) fail("FONT_RESOURCE", "", "Unsupported text service request protocol");
    return factory(scope, resolve);
  };
}
