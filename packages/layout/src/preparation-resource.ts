import {
  createOperationCapability,
  defineOperationExtension,
  fail,
  ownDataValue,
  type SemanticRecipe,
  type LayoutOperation,
  validateDataObject,
} from "@updf/core/internal";
import type { OwnedResource, ResourceProvider } from "@updf/core/resources";
import { legacyIdentity } from "./content-data.js";
import type { ExtensionBlock } from "./extension-types.js";
import type { Extensions } from "./extension-types.js";
import { copyExtensions } from "./extensions.js";
import type { PreparationSignal } from "./preparation-signal.js";
import { checkPreparationService, preparationServices, type PreparationService } from "./preparation-service.js";
import { visualPreparationOwner, type VisualPreparationOwner, type VisualSource } from "./visual-owner.js";
import { participationPreparationOwner, isParticipationPreparationOwner } from "./participation-preparation.js";
import { aliasParticipation, type FlowParticipation } from "./participation.js";
import { chargeSourceWork } from "./data.js";
import {
  captureVisualOccurrence,
  participationCaptureContent,
  closeVisualCapture,
  discardVisualCapture,
  type CapturedVisualResource,
  type VisualReplacement,
  type PreparationSlot,
} from "./visual-preparation.js";

/** Trusted sibling seam. An absent capture leaves already-resolved content on its ordinary route. */
export interface PreparationResource<T> {
  readonly identity: object;
  readonly slot?: PreparationSlot;
  readonly capture: (
    props: Readonly<Record<string, unknown>>,
    path: string,
    visual?: CapturedVisualResource,
    context?: PreparationCaptureContext,
  ) => T | undefined;
  readonly resolve: (request: T) => Promise<OwnedResource>;
  readonly replace: (request: T, resource: OwnedResource, id: string) => ExtensionBlock | VisualReplacement;
  readonly session?: (context: PreparationContext) => PreparationSession<T>;
  readonly service?: PreparationService<unknown>;
}
export interface PreparationCaptureContext {
  readonly chargeSourceWork: (count: number, sourcePath?: string) => void;
}
export interface PreparationContext {
  readonly signal?: PreparationSignal;
  readonly resourceBytes: number;
  readonly remaining: () => number;
  readonly appendProvider: (provider: ResourceProvider) => void;
  readonly retain: (resource: OwnedResource, path: string) => string;
  readonly check: () => void;
}
export interface PreparationSession<T> {
  readonly resolve: (request: T) => Promise<OwnedResource>;
  readonly close: () => void;
  readonly service?: unknown;
}
type Descriptor = PreparationResource<unknown>;
const descriptors = new WeakMap<object, Descriptor>();

export function definePreparationResource<T>(definition: PreparationResource<T>) {
  const contribution = Object.freeze({});
  attachDescriptor(contribution, definition);
  const capability = createOperationCapability(
    () => () => fail("MEASUREMENT_CONTEXT", "", "Preparation resources are not geometry capabilities"),
  );
  return defineOperationExtension(contribution, capability, contribution);
}
export function attachPreparationResource<T>(extensions: Extensions, definition: PreparationResource<T>): Extensions {
  const contribution = copyExtensions(extensions);
  attachDescriptor(contribution, definition);
  return contribution;
}
export function attachParticipationPreparationResource<T>(
  owner: FlowParticipation,
  definition: PreparationResource<T>,
): FlowParticipation {
  const contribution = aliasParticipation(owner);
  attachDescriptor(contribution, definition);
  const captured = descriptors.get(contribution)!;
  if (captured.identity !== owner || captured.slot !== "participation-data")
    fail("TYPE", "/preparation/resource", "Expected this participation's metadata descriptor");
  return contribution;
}
function attachDescriptor<T>(contribution: object, definition: PreparationResource<T>): void {
  validateDataObject(
    definition,
    ["identity", "slot", "capture", "resolve", "replace", "session", "service"],
    "/preparation/resource",
  );
  const identity = ownDataValue(definition, "identity", "/preparation/resource/identity");
  const slot = ownDataValue(definition, "slot", "/preparation/resource/slot");
  if (Object.hasOwn(definition, "slot") && slot !== "visual-resource" && slot !== "participation-data")
    fail("TYPE", "/preparation/resource/slot", "Expected a private preparation slot");
  if (slot === "participation-data" && (!identity || !isParticipationPreparationOwner(identity as object)))
    fail("TYPE", "/preparation/resource/identity", "Expected an owned participation definition");
  if (slot === "visual-resource" && (!identity || visualPreparationOwner(identity as object)?.identity !== identity))
    fail("TYPE", "/preparation/resource/identity", "Expected an owned visual preparation definition");
  const capture = ownDataValue(definition, "capture", "/preparation/resource/capture");
  const resolve = ownDataValue(definition, "resolve", "/preparation/resource/resolve");
  const replace = ownDataValue(definition, "replace", "/preparation/resource/replace");
  const session = ownDataValue(definition, "session", "/preparation/resource/session");
  const service = ownDataValue(definition, "service", "/preparation/resource/service");
  if (Object.hasOwn(definition, "service")) {
    checkPreparationService(service);
    if (typeof session !== "function") fail("TYPE", "/preparation/resource/session", "Service requires a session");
  }
  if (
    !identity ||
    typeof identity !== "object" ||
    [capture, resolve, replace].some((value) => typeof value !== "function") ||
    (Object.hasOwn(definition, "session") && typeof session !== "function")
  )
    fail("TYPE", "/preparation/resource", "Expected resource preparation descriptor");
  descriptors.set(
    contribution,
    Object.freeze({ identity, slot, capture, resolve, replace, session, service }) as Descriptor,
  );
}

