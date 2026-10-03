import type { ResolvedFonts } from "../fonts/resources.js";
import type { RenderOptions } from "../fonts/types.js";
import { type InlineLine, type InlineMetric, measureInline } from "../measurement/inline.js";
import { ledger, type WorkLedger } from "../measurement/ledger.js";
import type { InlineLineHeights } from "../measurement/line-height.js";
import { measureInput } from "../measurement/measure.js";
import type {
  InkBounds,
  ParagraphDefinition,
  TextMeasurement,
  TextMeasurementInput,
  TextStyle,
} from "../measurement/types.js";
import { validateStyle } from "../measurement/validate.js";
import type { DocumentDefinition, NodeDefinition } from "../types.js";
import { bindRendererContext, type RendererBinding } from "../vdom/context.js";
import {
  type ContentGuard,
  type DataRecipe,
  type NormalizedContent,
  normalizeScoped,
  withContentScope,
} from "../vdom/normalize.js";
import { operationState } from "../vdom/operation-state.js";
import type { State } from "../vdom/state.js";
import { DocumentError, fail } from "./error.js";
import { nativeInk } from "./ink.js";
import { measure } from "./measure.js";
import { operation } from "./operation.js";
import type { Policy } from "./policy.js";
import { validate } from "./validate.js";

/** Internal adapter seam: no resolved resources or serializer plans escape. */
export interface LayoutOperation {
  readonly policy: Policy;
  readonly scoped: <T>(scope: object, invoke: () => T) => T;
  readonly finalContext: <T, R>(context: RendererBinding<T>, value: T, invoke: () => R) => R;
  readonly lowerDrawing: (input: unknown, width: number, height: number, path: string) => readonly NodeDefinition[];
  readonly measureText: (input: TextMeasurementInput, path: string) => TextMeasurement;
  readonly validateFixed: (nodes: readonly NodeDefinition[], width: number, height: number, path: string) => number;
  readonly validateDocument: (document: DocumentDefinition) => void;
  readonly normalizeContent: (
    input: unknown,
    resolve: DataRecipe,
    path: string,
    guard?: ContentGuard,
    native?: DataRecipe,
    numeric?: boolean,
  ) => readonly NormalizedContent[];
  readonly measureInline: (
    paragraph: ParagraphDefinition,
    visuals: () => readonly InlineMetric[],
    width: number,
    autoHeight: boolean | InlineLineHeights,
    path: string,
  ) => readonly InlineLine[];
  readonly nativeInk: (nodes: readonly NodeDefinition[]) => InkBounds;
  readonly close: () => void;
  readonly validateStyle: (style: TextStyle, path: string) => void;
}
const contexts = new WeakMap<object, LayoutOperation>();

export function layoutOperation(
  fonts: ResolvedFonts,
  budget: WorkLedger,
  active: () => boolean,
  parent?: State,
): LayoutOperation {
  const state = parent ?? operationState(fonts, budget);
  const check = (): void => {
    if (!active() || state.closed) fail("MEASUREMENT_CONTEXT", "", "Lowering operation has closed");
  };
  return Object.freeze({
    policy: budget.policy,
    ...contentMethods(state, fonts, budget, check),
    close() {
      if (!parent) state.closed = true;
    },
    measureText(input: TextMeasurementInput, path: string) {
      check();
      return measureInput(input, fonts, budget, path);
    },
    validateFixed(nodes: readonly NodeDefinition[], width: number, height: number, path: string) {
      check();
      return validateFixed(nodes, width, height, path, fonts, budget.policy);
    },
    validateDocument(document: DocumentDefinition) {
      check();
      validateGenerated(document, fonts, budget.policy);
    },
  });
}
type ContentMethods = Pick<
  LayoutOperation,
  "validateStyle" | "nativeInk" | "measureInline" | "normalizeContent" | "scoped" | "finalContext" | "lowerDrawing"
>;
function contentMethods(state: State, fonts: ResolvedFonts, budget: WorkLedger, check: () => void): ContentMethods {
  return {
    scoped<T>(scope: object, invoke: () => T): T {
      check();
      return withContentScope(scope, state, invoke);
    },
    finalContext<T, R>(context: RendererBinding<T>, value: T, invoke: () => R): R {
      check();
      const previous = state.environment;
      state.environment = bindRendererContext(previous, context, value);
      try {
        return invoke();
      } finally {
        state.environment = previous;
      }
    },
    lowerDrawing(input: unknown, width: number, height: number, path: string) {
      check();
      if (!state.drawing) fail("MEASUREMENT_CONTEXT", path, "Drawing finalization requires layout Document");
      return state.drawing(input, width, height, path);
    },
    validateStyle(style: TextStyle, path: string) {
      check();
      validateStyle(style, fonts, path);
    },
    nativeInk(nodes: readonly NodeDefinition[]) {
      check();
      return nativeInk(nodes, fonts, budget.policy);
    },
    measureInline(
      paragraph: ParagraphDefinition,
      visuals: () => readonly InlineMetric[],
      width: number,
      autoHeight: boolean | InlineLineHeights,
      path: string,
    ) {
      check();
      return measureInline(paragraph, visuals, width, autoHeight, fonts, budget, path);
    },
    normalizeContent: (input, resolve, path, guard, native, numeric) => {
      check();
      return normalizeScoped(input, state, resolve, path, guard, native, numeric);
    },
  };
}
function validateGenerated(document: DocumentDefinition, fonts: ResolvedFonts, policy: Policy): void {
  const generated = ledger(policy, false);
  validate(document, fonts, generated);
  measure(document, fonts, generated);
}
function validateFixed(
  nodes: readonly NodeDefinition[],
  width: number,
  height: number,
  path: string,
  fonts: ResolvedFonts,
  policy: Policy,
): number {
  try {
    const fixed = ledger(policy, false);
    const document: DocumentDefinition = {
      version: 1,
      pages: [{ width, height, children: [{ type: "paintGroup", children: nodes }] }],
    };
    validate(document, fonts, fixed);
    measure(document, fonts, fixed);
    return fixed.units;
  } catch (error) {
    if (!(error instanceof DocumentError)) throw error;
    const diagnostic = error.diagnostics[0];
    if (!diagnostic) throw error;
    const local = diagnostic.path.replace(/^\/pages\/0\/children\/0/u, "").replace(/^\/pages\/0/u, "");
    throw new DocumentError(diagnostic.code, `${path}${local}`, diagnostic.message, diagnostic);
  }
}
export function createLayoutOperation(options: RenderOptions): LayoutOperation {
  const owned = operation(options);
  return layoutOperation(owned.fonts, owned.budget, () => true);
}
export function bindLayoutContext(context: object, operation: LayoutOperation): void {
  contexts.set(context, operation);
}
export function contextLayoutOperation(context: object): LayoutOperation {
  const operation = contexts.get(context);
  if (!operation) fail("MEASUREMENT_CONTEXT", "", "Expected an owned component context");
  return operation;
}
