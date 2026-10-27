import {
  fail,
  contentChildren,
  ownContentData,
  type LayoutOperation,
  type NormalizedContent,
  type SemanticRecipe,
} from "@updf/core/internal";
import { h } from "@updf/core/vdom";
import type { OwnedResource } from "@updf/core/resources";
import { adapterSnapshot, captureContent } from "./author-parts.js";
import { installVisualContent, installVisualSource } from "./visual-preparation-state.js";
import { Block } from "./content-data.js";
import type { VisualPreparationOwner, VisualSource } from "./visual-owner.js";

export type PreparationSlot = "visual-resource" | "participation-data";

declare const replacementBrand: unique symbol;
export interface VisualReplacement {
  readonly [replacementBrand]: true;
}
export interface CapturedVisualResource {
  readonly props: VisualSource["props"];
  readonly visual: Readonly<Record<string, unknown>>;
  readonly data?: object;
  readonly body?: VisualSource["body"];
}
interface Occurrence {
  readonly owner: VisualPreparationOwner | undefined;
  readonly recipe: SemanticRecipe;
  readonly source: VisualSource;
  active: boolean;
  operation?: LayoutOperation;
  readonly bound: Set<SlotCapture>;
}
interface SlotCapture {
  readonly occurrence: Occurrence;
  readonly slot: PreparationSlot;
  binding?: { resource: OwnedResource; id: string };
  issued: boolean;
}
const captures = new WeakMap<object, SlotCapture>();
const replacements = new WeakMap<object, { capture: SlotCapture; source: VisualSource }>();
export function capturedVisualOwner(capture: CapturedVisualResource): object | undefined {
  const selected = captures.get(capture);
  if (!selected?.occurrence.active) fail("PHASE", "/preparation/visual", "Expected active owned capture");
  return selected.occurrence.owner?.identity;
}
/** Only metadata-only participation exposes its canonical body to the existing capture walk. */
export function participationCaptureContent(capture: CapturedVisualResource): { readonly body: unknown } | undefined {
  const selected = captures.get(capture);
  if (!selected?.occurrence.active || selected.slot !== "participation-data" || selected.occurrence.owner)
    return undefined;
  const source = selected.occurrence.source;
  return { body: source.body ?? source.props.children };
}

