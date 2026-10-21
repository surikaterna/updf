import { render } from "@updf/core";
import { createExtensions, defineBlockAdapter, document, extension, flow, layout } from "@updf/layout";

export function blockUnitProof() {
  const queries: unknown[] = [];
  const adapter = defineBlockAdapter({
    name: "browser.units",
    validate: (props) => props,
    measure(_props, context) {
      return {
        fragmentation: "splittable",
        extent: 3,
        naturalSize: { width: context.width, height: 999 },
        next(query) {
          if (!Object.isFrozen(query) || Object.keys(query).sort().join() !== "extent,offset,width")
            throw new Error("Invalid unit request");
          queries.push(query);
          return {
            end: query.offset + 1,
            height: 1,
            nodes: [{ type: "rect", x: 0, y: 0, width: 1, height: 1, paint: { stroke: null, fill: [1, 0, 0] } }],
          };
        },
      };
    },
  });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 80, height: 2 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions: createExtensions([adapter]),
        children: extension(adapter, {}),
      }),
    }),
  );
  return {
    queries,
    placements: result.placements,
    pages: result.pageCount,
    bytes: Array.from(render(result.document)),
  };
}
