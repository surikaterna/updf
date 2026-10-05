import type { DocumentDefinition, NodeDefinition, PageDefinition } from "@updf/core";
import {
  checkLimit,
  fail,
  type LayoutOperation,
  type NormalizedContent,
  type SemanticRecipe,
  snapshotData,
} from "@updf/core/internal";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import type { LowerOptions, VDOMChild } from "@updf/core/vdom";
import { compile } from "./block-compiler.js";
import { OutputBudget } from "./budget.js";
import { checkRole, convertBlocks, normalizeBlocks } from "./content-normalize.js";
import { finalizeDecorations } from "./deferred-decoration.js";
import {
  bodyIdentity,
  documentIdentity,
  flowIdentity,
  footerIdentity,
  headerIdentity,
  pageIdentity,
  sectionRecipe,
} from "./document-data.js";
import { nativeData } from "./document-native.js";
import { documentProps as validateDataObject } from "./document-props.js";
import type { DocumentContentData, DocumentProps, FlowProps, PageProps } from "./document-types.js";
import type { Extensions } from "./extension-types.js";
import { validateExtensions } from "./extensions.js";
import { type PageInfo, pageBinding } from "./page-context.js";
import { orientedSize } from "./page-size.js";
import { type PaginationSession, paginate } from "./paginator.js";
import { closeParagraphFragments } from "./paragraph-fragments.js";
import { validateRegion } from "./region-overflow.js";
import { renderRegion } from "./region-render.js";
import { columnIdentity } from "./row-data.js";
import { type TemplateGeometry, template } from "./template.js";
import type { FlowBlock, FlowPlacement } from "./types.js";

interface PlannedPage {
  readonly section: number;
  readonly page: PageDefinition;
  readonly fixed?: NormalizedContent;
  readonly header?: NormalizedContent;
  readonly footer?: NormalizedContent;
  readonly geometry?: TemplateGeometry;
  readonly flow?: NonNullable<PageInfo["flow"]>;
  readonly extensions?: Extensions;
}
/** Deeply frozen fixed core document and zero-based flow placement reports; not PDF bytes. */
export interface DocumentLayoutResult {
  readonly document: DocumentDefinition;
  readonly pageCount: number;
  readonly placements: readonly FlowPlacement[];
}
interface Session extends PaginationSession {
  readonly operation: LayoutOperation;
  readonly planned: PlannedPage[];
  readonly placements: FlowPlacement[];
  readonly lifetime: { active: boolean };
}
/**
 * Paginate exactly one layout Document containing ordered Page/Flow sections.
 * Each section starts a new page; even an empty Flow has one page. Options are
 * core LowerOptions (resources, policy, local registry/metadata); pass matching
 * resources/policy to render. The synchronous operation closes on return or throw.
 * Throws core errors for invalid hierarchy, geometry, bounds or exhausted limits;
 * atomic content that cannot fit a fresh body fails LAYOUT_OVERSIZED.
 */
