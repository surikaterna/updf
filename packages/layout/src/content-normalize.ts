import type { ParagraphDefinition, RGB } from "@updf/core";
import {
  fail,
  type InlineLineHeights,
  type LayoutOperation,
  type LineHeight,
  type NormalizedContent,
  validateDataObject as record,
  type SemanticRecipe,
} from "@updf/core/internal";
import type { TextRun, TextStyle } from "@updf/core/measurement";
import { authorBlock, isAdapterComponent, scopeDataBlock, scopedContent } from "./author-parts.js";
import {
  blockIdentity,
  dataRecipe,
  legacyIdentity,
  paragraphIdentity,
  spanIdentity,
  visualIdentity,
} from "./content-data.js";
import { authorStyle, initialOrigins, type StyleSources, styleOrigins, textStyle } from "./content-style.js";
import type { ParagraphProps } from "./content-types.js";
import { blockBodyIdentity, blockFooterIdentity, blockHeaderIdentity, deferredPlan } from "./deferred-decoration.js";
import { backgroundColor } from "./inline-background.js";
import type { FlowBlock, ParagraphBlock } from "./types.js";

export interface AuthorParagraph {
  readonly path: string;
  readonly definition: ParagraphDefinition;
  readonly lineHeights: InlineLineHeights;
  readonly sources: readonly string[];
  readonly styleSources: readonly StyleSources[];
  readonly backgrounds: ReadonlyMap<number, RGB>;
  readonly visuals: ReadonlyMap<
    number,
    { readonly descriptor: object; readonly style: TextStyle; readonly path: string }
  >;
}
const paragraphs = new WeakMap<object, AuthorParagraph>();
const definitions = new WeakMap<LayoutOperation, WeakMap<object, ParagraphDefinition[]>>();
export function authorParagraph(block: object): AuthorParagraph | undefined {
  return paragraphs.get(block);
}
export function normalizeBlocks(
  input: unknown,
  operation: LayoutOperation,
  path: string,
  defaults?: ParagraphProps,
  implicit = false,
): FlowBlock[] {
  return scopedContent(input, operation, (content, source = path) => {
    const nodes = operation.normalizeContent(
      content,
      dataRecipe,
      source,
      implicit ? undefined : checkRole,
      undefined,
      implicit,
    );
    if (
      implicit &&
      (!nodes.length ||
        nodes.some(
          (node) =>
            typeof node.value === "string" ||
            node.value.identity === spanIdentity ||
            node.value.identity === visualIdentity,
        ))
    ) {
      if (
        nodes.some(
          (node) =>
            typeof node.value !== "string" &&
            node.value.identity !== spanIdentity &&
            node.value.identity !== visualIdentity,
        )
      )
        fail("VDOM_HIERARCHY", source, "Mixed inline and block content requires explicit Paragraphs");
      return [
        normalizeParagraph(
          { value: { identity: paragraphIdentity, props: { ...defaults } }, path: source, children: nodes },
          operation,
        ),
      ];
    }
    return convertBlocks(nodes, operation, defaults);
  });
}
export function checkRole(value: string | SemanticRecipe, path: string, parent: object | undefined): void {
  const inline = parent === paragraphIdentity || parent === spanIdentity;
  if (typeof value === "string") {
    if (!inline) fail("VDOM_HIERARCHY", path, "Text requires a Paragraph");
    return;
  }
  const slot =
    parent === blockIdentity && [blockBodyIdentity, blockHeaderIdentity, blockFooterIdentity].includes(value.identity);
  const valid =
    slot ||
    (inline
      ? value.identity === spanIdentity || value.identity === visualIdentity
      : value.identity === paragraphIdentity ||
        value.identity === blockIdentity ||
        value.identity === legacyIdentity ||
        isAdapterComponent(value.identity));
  if (!valid) fail("VDOM_HIERARCHY", path, inline ? "Expected inline content" : "Inline content requires a Paragraph");
}
export function convertBlocks(
  nodes: readonly NormalizedContent[],
  operation: LayoutOperation,
  defaults?: ParagraphProps,
): FlowBlock[] {
  const result: FlowBlock[] = [];
  const tasks: (() => void)[] = [];
  const visit = (node: NormalizedContent, target: FlowBlock[]): void => {
    const value = node.value;
    if (typeof value === "string") fail("VDOM_HIERARCHY", node.path, "Text requires a Paragraph");
    if (value.identity === paragraphIdentity) {
      target.push(normalizeParagraph(node, operation, defaults));
      return;
    }
    if (value.identity === blockIdentity) {
      const children: FlowBlock[] = [];
      const props = { ...value.props };
      delete props.type;
      delete props.children;
      const parts = blockParts(node, operation);
      if (parts.plan && props.decorations) fail("KEY", node.path, "Use slots or decorations, not both");
      if (parts.plan) props.decorations = parts.plan;
      target.push({ ...props, type: "block", children } as FlowBlock);
      schedule(parts.body, children);
      return;
    }
    const authored = authorBlock(node, operation);
    if (authored) {
      target.push(authored);
      return;
    }
    if (value.identity !== legacyIdentity) fail("VDOM_HIERARCHY", node.path, "Inline content requires a Paragraph");
    target.push(scopeDataBlock(value.props.descriptor, node.scope, operation) as FlowBlock);
  };
  const schedule = (values: readonly NormalizedContent[], target: FlowBlock[]): void => {
    for (let i = values.length - 1; i >= 0; i--) {
      const node = values[i];
      if (node) tasks.push(() => visit(node, target));
    }
  };
  schedule(nodes, result);
  while (tasks.length) tasks.pop()?.();
  return result;
}
function blockParts(node: NormalizedContent, operation: LayoutOperation) {
  const parts: BlockParts = { body: [], decorations: [], seen: new Set(), explicitBody: false };
  for (const child of node.children) appendBlockChild(child, parts, operation);
  return { body: parts.body, plan: deferredPlan(parts.decorations) };
}
interface BlockParts {
  body: NormalizedContent[];
  decorations: NormalizedContent[];
  seen: Set<object>;
  explicitBody: boolean;
}
function appendBlockChild(child: NormalizedContent, parts: BlockParts, operation: LayoutOperation): void {
  if (typeof child.value === "string") fail("VDOM_HIERARCHY", child.path, "Text requires Paragraph");
  const identity = child.value.identity;
  if (identity === blockHeaderIdentity || identity === blockFooterIdentity) {
    if (parts.seen.has(identity)) fail("VDOM_HIERARCHY", child.path, "Duplicate Block slot");
    parts.seen.add(identity);
    parts.decorations.push(child);
    return;
  }
  if (identity === blockBodyIdentity) {
    if (parts.seen.has(identity) || parts.body.length || !child.scope)
      fail("VDOM_HIERARCHY", child.path, "Use one Block.Body or direct body children");
    parts.seen.add(identity);
    parts.explicitBody = true;
    record(child.value.props, ["children"], child.path);
    const input = child.value.props.children;
    const normalized = operation.scoped(child.scope, () =>
      operation.normalizeContent(input, dataRecipe, `${child.path}/children`, checkRole),
    );
    for (const item of normalized) parts.body.push(item);
    return;
  }
  if (parts.explicitBody) fail("VDOM_HIERARCHY", child.path, "Cannot mix Block.Body with direct children");
  parts.body.push(child);
}
function normalizeParagraph(
  node: NormalizedContent,
  operation: LayoutOperation,
  defaults?: ParagraphProps,
): ParagraphBlock {
  if (typeof node.value === "string") fail("TYPE", node.path, "Expected paragraph");
  const props = inheritedParagraph(node.value.props, defaults, node.path);
  const style = authorStyle(props.style, `${node.path}/style`, true);
  const base = textStyle({ font: "Helvetica", fontSize: 10, color: [0, 0, 0] }, style, `${node.path}/style`, operation);
  const runs: TextRun[] = [],
    sources: string[] = [];
  const styleSources: StyleSources[] = [];
  const visuals = new Map<number, { descriptor: object; style: TextStyle; path: string }>();
  const lineHeights: LineHeight[] = [];
  const backgrounds = new Map<number, RGB>();
  const strut = (style.lineHeight ?? "normal") as LineHeight;
  flattenInline(
    node.children,
    base,
    runs,
    sources,
    styleSources,
    visuals,
    node.path,
    operation,
    strut,
    lineHeights,
    backgrounds,
  );
  const typed = props as ParagraphProps;
  const definition = reuseDefinition(node.value.props, operation, paragraphDefinition(runs, base, style, typed));
  if ("keepTogether" in props && typeof props.keepTogether !== "boolean")
    fail("TYPE", node.path, "Expected boolean keepTogether");
  const block: ParagraphBlock = {
    type: "paragraph",
    paragraph: definition,
    ...(typed.keepTogether === undefined ? {} : { keepTogether: typed.keepTogether }),
  };
  paragraphs.set(block, {
    path: node.path,
    definition,
    lineHeights: { strut, runs: lineHeights },
    sources,
    styleSources,
    visuals,
    backgrounds,
  });
  return block;
}
function paragraphDefinition(
  runs: TextRun[],
  base: TextStyle,
  style: Readonly<Record<string, unknown>>,
  typed: ParagraphProps,
): ParagraphDefinition {
  return {
    runs,
    defaultStyle: base,
    lineHeight: base.fontSize,
    align: (style.textAlign ?? "left") as ParagraphDefinition["align"],
    whiteSpace: typed.whiteSpace ?? "collapse",
    breakLongWords: typed.breakLongWords ?? "error",
  };
}
function inheritedParagraph(
  props: Readonly<Record<string, unknown>>,
  defaults: ParagraphProps | undefined,
  path: string,
): Readonly<Record<string, unknown>> {
  record(props, ["children", "style", "whiteSpace", "breakLongWords", "keepTogether"], path);
  for (const key of Object.keys(props))
    if (props[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined fields");
  if (!defaults) return props;
  authorStyle(props.style, `${path}/style`, true);
  authorStyle(defaults.style, `${path}/defaults/style`, true);
  return {
    ...defaults,
    ...props,
    style: { ...defaults.style, ...(props.style as object | undefined) },
  };
}
function reuseDefinition(
  props: object,
  operation: LayoutOperation,
  definition: ParagraphDefinition,
): ParagraphDefinition {
  const cache = definitions.get(operation) ?? new WeakMap<object, ParagraphDefinition[]>();
  definitions.set(operation, cache);
  const previous = cache.get(props) ?? [];
  const found = previous.find((value) => sameDefinition(value, definition));
  if (found) return found;
  previous.push(definition);
  cache.set(props, previous);
  return definition;
}
function sameDefinition(left: ParagraphDefinition, right: ParagraphDefinition): boolean {
  if (
    left.runs.length !== right.runs.length ||
    left.lineHeight !== right.lineHeight ||
    left.align !== right.align ||
    left.whiteSpace !== right.whiteSpace ||
    left.breakLongWords !== right.breakLongWords ||
    !sameStyle(left.defaultStyle, right.defaultStyle)
  )
    return false;
  return left.runs.every((run, index) => {
    const other = right.runs[index];
    return other?.text === run.text && sameStyle(run.style as TextStyle, other.style as TextStyle);
  });
}
function sameStyle(left: TextStyle, right: TextStyle): boolean {
  return (
    left.font === right.font &&
    Object.is(left.fontSize, right.fontSize) &&
    Array.isArray(left.color) &&
    Array.isArray(right.color) &&
    left.color.length === 3 &&
    right.color.length === 3 &&
    left.color.every((component, index) => component === right.color[index])
  );
}
function flattenInline(
  nodes: readonly NormalizedContent[],
  base: TextStyle,
  runs: TextRun[],
  sources: string[],
  styleSources: StyleSources[],
  visuals: Map<number, { descriptor: object; style: TextStyle; path: string }>,
  path: string,
  operation: LayoutOperation,
  strut: LineHeight,
  lineHeights: LineHeight[],
  backgrounds: Map<number, RGB>,
): void {
  const tasks: (() => void)[] = [];
  const schedule: InlineSchedule = (children, style, origins, height, background) => {
    for (let i = children.length - 1; i >= 0; i--) {
      const node = children[i];
      if (node) tasks.push(() => visit(node, style, origins, height, background));
    }
  };
  const visit: InlineVisit = (node, style, origins, height, background): void => {
    if (typeof node.value === "string") {
      sources.push(node.path);
      styleSources.push(origins);
      if (background) backgrounds.set(runs.length, background);
      runs.push({ text: node.value, style });
      lineHeights.push(height);
      return;
    }
    if (node.value.identity === spanIdentity) {
      scheduleSpan(node, style, origins, height, background, operation, schedule);
      return;
    }
    if (node.value.identity !== visualIdentity)
      fail("VDOM_HIERARCHY", node.path, "Paragraph and Span only accept inline content");
    sources.push(node.path);
    styleSources.push(origins);
    visuals.set(runs.length, { descriptor: node.value.props.descriptor as object, style, path: node.path });
    if (background) backgrounds.set(runs.length, background);
    runs.push({ text: "", style });
    lineHeights.push(height);
  };
  schedule(nodes, base, initialOrigins(path), strut);
  while (tasks.length) tasks.pop()?.();
}
function scheduleSpan(
  node: NormalizedContent,
  style: TextStyle,
  origins: StyleSources,
  height: LineHeight,
  background: RGB | undefined,
  operation: LayoutOperation,
  schedule: InlineSchedule,
): void {
  if (typeof node.value === "string") return;
  const override = spanStyle(node.value.props, node.path);
  schedule(
    node.children,
    textStyle(style, override, `${node.path}/style`, operation),
    styleOrigins(origins, override, `${node.path}/style`),
    (override.lineHeight ?? height) as LineHeight,
    "backgroundColor" in override
      ? backgroundColor(override.backgroundColor, `${node.path}/style/backgroundColor`)
      : background,
  );
}
function spanStyle(props: Readonly<Record<string, unknown>>, path: string): Readonly<Record<string, unknown>> {
  record(props, ["children", "style"], path);
  for (const key of Object.keys(props))
    if (props[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined fields");
  return authorStyle(props.style, `${path}/style`);
}
type InlineVisit = (
  node: NormalizedContent,
  style: TextStyle,
  origins: StyleSources,
  height: LineHeight,
  background?: RGB,
) => void;
type InlineSchedule = (
  children: readonly NormalizedContent[],
  style: TextStyle,
  origins: StyleSources,
  height: LineHeight,
  background?: RGB,
) => void;
