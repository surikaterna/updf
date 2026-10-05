import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createContext, h, useContext } from "@updf/core/vdom";
import {
  Block,
  type BlockContent,
  blockComponent,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  flow,
  PageContext,
  Paragraph,
  resolveWidths,
  type WidthTrack,
} from "@updf/layout";
import { Table, type TableInput, table, tableExtension } from "@updf/tables";
import { layout, render } from "../../../tests/fixtures/text-options.js";

const extensions = createExtensions([tableExtension]);
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
function run(input: TableInput, width = 200) {
  return layout(
    document({
      children: flow({
        pageSize: { width: width + 10, height: 100 },
        margins: { top: 5, right: 5, bottom: 5, left: 5 },
        extensions,
        children: table(input),
      }),
    }),
  );
}
function input(tracks: readonly WidthTrack[], count = 12): TableInput {
  const row = { cells: tracks.map(() => ({ children: "X" })) };
  return {
    columns: tracks.map((width) => ({ width })),
    style: { padding: 2, fontSize: 6, lineHeight: { unit: "pt", value: 8 }, backgroundColor: [0.9, 0.9, 1] },
    grid: { width: 1, color: [0, 0, 0] },
    head: { repeat: true, rows: [row] },
    body: Array.from({ length: count }, () => row),
    foot: { repeat: true, rows: [row] },
  };
}
function diagnostic(callback: () => unknown, path: RegExp, code = "GEOMETRY") {
  assert.throws(
    callback,
    (cause: unknown) =>
      cause instanceof DocumentError &&
      cause.diagnostics[0]?.code === code &&
      path.test(cause.diagnostics[0]?.path ?? ""),
  );
}
test("mixed weights, both clamps and fractional rounding reuse scalar geometry on every page and section", () => {
  for (const tracks of [
    [40, { weight: 1 }, { weight: 3 }],
    [{ weight: 1, min: 80 }, { weight: 1, max: 20 }, { weight: 2 }],
    [{ weight: 1 }, { weight: 1 }, { weight: 1 }],
    [40, { weight: 1, max: 30 }, { weight: 2, max: 50 }],
  ] as const) {
    const resolved = resolveWidths({ availableWidth: 200, tracks });
    const weighted = run(input(tracks)),
      explicit = run(input(resolved.widths));
    assert.ok(weighted.pageCount > 1);
    assert.deepEqual(weighted.placements, explicit.placements);
    assert.deepEqual(render(weighted.document), render(explicit.document));
    const extent = resolved.widths.reduce((sum, width) => sum + width, 0);
    assert.ok(weighted.placements.every((placement) => placement.box.width === extent));
  }
});
test("fixed plus minima infeasibility is exact and fails before any cell measurement", () => {
  for (const tracks of [
    [101, { weight: 1, min: 100 }],
    [200, { weight: 1 }],
    [100, { weight: 1, min: 100 + 2 ** -46 }],
  ] as const)
    diagnostic(() => run(input(tracks)), /\/props\/columns$/u);
});
test("invalid track fields point to the exact column width part", () => {
  for (const [width, suffix, code] of [
    [{ weight: 0 }, "weight", "GEOMETRY"],
    [{ weight: 1, min: -1 }, "min", "GEOMETRY"],
    [{ weight: 1, max: 0 }, "max", "GEOMETRY"],
    [{ weight: 1, min: 2, max: 1 }, "max", "GEOMETRY"],
    [{ weight: 1, mystery: 2 }, "mystery", "KEY"],
    [{ weight: 1, "a/b~": 2 }, "a~1b~0", "KEY"],
    [{ weight: 1, min: undefined }, "min", "TYPE"],
  ] as const)
    diagnostic(
      () => table({ columns: [{ width }], body: [] } as unknown as TableInput),
      new RegExp(`/columns/0/width/${suffix}$`, "u"),
      code,
    );
});
test("infeasible JSX columns reject before expanding body callbacks", () => {
  let calls = 0;
  function Body() {
    calls++;
    return h(Table.Row, { children: [h(Table.Cell, { children: "X" }), h(Table.Cell, { children: "Y" })] });
  }
  const content = h(Table, {
    columns: [{ width: 150 }, { width: { weight: 1, min: 100 } }],
    children: h(Table.Body, { children: h(Body, {}) }),
  });
  diagnostic(
    () =>
      layout(
        document({ children: flow({ pageSize: { width: 200, height: 100 }, margins, extensions, children: content }) }),
      ),
    /\/props\/columns$/u,
  );
  assert.equal(calls, 0);
});
test("caller mutation cannot change tracks or column defaults retained by a descriptor", () => {
  const tracks = [{ width: { weight: 1, min: 20, max: 150 }, style: { padding: 2 } }, { width: { weight: 1 } }];
  const original = table({ columns: tracks, body: [{ cells: [{ children: "X" }, { children: "Y" }] }] });
  const root = document({
    children: flow({ pageSize: { width: 200, height: 100 }, margins, extensions, children: original }),
  });
  const before = render(layout(root).document);
  assert.equal(Object.isFrozen(tracks[0]?.width), false);
  const first = tracks[0];
  assert.ok(first?.style);
  first.width.weight = 99;
  first.style.padding = 30;
  tracks.reverse();
  assert.deepEqual(render(layout(root).document), before);
});
function widthProbe(seen: { tag: string; width: number }[]) {
  return defineBlockAdapter<{ tag: string }>({
    name: "width.probe",
    validate: (value) => value as { tag: string },
    measure(props, context) {
      seen.push({ tag: props.tag, width: context.width });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 8 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 8, nodes: [] }),
      };
    },
  });
}
test("deferred PageContext head/foot measure with the same widths, borders and padding as the body", () => {
  const seen: { tag: string; width: number }[] = [];
  const probe = widthProbe(seen);
  const Probe = blockComponent(probe);
  function Deferred({ tag }: { tag: string }) {
    const page = useContext(PageContext);
    return h(Probe, { tag: `${tag}-${page.docPageNumber}` });
  }
  const tracks = [40, { weight: 1 }, { weight: 3 }] as const;
  const row = (tag: string, deferred = false) =>
    h(Table.Row, {
      children: tracks.map((_track, i) =>
        h(Table.Cell, {
          children: deferred ? h(Deferred, { tag: `${tag}-${i}` }) : extension(probe, { tag: `${tag}-${i}` }),
        }),
      ),
    });
  const content = h(Table, {
    columns: tracks.map((width) => ({ width, style: { paddingLeft: 3, paddingRight: 5 } })),
    grid: { width: 1, color: [0, 0, 0] },
    children: [
      h(Table.Head, { repeat: true, height: 20, children: row("head", true) }),
      h(Table.Body, { children: Array.from({ length: 10 }, () => row("body")) }),
      h(Table.Foot, { repeat: true, height: 20, children: row("foot", true) }),
    ],
  });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 210, height: 100 },
        margins: { top: 5, right: 5, bottom: 5, left: 5 },
        extensions: createExtensions([tableExtension, probe]),
        children: content,
      }),
    }),
  );
  assert.ok(result.pageCount > 1);
  for (const section of ["head", "body", "foot"])
    for (const [index, width] of [30, 30, 110].entries()) {
      const samples = seen.filter((sample) => sample.tag.startsWith(`${section}-${index}`));
      assert.equal(samples.length, section === "body" ? 10 : result.pageCount);
      assert.ok(samples.every((sample) => Math.abs(sample.width - width) <= 32 * Number.EPSILON * width));
      assert.ok(samples.every((sample) => sample.width === samples[0]?.width));
    }
});
test("repeated JSX occurrences resolve their local width and current provider independently", () => {
  const Theme = createContext("default");
  const shared: BlockContent = h(Table, {
    columns: [{ width: { weight: 1 } }],
    children: h(Table.Body, {
      children: h(Table.Row, { children: h(Table.Cell, { children: h(Themed, {}) }) }),
    }),
  });
  function Themed() {
    return h(Paragraph, { children: useContext(Theme) });
  }
  const children = ["first", "second"].map((value, i) =>
    h(Theme.Provider, { value, children: h(Block, { style: { paddingLeft: i * 20 }, children: shared }) }),
  );
  const result = layout(
    document({ children: flow({ pageSize: { width: 200, height: 100 }, margins, extensions, children }) }),
  );
  const bytes = new TextDecoder().decode(render(result.document));
  assert.match(bytes, /first/u);
  assert.match(bytes, /second/u);
});
test("large/tiny allocation and ULP constraints retain scalar geometry or fail numerical certification", () => {
  for (const width of [2 ** 500, 2 ** -500]) {
    const options = { columns: [{ width: { weight: 1 } }, { width: { weight: 1 } }], body: [] } as const;
    const result = layout(
      document({ children: flow({ pageSize: { width, height: 100 }, margins, extensions, children: table(options) }) }),
    );
    assert.equal(result.placements[0]?.box.width, width);
  }
  diagnostic(
    () => run({ columns: [{ width: 200 }, { width: { weight: 1, min: Number.MIN_VALUE } }], body: [] }),
    /\/props\/columns$/u,
  );
});
test("scalar baseline is deterministic and stays narrow rather than filling available width", () => {
  const result = run(input([120, 60], 1));
  assert.equal(result.placements[0]?.box.width, 180);
  const bytes = render(result.document);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "5e04a982dc89771b99b942a61925d7256a03049a086bfead7e0b83ee43b7f7e6",
  );
});
test("actual aliased column count charges cumulative source work before resolving empty tables", () => {
  const column = { width: { weight: 1 } };
  const descriptor = table({ columns: Array.from({ length: 100 }, () => column), body: [] });
  const root = document({
    children: flow({ pageSize: { width: 200, height: 100 }, margins, extensions, children: [descriptor, descriptor] }),
  });
  diagnostic(() => layout(root, { profile: "service", limits: { nodes: 180 } }), /\/props\/columns/u, "LIMIT");
  assert.equal(layout(root, { profile: "service", limits: { nodes: 1000 } }).pageCount, 1);
});
test("materialized weighted cell geometry preserves scalar output at very large and tiny scales", () => {
  for (const scale of [2 ** 500, 2 ** -500]) {
    const renderTracks = (tracks: readonly WidthTrack[]) => {
      const definition = {
        columns: tracks.map((width) => ({ width })),
        style: { padding: 0, fontSize: 6 * scale, lineHeight: { unit: "pt" as const, value: 8 * scale } },
        body: [{ cells: [{ children: "X" }, { children: "Y" }] }],
      };
      return render(
        layout(
          document({
            children: flow({
              pageSize: { width: 200 * scale, height: 100 * scale },
              margins,
              extensions,
              children: table(definition),
            }),
          }),
        ).document,
      );
    };
    assert.deepEqual(renderTracks([{ weight: 1 }, { weight: 3 }]), renderTracks([50 * scale, 150 * scale]));
  }
});

