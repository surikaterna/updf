import type { NodeDefinition, PageDefinition } from "@updf/core";
import { checkLimit, exceeds, fail, MetricSum, type Policy, sum } from "@updf/core/internal";
import { materializedStart } from "./axis.js";
import { OutputBudget } from "./budget.js";
import { snapshot } from "./data.js";
import { FragmentState } from "./fragment-state.js";
import type { PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import type { TemplateGeometry } from "./template.js";
import type { FlowPlacement, FlowResult, PageRegion } from "./types.js";

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
  private bodyStart(offset: number, height: number, path: string): number {
    const y = materializedStart(this.geometry.vertical, offset, height, path);
    if (y < this.bottom)
      fail("GEOMETRY", path, "Materialized body blocks overlap under native coordinate association.");
    this.bottom = y + height;
    return y;
  }
  fit(height: number, path: string): void {
    if (exceeds(height, this.geometry.body.height)) fail("LAYOUT_OVERSIZED", path, "Block cannot fit a fresh body");
    if (exceeds(sum([this.cursor, height]), this.geometry.body.height)) this.advance(path);
  }
  fits(...heights: readonly number[]): boolean {
    return !exceeds(sum([this.cursor, ...heights]), this.geometry.body.height);
  }
  get pageIndex(): number {
    return this.pages.length - 1;
  }
  atomic(
    index: number,
    path: string,
    x: number,
    width: number,
    height: number,
    output: { nodes: number; text: number; commands: number; work: number },
    paint: (y: number) => readonly NodeDefinition[],
  ): FlowPlacement {
    this.fit(height, path);
    this.consume(
      {
        fragmentation: "atomic",
        naturalSize: { width, height },
        extent: 1,
        x,
        fragment: (request) => {
          request.budget?.generated(output.nodes + 1, output.text, output.commands, output.work, path);
          return {
            nextOffset: 1,
            height,
            paint: (context) => {
              context.start(0, height);
              context.budget.generated(output.nodes + 1, output.text, output.commands, output.work, path);
              return [
                { type: "paintGroup", transform: [1, 0, 0, 1, x, context.y], children: snapshot(paint(context.y)) },
              ];
            },
          };
        },
      },
      index,
      path,
    );
    const placement = this.placements.at(-1);
    if (!placement) fail("TYPE", path, "Atomic producer did not place its fragment");
    return placement;
  }
  private place(
    sourceIndex: number,
    height: number,
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
        y: materializedStart(this.geometry.vertical, this.cursor, height, path),
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
      this.place(index, 0);
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
          fail("LAYOUT_OVERSIZED", `${path}${item.sourcePaths?.[offset] ?? ""}`, "Block cannot fit a fresh body");
        this.advance(path);
        continue;
      }
      if (
        !Number.isSafeInteger(fragment.nextOffset) ||
        fragment.nextOffset <= offset ||
        fragment.nextOffset > item.extent
      )
        fail("TYPE", path, "Fragment must make finite extent progress");
      if (!Number.isFinite(fragment.height) || fragment.height < 0 || !this.fits(fragment.height))
        fail("GEOMETRY", path, "Fragment exceeds available body height");
      const origin = this.cursor;
      const y = materializedStart(this.geometry.vertical, origin, fragment.height, path);
      if (y < this.bottom)
        fail("GEOMETRY", path, "Materialized body blocks overlap under native coordinate association.");
      const nodes = resolvePaint(fragment, {
        x: item.x ?? this.geometry.body.x,
        y,
        budget: this.budget,
        start: (relative, height) => this.bodyStart(sum([origin, relative]), height, path),
      });
      for (const node of nodes) this.pages.at(-1)?.children.push(node);
      this.bottom = Math.max(this.bottom, y + fragment.height);
      this.recordFragment(item, index, fragment, offset, path);
      offset = fragment.nextOffset;
      state.adopt(selection.state);
      if (fragment.advance) this.advance(path);
    }
  }
  private selection(item: PreparedBlock, offset: number, previous: FragmentState) {
    const state = previous.fork();
    const fragment = resolveFragment(item, {
      offset,
      availableHeight: this.geometry.body.height - this.cursor,
      freshHeight: this.geometry.body.height,
      atFreshRegion: this.cursor === 0,
      width: this.geometry.body.width,
      usedHeight: this.cursor,
      budget: this.budget.fork(),
      state,
    });
    return { fragment, state };
  }
  private recordFragment(
    item: PreparedBlock,
    index: number,
    fragment: PlacedFragment,
    offset: number,
    path: string,
  ): void {
    this.place(
      index,
      fragment.height,
      fragment.lines,
      path,
      item.x,
      item.naturalSize.width,
      { start: item.sourceExtent === 0 ? 0 : offset, end: item.sourceExtent === 0 ? 0 : fragment.nextOffset },
      item.sourceKeys?.slice(offset, fragment.nextOffset),
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
