import type { NodeDefinition, PageDefinition } from "@updf/core";
import { checkLimit, exceeds, fail, MetricSum, type Policy, sum } from "@updf/core/internal";
import { alignedRequest } from "./auto-margin.js";
import { materializedStart, tryMaterializedStart } from "./axis.js";
import { OutputBudget } from "./budget.js";
import { snapshot } from "./data.js";
import { FragmentState } from "./fragment-state.js";
import { prepareFragmentPaint } from "./fragment-paint-preparation.js";
import type { PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import type { TemplateGeometry } from "./template.js";
import type { FlowPlacement, FlowResult, PageRegion } from "./types.js";
import { provenanceAt, provenanceRange } from "./source-provenance.js";

interface MutablePage {
  width: number;
  height: number;
  children: NodeDefinition[];
}
export interface PaginationSession {
  readonly budget: OutputBudget;
  readonly reservePage: (path: string) => void;
  readonly sourceRoot?: string;
}
export class Paginator {
  readonly pages: MutablePage[] = [];
  readonly placements: FlowPlacement[] = [];
  private position = new MetricSum();
  private bottom = 0;
  private get cursor(): number {
    return this.position.value;
  }
  private readonly budget: OutputBudget;
  constructor(
    private readonly geometry: TemplateGeometry,
    private readonly policy: Policy,
    private readonly session?: PaginationSession,
  ) {
    this.budget = session?.budget ?? new OutputBudget(policy);
    this.advance("");
  }

  private region(region: PageRegion | undefined, y: number): NodeDefinition[] {
    if (!region || !region.children.length) return [];
    return [
      { type: "paintGroup", transform: [1, 0, 0, 1, this.geometry.body.x, y], children: snapshot(region.children) },
    ];
  }
  private finish(): void {
    const page = this.pages.at(-1);
    if (page) page.children.push(...this.region(this.geometry.template.footer, this.geometry.footerY));
  }
  advance(path: string): void {
    this.session?.reservePage(path);
    checkLimit(this.pages.length + 1, this.policy.pages, path, "Pages");
    const { template } = this.geometry;
    this.budget.reserveWork(sum(this.geometry.regionWork), path);
    // Reserve both repeated regions before copying either of them.
    for (const region of [template.header, template.footer]) {
      if (!region?.children.length) continue;
      this.budget.charge([{ type: "paintGroup", children: region.children }], path);
    }
    this.finish();
    this.pages.push({
      width: template.width,
      height: template.height,
      children: this.region(template.header, template.margins.top),
    });
    this.position = new MetricSum();
    this.bottom = this.geometry.vertical.start;
  }
  get pageIndex(): number {
    return this.pages.length - 1;
  }
  private place(
    sourceIndex: number,
    height: number,
    acceptedY: number,
    lines?: { start: number; end: number },
    path = `/body/${sourceIndex}`,
    x = this.geometry.body.x,
    width = this.geometry.body.width,
    sourceRange?: { readonly start: number; readonly end: number },
    sourceKeys?: readonly (string | number | null)[],
  ): void {
    this.placements.push({
      sourceIndex,
      sourcePath: path,
      pageIndex: this.pages.length - 1,
      box: {
        x,
        y: acceptedY,
        width,
        height,
      },
      ...(lines ? { lines } : {}),
      ...(sourceRange ? { sourceRange } : {}),
      ...(sourceKeys ? { sourceKeys } : {}),
    });
    this.position.add(height);
  }
  consume(item: PreparedBlock, index: number, path = `/body/${index}`): void {
    if (item.control === "advance") {
      this.place(index, 0, materializedStart(this.geometry.vertical, this.cursor, 0, `/body/${index}`));
      this.advance(path);
      return;
    }
    let offset = 0;
    const state = new FragmentState();
    while (offset < item.extent) {
      const selection = this.selection(item, offset, state);
      const { fragment } = selection;
      if (!fragment) {
        if (this.cursor === 0)
          fail("LAYOUT_OVERSIZED", provenanceAt(item, offset, path), "Block cannot fit a fresh body");
        this.advance(path);
        continue;
      }
      this.validateSelection(item, fragment, offset, selection.margin, path);
      const admission = this.fragmentStart(fragment.height, selection.margin, path);
      if (admission === undefined) {
        this.advance(path);
        continue;
      }
      const { y, tentative } = admission;
      const prepared = prepareFragmentPaint(
        fragment,
        {
          x: item.x ?? this.geometry.body.x,
          y,
          page: { axis: this.geometry.vertical, origin: tentative.value, bottom: this.bottom },
        },
        this.budget,
        path,
      );
      this.budget.reserveWork(prepared.work, path);
      const nodes = resolvePaint(prepared.root);
      for (const node of nodes) this.pages.at(-1)?.children.push(node);
      this.position = tentative;
      this.bottom = Math.max(prepared.plannedBottom, y + fragment.height);
      this.recordFragment(item, index, fragment, offset, path, y);
      offset = fragment.nextOffset;
      state.adopt(selection.state);
      if (fragment.advance) this.advance(path);
    }
  }
  private validateSelection(
    item: PreparedBlock,
    fragment: PlacedFragment,
    offset: number,
    margin: number,
    path: string,
  ): void {
    if (
      !Number.isSafeInteger(fragment.nextOffset) ||
      fragment.nextOffset <= offset ||
      fragment.nextOffset > item.extent
    )
      fail("TYPE", path, "Fragment must make finite extent progress");
    if (
      !Number.isFinite(fragment.height) ||
      fragment.height < 0 ||
      exceeds(sum([this.cursor, margin, fragment.height]), this.geometry.body.height)
    )
      fail("GEOMETRY", path, "Fragment exceeds available body height");
  }
  private fragmentStart(height: number, margin: number, path: string): { y: number; tentative: MetricSum } | undefined {
    const occupied = this.cursor > 0;
    const tentative = this.position.fork();
    if (margin !== 0) tentative.add(margin);
    const candidate = tryMaterializedStart(this.geometry.vertical, tentative.value, height);
    if (candidate !== undefined && candidate >= this.bottom) {
      return { y: candidate, tentative };
    }
    if (occupied) return undefined;
    const y = materializedStart(this.geometry.vertical, tentative.value, height, path);
    if (y < this.bottom)
      fail("GEOMETRY", path, "Materialized body blocks overlap under native coordinate association.");
    return { y, tentative };
  }
  private selection(item: PreparedBlock, offset: number, previous: FragmentState) {
    const state = previous.fork();
    const aligned = alignedRequest(item, {
      offset,
      availableHeight: this.geometry.body.height - this.cursor,
      freshHeight: this.geometry.body.height,
      atFreshRegion: this.cursor === 0,
      width: this.geometry.body.width,
      usedHeight: this.cursor,
      budget: this.budget.fork(),
      state,
      definiteAlignment: true,
      alignmentHeight: this.geometry.vertical.nominalExtent,
    });
    const fragment = aligned ? resolveFragment(item, aligned.request) : undefined;
    return { fragment, state, margin: aligned?.margin ?? 0 };
  }
  private recordFragment(
    item: PreparedBlock,
    index: number,
    fragment: PlacedFragment,
    offset: number,
    path: string,
    acceptedY: number,
  ): void {
    const provenance = provenanceRange(item, offset, fragment.nextOffset);
    this.place(
      provenance.index ?? index,
      fragment.height,
      acceptedY,
      fragment.lines,
      provenance.path ?? path,
      item.x,
      item.naturalSize.width,
      provenance.range,
      provenance.keys,
    );
  }
  result(consumed: number): FlowResult {
    this.finish();
    const pages: readonly PageDefinition[] = this.pages;
    const result = {
      document: { version: 1 as const, pages },
      pageCount: pages.length,
      consumed,
      placements: this.placements,
    };
    return this.session ? result : snapshot(result);
  }
}
export function paginate(
  geometry: TemplateGeometry,
  blocks: readonly PreparedBlock[],
  policy: Policy,
  session?: PaginationSession,
): FlowResult {
  const paginator = new Paginator(geometry, policy, session);
  blocks.forEach((block, index) => {
    paginator.consume(block, index, session?.sourceRoot ? `${session.sourceRoot}/${index}` : `/body/${index}`);
  });
  return paginator.result(blocks.length);
}