export interface ResourceRequest {
  readonly descriptor: Descriptor;
  readonly request: unknown;
  readonly visual?: CapturedVisualResource;
}
export function preparationResources(contributions: readonly object[] | undefined, operation: LayoutOperation) {
  const selected = selectedResources(contributions);
  const requests = new WeakMap<SemanticRecipe, readonly ResourceRequest[]>();
  const captures: CapturedVisualResource[] = [];
  const sessions = resourceSessions(selected);
  let active = true;
  const captureContext = (path: string) => sourceCaptureContext(operation, path, () => active);
  return {
    requests,
    content: (recipe: SemanticRecipe) => preparationContent(requests.get(recipe)),
    start(context: PreparationContext) {
      active = false;
      sessions.start(context);
    },
    resolve: sessions.resolve,
    close() {
      active = false;
      for (const capture of captures) closeVisualCapture(capture);
      sessions.close();
    },
    capture(
      recipe: SemanticRecipe,
      path: string,
      capturing: boolean,
      snapshot: (recipe: SemanticRecipe) => SemanticRecipe,
    ): SemanticRecipe {
      const owner = visualPreparationOwner(recipe.identity);
      const participation = participationPreparationOwner(recipe.identity);
      const matching = occurrenceDescriptors(selected, recipe.identity, owner?.identity, participation?.identity);
      if (!matching.length) return recipe;
      if (owner || participation) {
        if (!capturing) return lateOwnedResource(matching, owner, participation ?? owner!, recipe, path);
        const canonical = captureVisual(participation ?? owner!, recipe, path, snapshot);
        const pending = captureSlots(matching, owner, canonical, path, captures, captureContext(path));
        if (!pending.length) return recipe;
        requests.set(canonical.occurrence, pending);
        return canonical.occurrence;
      }
      const descriptor = matching[0]!;
      if (!capturing) return lateResource(descriptor, owner, recipe, path);
      const request = descriptor.capture(recipe.props, path, undefined, captureContext(path));
      if (request === undefined) return recipe;
      const placeholder = resourcePlaceholder();
      requests.set(placeholder, [{ descriptor, request }]);
      return placeholder;
    },
  };
}
function preparationContent(requests: readonly ResourceRequest[] | undefined) {
  const capture = requests?.find((request) => request.descriptor.slot === "participation-data")?.visual;
  return capture && participationCaptureContent(capture);
}
function sourceCaptureContext(
  operation: LayoutOperation,
  path: string,
  active: () => boolean,
): PreparationCaptureContext {
  return Object.freeze({
    chargeSourceWork(count: number, sourcePath = path) {
      if (!active()) fail("PHASE", path, "Source capture has sealed");
      if (typeof sourcePath !== "string" || (sourcePath !== path && !sourcePath.startsWith(`${path}/`)))
        fail("TYPE", path, "Expected this capture's source field path");
      if (!Number.isSafeInteger(count) || count < 0) fail("VALUE", path, "Expected source work count");
      chargeSourceWork(count, operation, sourcePath);
    },
  });
}

function lateOwnedResource(
  selected: readonly Descriptor[],
  owner: VisualPreparationOwner | undefined,
  capture: Pick<VisualPreparationOwner, "capture">,
  recipe: SemanticRecipe,
  path: string,
) {
  const captures: CapturedVisualResource[] = [];
  try {
    const source = capture.capture(recipe.props, path);
    const requests = captureSlots(selected, owner, { occurrence: recipe, source }, path, captures);
    if (requests.length) fail("PHASE", path, "Resource request after preparation sealed");
    return recipe;
  } finally {
    for (const capture of captures) closeVisualCapture(capture);
  }
}

