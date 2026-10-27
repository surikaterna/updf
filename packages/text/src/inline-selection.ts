import { fail, number, ownTextOutput, snapshotData, validateDataObject } from "@updf/core/internal";
import type { CapabilityScope } from "@updf/core/internal";
import { exceeds } from "./arithmetic.js";
import { nativeLine, prepareInlineAtoms } from "./inline.js";
import type {
  InlineSelectionOperation,
  InlineContinuation,
  InlineSelection,
  SelectedInlineLine,
} from "./inline-selection-types.js";
import { inlineEnvelope, type InlineLineHeights } from "./line-height.js";
import { line } from "./lines.js";
import type { ResolvedTextResources } from "./text-resources.js";
import type { ParagraphDefinition } from "./types.js";
import { lineSelector } from "./wrap-selector.js";
import { indexedSelector } from "./indexed-selector.js";
import { captureInlineMetrics, validateInlineHeight } from "./inline-selection-input.js";
import { prepareBand, queryBand, type BandCertificate } from "./inline-band.js";
import type { Atom } from "./wrap.js";

interface Source {
  readonly paragraph: ParagraphDefinition;
  readonly height: boolean | InlineLineHeights;
  readonly fonts: ResolvedTextResources;
  readonly path: string;
  readonly atoms: readonly Atom[];
  band?: BandCertificate;
}
interface Position {
  readonly source: Source;
  readonly selector: ReturnType<typeof indexedSelector>;
}
interface Owner {
  readonly scope: CapabilityScope;
  readonly fonts: (context: CapabilityScope) => ResolvedTextResources;
  readonly charge: (amount: number, path: string) => void;
  readonly positions: WeakMap<object, Position>;
  readonly selections: WeakMap<object, SelectedInlineLine>;
}
/** Optional continuations share atoms, selector and line/native owners with uniform inline. */
export function inlineSelection(scope: CapabilityScope, fonts: Owner["fonts"], charge: Owner["charge"]) {
  const owner: Owner = { scope, fonts, charge, positions: new WeakMap(), selections: new WeakMap() };
  return (origin: { readonly path: string }, check: () => void): InlineSelectionOperation =>
    Object.freeze<InlineSelectionOperation>({
      canSelectInline(continuation, width, at) {
        check();
        const path = origin.path || at || "";
        owner.charge(1, path);
        number(width, `${path}/width`, true);
        const wrapped = ownedPosition(owner, continuation, path).selector.fork().next(width);
        return wrapped === undefined || !("blocked" in wrapped);
      },
      prepareInline(paragraph, visuals, width, height, at) {
        check();
        return prepare(owner, [paragraph, visuals, width, height], origin.path || at || "");
      },
      inlinePosition(continuation, at) {
        check();
        const path = origin.path || at || "";
        owner.charge(1, path);
        return ownedPosition(owner, continuation, path).selector.position();
      },
      inlineBand(continuation, top, at) {
        check();
        const path = origin.path || at || "";
        return band(owner, continuation, top, path);
      },
      resumeInline(source, offset, at) {
        check();
        const path = origin.path || at || "";
        owner.charge(1, path);
        const previous = ownedPosition(owner, source, path);
        return position(owner, { source: previous.source, selector: previous.selector.resume(offset) });
      },
      selectInline(continuation, request, at) {
        check();
        return select(owner, continuation, request, origin.path || at || "");
      },
      selectedInline(selection, at) {
        check();
        return ownedSelection(owner, selection, origin.path || at || "");
      },
    });
}
function ownedSelection(owner: Owner, selection: InlineSelection, path: string): SelectedInlineLine {
  const value = selection && owner.selections.get(selection);
  if (!value) fail("MEASUREMENT_CONTEXT", path, "Expected inline selection owned by this active operation");
  return value;
}
function band(owner: Owner, continuation: InlineContinuation, top: number, path: string) {
  const source = ownedPosition(owner, continuation, path).source;
  owner.charge(1, path);
  number(top, `${path}/top`);
  source.band ??= prepareBand(source, owner.charge, path);
  return queryBand(source.band, top, path);
}
function visitor(owner: Owner, path: string) {
  return (value: unknown) => {
    owner.charge(1, path);
    if (typeof value === "string") for (const _scalar of value) owner.charge(1, path);
  };
}
function position(owner: Owner, value: Position): InlineContinuation {
  const handle = Object.freeze({}) as InlineContinuation;
  owner.positions.set(handle, value);
  return handle;
}
function ownedPosition(owner: Owner, handle: InlineContinuation, path: string): Position {
  const value = handle && owner.positions.get(handle);
  if (!value) fail("MEASUREMENT_CONTEXT", path, "Expected inline continuation owned by this active operation");
  return value;
}
function prepare(owner: Owner, args: Parameters<InlineSelectionOperation["prepareInline"]>, path: string) {
  const [paragraph, visuals, width, height] = args;
  const captured = snapshotData({ paragraph, height }, path, undefined, visitor(owner, path));
  validateInlineHeight(captured.height, owner.scope.budget.policy.nodes, `${path}/height`);
  const fonts = owner.fonts(owner.scope);
  const metrics = () =>
    captureInlineMetrics(
      visuals(),
      captured.paragraph.runs.length,
      owner.scope.budget.policy.nodes,
      `${path}/visuals`,
      visitor(owner, path),
    );
  const input = prepareInlineAtoms(
    captured.paragraph,
    metrics,
    width,
    captured.height,
    fonts,
    owner.scope.budget,
    path,
  );
  const source: Source = { ...captured, fonts, path, atoms: input };
  const charge = (n: number) => owner.charge(n, path);
  const selector = indexedSelector(
    lineSelector(input, source.paragraph, owner.scope.budget, path, charge),
    path,
    charge,
  );
  return position(owner, { source, selector });
}
function select(
  owner: Owner,
  continuation: InlineContinuation,
  request: { readonly width: number; readonly maxHeight?: number },
  path: string,
): InlineSelection | undefined {
  owner.charge(1, path);
  const previous = ownedPosition(owner, continuation, path);
  const captured = snapshotData(request, path, undefined, visitor(owner, path));
  validateDataObject(captured, ["width", "maxHeight"], path);
  number(captured.width, `${path}/width`, true);
  if ("maxHeight" in captured) number(captured.maxHeight, `${path}/maxHeight`);
  const selector = previous.selector.fork();
  const measured = selectLine(previous.source, selector, captured.width, owner.scope);
  if (!measured || (captured.maxHeight !== undefined && exceeds(measured.line.height, captured.maxHeight)))
    return undefined;
  const handle = Object.freeze({}) as InlineSelection;
  owner.selections.set(
    handle,
    Object.freeze({
      startOffset: previous.selector.position().offset,
      nextOffset: selector.position().offset,
      measured: ownTextOutput(measured, path, visitor(owner, path)),
      width: captured.width,
      continuation: selector.done ? undefined : position(owner, { source: previous.source, selector }),
    }),
  );
  return handle;
}
function selectLine(source: Source, selector: Position["selector"], width: number, scope: CapabilityScope) {
  const wrapped = selector.next(width);
  if (!wrapped) return undefined;
  if ("blocked" in wrapped) throw wrapped.blocked;
  const { paragraph, height, fonts, path } = source;
  const envelope = typeof height === "boolean" ? undefined : inlineEnvelope(wrapped, paragraph, height, fonts, path);
  const measured = line(wrapped, paragraph, 0, 0, width, fonts, scope.budget, path, !!height, envelope).publicLine;
  return nativeLine(measured, width, fonts, path);
}
