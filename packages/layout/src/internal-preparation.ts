/** Optional same-state preparation coordinator; transport and codecs belong to extensions. */
import { fail, ownDataValue, type NormalizedContent, validateDataObject } from "@updf/core/internal";
import { createPreparingDrawingOperation } from "@updf/core/internal-preparation";
import type { LowerOptions } from "@updf/core/vdom";
import { dataRecipe } from "./content-data.js";
import type { DocumentProps } from "./document-types.js";
import { isExtensionBlock } from "./extensions.js";
import { layoutDocument, scoped } from "./mixed-layout.js";
import { captureDocument } from "./preparation-content.js";
import { preparationResources, type ResourceRequest } from "./preparation-resource.js";
import { preparationSignal, type PreparationSignal } from "./preparation-signal.js";
import { bindVisualCapture, consumeOccurrenceReplacements } from "./visual-preparation.js";
export { replaceVisualResource, replaceParticipationData } from "./visual-preparation.js";
export { capturedVisualOwner } from "./visual-preparation.js";
export type { CapturedVisualResource, VisualReplacement } from "./visual-preparation.js";

export { definePreparationResource } from "./preparation-resource.js";
export { attachPreparationResource } from "./preparation-resource.js";
export { attachParticipationPreparationResource } from "./preparation-resource.js";
export type { PreparationResource, PreparationContext, PreparationCaptureContext } from "./preparation-resource.js";
export type { PreparationSignal } from "./preparation-signal.js";
export { definePreparationService, readPreparationService } from "./preparation-service.js";
export type { PreparationService } from "./preparation-service.js";
declare const preparationBrand: unique symbol;
export interface PreparedDocument {
  readonly [preparationBrand]: true;
}
type Stage = ReturnType<typeof createPreparingDrawingOperation>;
type OutputOptions = ReturnType<Stage["options"]>;
const prepared = new WeakMap<object, { stage: Stage; root: NormalizedContent; options: OutputOptions }>();

export async function prepareDocument(
  content: unknown,
  options: LowerOptions = {},
  preparation: { readonly signal?: PreparationSignal } = {},
): Promise<PreparedDocument> {
  validateDataObject(preparation, ["signal"], "/preparation");
  const signal = ownDataValue(preparation, "signal", "/preparation/signal");
  if (Object.hasOwn(preparation, "signal") && signal === undefined)
    fail("TYPE", "/preparation/signal", "Omit an absent abort capability");
  const stage = createPreparingDrawingOperation(options);
  let cancellation: ReturnType<typeof preparationSignal> | undefined;
  const queue: { node: NormalizedContent; requests: readonly ResourceRequest[] }[] = [];
  let resources: ReturnType<typeof preparationResources> | undefined;
  try {
    cancellation = preparationSignal(signal, stage.controls.close);
    resources = preparationResources(stage.operation.contributions, stage.operation);
    let capturing = true;
    stage.controls.recipes((recipe, path, snapshot) => resources!.capture(recipe, path, capturing, snapshot));
    const root = captureDocument(
      content,
      stage.operation,
      stage.controls,
      (node) => {
        const request = typeof node.value === "string" ? undefined : resources!.requests.get(node.value);
        if (request) queue.push({ node, requests: request });
      },
      (node) => (typeof node.value === "string" ? undefined : resources!.content(node.value)),
    );
    capturing = false;
    stage.controls.suspend();
    resources.start(resolverContext(stage, cancellation, signal));
    await resolveRequests(queue, stage, cancellation, resources.resolve);
    cancellation.check();
    const finalOptions = stage.options();
    stage.controls.seal([root]);
    const handle = Object.freeze(Object.create(null)) as PreparedDocument;
    prepared.set(handle, { stage, root, options: finalOptions });
    return handle;
  } catch (error) {
    stage.controls.close();
    throw error;
  } finally {
    cancellation?.close();
    resources?.close();
  }
}

function resolverContext(stage: Stage, cancellation: ReturnType<typeof preparationSignal>, signal?: PreparationSignal) {
  return Object.freeze({
    ...(signal === undefined ? {} : { signal }),
    resourceBytes: stage.resourceBytes,
    remaining: stage.remaining,
    appendProvider: stage.appendProvider,
    retain: (resource: import("@updf/core/resources").OwnedResource, path: string) => {
      cancellation.check();
      if (typeof path !== "string" || !path.startsWith("/"))
        fail("TYPE", "/preparation/resource", "Expected source path");
      return stage.append(resource, path);
    },
    check: () => {
      cancellation.check();
      stage.remaining();
    },
  });
}

async function resolveRequests(
  queue: readonly { node: NormalizedContent; requests: readonly ResourceRequest[] }[],
  stage: Stage,
  cancellation: ReturnType<typeof preparationSignal>,
  resolve: (request: ResourceRequest) => Promise<import("@updf/core/resources").OwnedResource>,
): Promise<void> {
  for (const { node, requests } of queue) {
    const results = [];
    for (const request of requests) results.push(await resolveRequest(node, request, stage, cancellation, resolve));
    const slots = results.filter((result) => result.capture !== undefined);
    if (slots.length) {
      stage.controls.replace(
        node,
        consumeOccurrenceReplacements(
          slots as { token: unknown; capture: import("./visual-preparation.js").CapturedVisualResource }[],
          node,
          stage.operation,
        ),
      );
      continue;
    }
    const replacement = results[0]!.token;
    if (!isExtensionBlock(replacement))
      fail("TYPE", node.path, "Prepared replacement must be an owned extension block");
    stage.controls.replace(node, dataRecipe(replacement, node.path));
  }
}

async function resolveRequest(
  node: NormalizedContent,
  input: ResourceRequest,
  stage: Stage,
  cancellation: ReturnType<typeof preparationSignal>,
  resolve: (request: ResourceRequest) => Promise<import("@updf/core/resources").OwnedResource>,
) {
  const { descriptor, request, visual } = input;
  cancellation.check();
  const resource = await cancellation.wait(
    Promise.resolve().then(() => {
      cancellation.check();
      return resolve({ descriptor, request, ...(visual ? { visual } : {}) });
    }),
  );
  cancellation.check();
  const id = stage.append(resource, node.path);
  if (visual) bindVisualCapture(visual, resource, id, stage.operation);
  const replacement = descriptor.replace(request, resource, id);
  return { token: replacement, capture: visual };
}

/** One-shot consumption: failure closes the operation and cannot be retried. */
export function layoutPrepared(handle: PreparedDocument) {
  const owned = handle && typeof handle === "object" ? prepared.get(handle) : undefined;
  if (!owned) fail("MEASUREMENT_CONTEXT", "/preparation", "Expected unconsumed owned prepared document");
  prepared.delete(handle);
  const { stage, root, options } = owned;
  try {
    if (typeof root.value === "string") fail("VDOM_HIERARCHY", root.path, "Expected layout Document");
    const props = root.value.props as DocumentProps;
    const result = stage.controls.layout(() =>
      scoped(root, stage.operation, () => layoutDocument({ props }, stage.operation, root)),
    );
    return Object.freeze({ ...result, options });
  } finally {
    stage.controls.close();
  }
}