function resourceSessions(selected: readonly Descriptor[]) {
  const sessions = new Map<Descriptor, PreparationSession<unknown>>();
  let serviceScope: ReturnType<typeof preparationServices> | undefined;
  return {
    start(context: PreparationContext) {
      serviceScope = preparationServices(context);
      for (const descriptor of selected) {
        if (!descriptor.session) continue;
        const session = descriptor.session(context);
        sessions.set(descriptor, session);
        if (descriptor.service) serviceScope.install(descriptor.service, session.service);
      }
    },
    resolve({ descriptor, request }: ResourceRequest) {
      return (sessions.get(descriptor) ?? descriptor).resolve(request);
    },
    close() {
      serviceScope?.close();
      for (const session of sessions.values()) session.close();
      sessions.clear();
    },
  };
}

function lateResource(
  descriptor: Descriptor,
  owner: VisualPreparationOwner | undefined,
  recipe: SemanticRecipe,
  path: string,
) {
  if (!owner) fail("PHASE", path, "Resource request after preparation sealed");
  const visual = captureVisualOccurrence(owner, recipe, owner.capture(recipe.props, path));
  try {
    if (descriptor.capture(visual.props as unknown as Readonly<Record<string, unknown>>, path, visual) !== undefined)
      fail("PHASE", path, "Resource request after preparation sealed");
    return recipe;
  } finally {
    closeVisualCapture(visual);
  }
}

function resourcePlaceholder() {
  return { identity: legacyIdentity, props: { descriptor: { type: "spacer", height: 0 } }, opaque: true };
}

function captureRequest(
  descriptor: Descriptor,
  props: Readonly<Record<string, unknown>>,
  path: string,
  visual: CapturedVisualResource,
  context?: PreparationCaptureContext,
) {
  try {
    return descriptor.capture(props, path, visual, context);
  } catch (error) {
    closeVisualCapture(visual);
    throw error;
  }
}

function captureVisual(
  owner: Pick<VisualPreparationOwner, "capture">,
  recipe: SemanticRecipe,
  path: string,
  snapshot: (recipe: SemanticRecipe) => SemanticRecipe,
) {
  const input = snapshot(recipe);
  const source = owner.capture(input.props, path);
  const copied = snapshot({ identity: recipe.identity, props: source as unknown as Record<string, unknown> });
  const canonical = copied.props as unknown as typeof source;
  const occurrence = { ...input, opaque: true };
  return { occurrence, source: canonical };
}

function occurrenceDescriptors(selected: readonly Descriptor[], identity: object, visual?: object, data?: object) {
  const matching = selected.filter((entry) =>
    entry.slot === "participation-data" ? entry.identity === data : entry.identity === (visual ?? identity),
  );
  const slots = matching.map((entry) => entry.slot ?? (visual ? "visual-resource" : "legacy"));
  if (new Set(slots).size !== slots.length || (slots.includes("legacy") && slots.length > 1))
    fail("VALUE", "/preparation/resource", "Conflicting occurrence preparation slots");
  return matching.sort((a, b) => Number(a.slot === "participation-data") - Number(b.slot === "participation-data"));
}

function captureSlots(
  selected: readonly Descriptor[],
  owner: VisualPreparationOwner | undefined,
  canonical: { readonly occurrence: SemanticRecipe; readonly source: VisualSource },
  path: string,
  captures: CapturedVisualResource[],
  context?: PreparationCaptureContext,
): ResourceRequest[] {
  const pending: ResourceRequest[] = [];
  let sibling: CapturedVisualResource | undefined;
  for (const descriptor of selected) {
    const visual = captureVisualOccurrence(
      owner,
      canonical.occurrence,
      canonical.source,
      descriptor.slot ?? "visual-resource",
      sibling,
    );
    const request = captureRequest(
      descriptor,
      canonical.source.props as unknown as Readonly<Record<string, unknown>>,
      path,
      visual,
      context,
    );
    captures.push(visual);
    if (request === undefined) {
      discardVisualCapture(visual);
      continue;
    }
    sibling = visual;
    pending.push({ descriptor, request, visual });
  }
  return pending;
}

function selectedResources(contributions: readonly object[] | undefined): Descriptor[] {
  const selected = (contributions ?? []).flatMap((value) => {
    const descriptor = descriptors.get(value);
    return descriptor ? [descriptor] : [];
  });
  if (
    selected.some((entry, index) =>
      selected.slice(0, index).some((prior) => prior.identity === entry.identity && prior.slot === entry.slot),
    )
  )
    fail("VALUE", "/options/extensions", "Duplicate preparation resource identity");
  const services = selected.flatMap(({ service }) => (service ? [service] : []));
  if (new Set(services).size !== services.length)
    fail("VALUE", "/options/extensions", "Duplicate preparation service identity");
  return selected;
}