function fractionalDeferred(tracks: readonly WidthTrack[]) {
  const seen: { tag: string; width: number }[] = [];
  const probe = widthProbe(seen);
  const Probe = blockComponent(probe);
  const Theme = createContext("missing");
  function Deferred({ tag }: { tag: string }) {
    const page = useContext(PageContext);
    return h(Probe, { tag: `${useContext(Theme)}-${tag}-${page.docPageNumber}/${page.docPageCount}` });
  }
  const row = (tag: string, deferred = false) =>
    h(Table.Row, {
      children: tracks.map((_track, index) =>
        h(Table.Cell, {
          children: deferred ? h(Deferred, { tag: `${tag}-${index}` }) : extension(probe, { tag: `${tag}-${index}` }),
        }),
      ),
    });
  const content = h(Table, {
    columns: tracks.map((width) => ({ width })),
    style: { padding: 0, backgroundColor: [0.9, 0.9, 1] },
    children: [
      h(Table.Head, { repeat: true, height: 8, children: row("head", true) }),
      h(Table.Body, { children: [row("body"), row("body")] }),
      h(Table.Foot, { repeat: true, height: 8, children: row("foot", true) }),
    ],
  });
  const result = fractionalLayout(h(Theme.Provider, { value: "captured", children: content }), probe);
  return { result, seen };
}
function fractionalLayout(content: BlockContent, probe: ReturnType<typeof widthProbe>) {
  return layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 24 },
        margins,
        extensions: createExtensions([tableExtension, probe]),
        children: content,
      }),
    }),
  );
}
test("fractional fixed and max-saturated allocations survive deferred head AND foot on two pages", () => {
  const fixed = fractionalDeferred([20.1, 30.2]);
  const weighted = fractionalDeferred([
    { weight: 1, max: 20.1 },
    { weight: 1, max: 30.2 },
  ]);
  assert.equal(fixed.result.pageCount, 2);
  assert.deepEqual(weighted.result.placements, fixed.result.placements);
  assert.deepEqual(render(weighted.result.document), render(fixed.result.document));
  assert.equal(
    createHash("sha256").update(render(fixed.result.document)).digest("hex"),
    "0f4b04eca320b119d9be51fd70b713ed60ad9fe1404b45bfb4a94cba24d7c432",
  );
  assert.doesNotMatch(new TextDecoder().decode(render(fixed.result.document)), /\/Type \/Font/u);
  assert.ok(fixed.result.placements.every((placement) => placement.box.width === 20.1 + 30.2));
  for (const page of [1, 2])
    for (const edge of ["head", "foot"])
      for (const [index, width] of [20.1, 30.2].entries())
        assert.deepEqual(
          fixed.seen.filter((sample) => sample.tag === `captured-${edge}-${index}-${page}/2`),
          [{ tag: `captured-${edge}-${index}-${page}/2`, width }],
        );
  assert.deepEqual(weighted.seen, fixed.seen);
  diagnostic(() => run(input([20.1, 30.2]), 20.1 + 30.2), /\/props\/columns$/u);
});
test("fractional data decorations reuse certified widths without weakening public allocation validation", () => {
  const outputs: Uint8Array[] = [];
  const fixed = input([20.1, 30.2]);
  const weighted = input([
    { weight: 1, max: 20.1 },
    { weight: 1, max: 30.2 },
  ]);
  for (const definition of [fixed, weighted]) {
    const head = definition.head,
      foot = definition.foot;
    assert.ok(head && foot);
    const deferred = run({ ...definition, head: { ...head, height: 14 }, foot: { ...foot, height: 14 } }, 100);
    const staticResult = run(definition, 100);
    assert.deepEqual(deferred.placements, staticResult.placements);
    outputs.push(render(deferred.document));
  }
  assert.deepEqual(outputs[0], outputs[1]);
  for (const allocation of [true, {}, { columns: [{ width: 20.1 }, { width: 30.2 }] }])
    diagnostic(
      () => runExtension({ columns: [{ width: 20.1 }, { width: 30.2 }], body: [], allocation }),
      /\/allocation$/u,
      "KEY",
    );
});
function runExtension(props: unknown) {
  return layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 100 },
        margins,
        extensions,
        children: extension(tableExtension, props as TableInput),
      }),
    }),
  );
}