export function layout(content: DocumentContentData | VDOMChild, options?: LowerOptions): DocumentLayoutResult;
export function layout(content: unknown, options: LowerOptions = {}): DocumentLayoutResult {
  const operation = createDrawingLayoutOperation(options);
  try {
    const roots = operation.normalizeContent(content, sectionRecipe, "/document");
    const root = roots[0];
    if (roots.length !== 1 || !root || typeof root.value === "string" || root.value.identity !== documentIdentity)
      fail("VDOM_HIERARCHY", "/document", "Expected exactly one layout Document");
    const props = root.value.props as DocumentProps;
    return scoped(root, operation, () => layoutDocument({ props }, operation));
  } finally {
    operation.close();
  }
}
export function layoutDocument(
  recipe: { readonly props: DocumentProps },
  operation: LayoutOperation,
): DocumentLayoutResult {
  validateDataObject(recipe.props, ["children"], "/document/props");
  let pages = 0,
    flowIndex = 0;
  const session: Session = {
    operation,
    budget: new OutputBudget(operation.policy),
    planned: [],
    placements: [],
    lifetime: { active: true },
    reservePage(path) {
      checkLimit(++pages, operation.policy.pages, path, "Document pages");
    },
  };
  try {
    const sections = operation.normalizeContent(
      recipe.props.children,
      sectionRecipe,
      "/document/children",
      sectionGuard,
    );
    sections.forEach((node, index) => {
      scoped(node, operation, () => {
        if (typeof node.value === "string") fail("VDOM_HIERARCHY", node.path, "Expected section");
        if (node.value.identity === pageIdentity) planFixed(node, index + 1, session);
        else planFlow(node, index + 1, flowIndex++, session);
      });
    });
    if (!pages) fail("VDOM_HIERARCHY", "/document/children", "Document requires at least one page");
    const document: DocumentDefinition = {
      version: 1,
      pages: session.planned.map((plan, index) => finalize(plan, index, pages, session)),
    };
    operation.validateDocument(document);
    return snapshotData({ document, pageCount: pages, placements: session.placements }, "/result");
  } finally {
    session.lifetime.active = false;
    closeParagraphFragments(session.lifetime);
  }
}
function sectionGuard(value: unknown, path: string): void {
  if (
    !value ||
    typeof value !== "object" ||
    !("identity" in value) ||
    (value.identity !== pageIdentity && value.identity !== flowIdentity)
  )
    fail("VDOM_HIERARCHY", path, "Document children must be Page or Flow sections");
}
export function scoped<T>(node: NormalizedContent, operation: LayoutOperation, invoke: () => T): T {
  if (!node.scope) fail("MEASUREMENT_CONTEXT", node.path, "Missing owned normalization scope");
  return operation.scoped(node.scope, invoke);
}
function planFixed(node: NormalizedContent, section: number, session: Session): void {
  if (typeof node.value === "string") fail("TYPE", node.path, "Expected Page");
  validateDataObject(node.value.props, ["size", "orientation", "children"], node.path);
  const props = node.value.props as unknown as PageProps;
  const size = orientedSize(props.size, props.orientation);
  session.reservePage(node.path);
  session.planned.push({ section, page: { ...size, children: [] }, fixed: node });
}
interface FlowParts {
  body: FlowBlock[];
  nodes: NormalizedContent[];
  header?: NormalizedContent;
  footer?: NormalizedContent;
  bodySlot: boolean;
}
function flowParts(node: NormalizedContent, session: Session): FlowParts {
  if (typeof node.value === "string") fail("TYPE", node.path, "Expected Flow");
  const children = session.operation.normalizeContent(
    node.value.props.children,
    sectionRecipe,
    `${node.path}/children`,
    flowChildGuard,
    undefined,
    undefined,
    columnIdentity,
  );
  const result: FlowParts = { body: [], nodes: [], bodySlot: false };
  for (const child of children) appendFlowChild(child, result, session);
  if (!result.bodySlot) result.body = convertBlocks(result.nodes, session.operation);
  return result;
}
function flowChildGuard(value: string | SemanticRecipe, path: string, parent: object | undefined): void {
  if (
    parent === undefined &&
    typeof value !== "string" &&
    [headerIdentity, bodyIdentity, footerIdentity].includes(value.identity)
  )
    return;
  checkRole(value, path, parent);
}
function appendFlowChild(child: NormalizedContent, result: FlowParts, session: Session): void {
  if (typeof child.value === "string") fail("VDOM_HIERARCHY", child.path, "Flow text requires Paragraph");
  const identity = child.value.identity;
  if (identity === headerIdentity || identity === footerIdentity) {
    const key = identity === headerIdentity ? "header" : "footer";
    if (result[key]) fail("VDOM_HIERARCHY", child.path, `Duplicate Flow.${key}`);
    validateDataObject(child.value.props, ["height", "children"], child.path);
    result[key] = child;
    return;
  }
  if (identity === bodyIdentity) {
    if (result.bodySlot || result.nodes.length)
      fail("VDOM_HIERARCHY", child.path, "Use one Flow.Body or direct body children");
    result.bodySlot = true;
    validateDataObject(child.value.props, ["children"], child.path);
    const input = child.value.props.children;
    for (const block of scoped(child, session.operation, () =>
      normalizeBlocks(input, session.operation, `${child.path}/children`),
    ))
      result.body.push(block);
    return;
  }
  if (result.bodySlot) fail("VDOM_HIERARCHY", child.path, "Cannot mix Flow.Body and direct body children");
  result.nodes.push(child);
}
function planFlow(node: NormalizedContent, section: number, index: number, session: Session): void {
  if (typeof node.value === "string") fail("TYPE", node.path, "Expected Flow");
  validateDataObject(node.value.props, ["pageSize", "orientation", "margins", "children", "extensions"], node.path);
  const props = node.value.props as unknown as FlowProps;
  validateExtensions(props.extensions);
  const parts = flowParts(node, session);
  const region = (slot: NormalizedContent | undefined) =>
    slot && typeof slot.value !== "string" ? { height: slot.value.props.height, children: [] } : undefined;
  const header = region(parts.header),
    footer = region(parts.footer);
  const geometry = template(
    {
      ...orientedSize(props.pageSize, props.orientation),
      margins: props.margins,
      ...(header ? { header } : {}),
      ...(footer ? { footer } : {}),
    },
    session.operation,
  );
  const sourceRoot = `${node.path}/body`;
  const prepared = compile(parts.body, geometry.body.width, sourceRoot, {
    operation: session.operation,
    lifetime: session.lifetime,
    freshHeight: geometry.body.height,
    ...(props.extensions ? { extensions: props.extensions } : {}),
  });
  const offset = session.planned.length;
  const result = paginate(geometry, prepared, session.operation.policy, { ...session, sourceRoot });
  for (const placement of result.placements)
    session.placements.push({ ...placement, pageIndex: placement.pageIndex + offset });
  result.document.pages.forEach((page, pageIndex) => {
    session.planned.push({
      section,
      page,
      geometry,
      flow: { index, pageNumber: pageIndex + 1, pageCount: result.pageCount },
      ...(parts.header ? { header: parts.header } : {}),
      ...(parts.footer ? { footer: parts.footer } : {}),
      ...(props.extensions ? { extensions: props.extensions } : {}),
    });
  });
}
function finalize(plan: PlannedPage, index: number, count: number, session: Session): PageDefinition {
  const info: PageInfo = {
    docPageNumber: index + 1,
    docPageCount: count,
    sectionNumber: plan.section,
    flow: plan.flow ?? null,
  };
  const operation = session.operation;
  const children: NodeDefinition[] = [];
  for (const node of finalizeRegion(plan.header, plan, info, session)) children.push(node);
  for (const node of finalizeDecorations(plan.page.children, info, operation, session.budget)) children.push(node);
  for (const node of finalizeFixed(plan, info, session)) children.push(node);
  for (const node of finalizeRegion(plan.footer, plan, info, session)) children.push(node);
  return { ...plan.page, children };
}
function finalizeFixed(plan: PlannedPage, info: PageInfo, session: Session): readonly NodeDefinition[] {
  const operation = session.operation;
  if (plan.fixed) {
    const fixed = plan.fixed;
    const nodes = scoped(fixed, operation, () =>
      operation.finalContext(pageBinding, info, () => {
        if (typeof fixed.value === "string") fail("TYPE", fixed.path, "Expected fixed Page");
        if (nativeData(fixed.value.props.children)) return fixed.value.props.children;
        return operation.lowerDrawing(
          fixed.value.props.children,
          plan.page.width,
          plan.page.height,
          `${fixed.path}/children`,
        );
      }),
    );
    session.budget.charge(nodes, fixed.path);
    operation.validateFixed(nodes, plan.page.width, plan.page.height, fixed.path);
    return nodes;
  }
  return [];
}
function finalizeRegion(
  slot: NormalizedContent | undefined,
  plan: PlannedPage,
  info: PageInfo,
  session: Session,
): readonly NodeDefinition[] {
  if (!slot || !plan.geometry || typeof slot.value === "string") return [];
  const operation = session.operation;
  const height = slot.value.props.height as number;
  const nodes = scoped(slot, operation, () =>
    operation.finalContext(pageBinding, info, () =>
      renderRegion(
        typeof slot.value === "string" ? undefined : slot.value.props.children,
        plan.geometry?.body.width ?? 0,
        height,
        `${slot.path}/children`,
        operation,
        info,
        session.budget,
        plan.extensions,
        session.lifetime,
      ),
    ),
  );
  validateRegion(nodes, plan.geometry.body.width, height, slot.path, operation);
  if (!nodes.length) return [];
  const y = slot === plan.header ? plan.geometry.template.margins.top : plan.geometry.footerY;
  const group = {
    type: "paintGroup" as const,
    transform: [1, 0, 0, 1, plan.geometry.body.x, y] as const,
    children: nodes,
  };
  session.budget.charge([group], slot.path);
  return [group];
}