export function captureVisualOccurrence(
  owner: VisualPreparationOwner | undefined,
  recipe: SemanticRecipe,
  source: VisualSource,
  slot: PreparationSlot = "visual-resource",
  sibling?: CapturedVisualResource,
) {
  const child = (source.body ?? source.props.children) as { readonly props?: Readonly<Record<string, unknown>> } | null;
  const capture = Object.freeze({
    props: source.props,
    visual: child?.props ?? Object.freeze({}),
    ...(slot === "participation-data" ? { data: source.data, body: source.body } : {}),
  });
  const occurrence = sibling
    ? captures.get(sibling)!.occurrence
    : { owner, recipe, source, active: true, bound: new Set<SlotCapture>() };
  captures.set(capture, { occurrence, slot, issued: false });
  return capture;
}
/** Only the exact private capture supplied to a selected descriptor grants replacement authority. */
export function replaceVisualResource(
  capture: CapturedVisualResource,
  resource: OwnedResource,
  id: string,
): VisualReplacement {
  const selected = resolvingCapture(capture, resource, id, "visual-resource");
  const occurrence = selected.occurrence;
  if (!occurrence.owner)
    fail("MEASUREMENT_CONTEXT", "/preparation/visual", "Expected resolving owned visual capture binding");
  const token = Object.freeze(Object.create(null)) as VisualReplacement;
  replacements.set(token, { capture: selected, source: occurrence.owner.replace(occurrence.source, resource, id) });
  return token;
}
export function replaceParticipationData(
  capture: CapturedVisualResource,
  resource: OwnedResource,
  id: string,
  data: object,
): VisualReplacement {
  const selected = resolvingCapture(capture, resource, id, "participation-data");
  const token = Object.freeze(Object.create(null)) as VisualReplacement;
  replacements.set(token, {
    capture: selected,
    source: { ...selected.occurrence.source, data: adapterSnapshot(data, "/preparation/data") },
  });
  return token;
}
function resolvingCapture(capture: object, resource: OwnedResource, id: string, slot: PreparationSlot): SlotCapture {
  const selected = capture && typeof capture === "object" ? captures.get(capture) : undefined;
  if (
    !selected?.occurrence.active ||
    selected.issued ||
    selected.slot !== slot ||
    selected.binding?.resource !== resource ||
    selected.binding.id !== id
  )
    fail("MEASUREMENT_CONTEXT", "/preparation/visual", "Expected resolving owned slot capture binding");
  selected.issued = true;
  return selected;
}
export function consumeVisualReplacement(
  token: unknown,
  capture: CapturedVisualResource,
  node: NormalizedContent,
  operation: LayoutOperation,
): SemanticRecipe {
  return consumeOccurrenceReplacements([{ token, capture }], node, operation);
}
export function consumeOccurrenceReplacements(
  results: readonly { token: unknown; capture: CapturedVisualResource }[],
  node: NormalizedContent,
  operation: LayoutOperation,
): SemanticRecipe {
  const occurrence = results.length ? captures.get(results[0]!.capture)?.occurrence : undefined;
  const entries = results.map(({ token, capture }) => {
    const entry = token && typeof token === "object" ? replacements.get(token) : undefined;
    if (
      !entry ||
      !occurrence?.active ||
      occurrence.operation !== operation ||
      entry.capture !== captures.get(capture) ||
      entry.capture.occurrence !== occurrence ||
      node.value !== occurrence.recipe
    )
      fail("MEASUREMENT_CONTEXT", node.path, "Expected this occurrence's unconsumed slot replacement");
    return entry;
  });
  if (
    !occurrence ||
    occurrence.bound.size !== entries.length ||
    new Set(entries.map(({ capture }) => capture.slot)).size !== entries.length
  )
    fail("MEASUREMENT_CONTEXT", node.path, "Duplicate occurrence slot replacement");
  let source = occurrence.source;
  for (const entry of entries)
    source =
      entry.capture.slot === "visual-resource"
        ? {
            ...source,
            props: entry.source.props,
            ...(entry.source.body === undefined ? {} : { body: entry.source.body }),
          }
        : { ...source, data: entry.source.data! };
  for (const { token } of results) replacements.delete(token as object);
  occurrence.active = false;
  return installOccurrence(occurrence, source, node, operation);
}
function installOccurrence(
  occurrence: Occurrence,
  source: VisualSource,
  node: NormalizedContent,
  operation: LayoutOperation,
): SemanticRecipe {
  const body = occurrence.owner ? (source.body ?? source.props.children) : contentChildren(node);
  const scoped = captureContent(body, node, operation);
  const props = ownContentData(Object.freeze({ ...source.props }));
  if (source.body === undefined)
    installVisualContent(props, captureContent(h(Block, props), node, operation, node.path));
  const data = source.data === undefined ? undefined : ownContentData(source.data);
  const resolved = {
    ...source,
    props,
    ...(data === undefined ? {} : { data }),
    ...(source.body === undefined && data === undefined ? {} : { body: scoped }),
  };
  installVisualSource(occurrence.recipe, resolved, operation);
  return occurrence.recipe;
}
export function closeVisualCapture(capture: CapturedVisualResource): void {
  const occurrence = captures.get(capture);
  if (occurrence) occurrence.occurrence.active = false;
}
export function discardVisualCapture(capture: CapturedVisualResource): void {
  captures.delete(capture);
}
export function bindVisualCapture(
  capture: CapturedVisualResource,
  resource: OwnedResource,
  id: string,
  operation: LayoutOperation,
): void {
  const occurrence = captures.get(capture);
  if (!occurrence?.occurrence.active || occurrence.binding || occurrence.issued)
    fail("MEASUREMENT_CONTEXT", "/preparation/visual", "Expected queued slot capture");
  occurrence.binding = { resource, id };
  if (occurrence.occurrence.operation && occurrence.occurrence.operation !== operation)
    fail("MEASUREMENT_CONTEXT", "/preparation/visual", "Foreign slot operation");
  occurrence.occurrence.operation = operation;
  occurrence.occurrence.bound.add(occurrence);
}
