import {
  createFragmentOperation,
  type FragmentPlacement,
  type FragmentProvider,
  type FragmentSource,
} from "@updf/layout-boxes/fragmentation";
import { PlaygroundError } from "./error.js";
import type { Placement, Region, Snapshot, Unit } from "./snapshot.js";

export const LIMITS = Object.freeze({
  attempts: 21,
  sourceReads: 40,
  sourceVisits: 200,
  measurements: 1000,
  unitsExamined: 1000,
  outputFragments: 2000,
  providerUnits: 1000,
});

const provider: FragmentProvider<readonly Unit[], Unit> = Object.freeze({
  next(
    descriptor: readonly Unit[],
    request: { readonly offset: number },
    work: { readonly consume: (units: number) => void },
  ) {
    work.consume(1);
    const item = descriptor[request.offset];
    if (!item) throw new Error("Missing prepared unit");
    return { end: request.offset + 1, height: item.height, content: item };
  },
});

export function paginate(
  units: readonly Unit[],
  width: number,
  height: number,
  cap: number,
  source: unknown,
  pdf: boolean,
): Snapshot {
  const groups = groupSources(units, width);
  const operation = createFragmentOperation(provider, LIMITS);
  const regions: Region[] = [];
  let status: Snapshot["status"] = "cap";
  try {
    let cursor = operation.start({
      count: groups.length,
      at: (index) => groups[index] as FragmentSource<readonly Unit[]>,
    });
    for (let index = 0; index < cap; index++) {
      const id = `region-${index + 1}`;
      const result = operation.fragment(cursor, { id, width, height, usedHeight: 0 });
      cursor = result.cursor;
      const placements = result.placements.flatMap(expandPlacement);
      regions.push(Object.freeze({ id, width, height, placements: Object.freeze(placements) }));
      if (result.status !== "region-full") {
        status = result.status;
        break;
      }
    }
    const next = groups.flatMap((group) => group.descriptor)[
      regions.reduce((count, region) => count + region.placements.length, 0)
    ];
    const blocked =
      status === "blocked" && next
        ? Object.freeze({ id: next.id, height: next.height, width, regionHeight: height })
        : undefined;
    return Object.freeze({
      regions: Object.freeze(regions),
      status,
      counts: operation.counts(),
      ...(blocked ? { blocked } : {}),
      source,
      pdf,
    });
  } finally {
    operation.close();
  }
}

function expandPlacement(placement: FragmentPlacement<Unit>): readonly Placement[] {
  let top = placement.top;
  return placement.units.map((accepted) => {
    const result = Object.freeze({
      unit: accepted.content,
      x: placement.left,
      y: top,
      width: placement.width,
      start: accepted.start,
      end: accepted.end,
    });
    top += accepted.height;
    return result;
  });
}

function groupSources(units: readonly Unit[], width: number): readonly FragmentSource<readonly Unit[]>[] {
  const ids = new Set<string>();
  for (const item of units) {
    if (ids.has(item.id)) throw new PlaygroundError("VALUE", item.path, "Unit identity must be unique");
    ids.add(item.id);
  }
  const groups: FragmentSource<readonly Unit[]>[] = [];
  let paragraph = 0;
  for (let index = 0; index < units.length; ) {
    const item = units[index]!;
    const start = index++;
    const lines = item.line !== undefined;
    if (lines) while (index < units.length && units[index]!.line !== undefined) index++;
    let id = item.id;
    if (lines) {
      do {
        id = ++paragraph === 1 ? "paragraph" : `paragraph-${paragraph}`;
      } while (ids.has(id));
      ids.add(id);
    }
    groups.push(
      Object.freeze({
        id,
        path: lines ? `/${id}` : item.path,
        descriptor: Object.freeze(units.slice(start, index)),
        extent: index - start,
        mode: lines ? "splittable" : "atomic",
        width: { mode: "fixed" as const, value: width },
      }),
    );
  }
  return Object.freeze(groups);
}
