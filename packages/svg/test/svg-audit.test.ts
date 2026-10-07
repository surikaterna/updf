import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { DocumentError, type NodeDefinition, render } from "@updf/core";
import { paint } from "@updf/core/internal";
import { h, lower } from "@updf/core/vdom";
import { parseColor } from "@updf/geometry";
import { compileSVG, renderSVG, SVGError } from "@updf/svg";
import { Svg } from "@updf/svg/tree";
import { acceptable, compare, type Image } from "../../../tests/svg-reference/compare.js";

const target = { x: 0, y: 0, w: 100, h: 100 };
function drawn(node: NodeDefinition): NodeDefinition | undefined {
  return node.type === "path" ? node : node.type === "paintGroup" ? node.children.map(drawn).find(Boolean) : undefined;
}

test("root SVG transform is outside nonidentity viewBox, caller placement stays outside root transform", () => {
  const node = renderSVG(
    '<svg width="100" height="100" viewBox="0 0 10 10" transform="translate(5 0)"><rect width="2" height="2"/></svg>',
    { ...target, x: 20, y: 30 },
  );
  assert.deepEqual(node.transform, [1, 0, 0, 1, 20, 30]);
  const content = node.children[0];
  assert.ok(content?.type === "paintGroup");
  assert.deepEqual(content.transform, [10, 0, 0, 10, 5, 0]);
});

test("finite extreme dash offsets never create NaN/Infinity or ordinary serializer errors", () => {
  const period = Number.MAX_VALUE;
  for (const offset of [period / 2, -period / 2, period, -period, 0]) {
    const value = paint({ dash: [period, 0], dashOffset: offset }, "path", "/paint");
    assert.ok(Number.isFinite(value.dashOffset) && value.dashOffset >= 0 && value.dashOffset < period);
    assert.ok(
      render({
        version: 1,
        pages: [
          {
            width: 100,
            height: 100,
            children: [
              {
                type: "line",
                x: 10,
                y: 10,
                x2: 80,
                y2: 80,
                paint: { dash: [period, 0], dashOffset: offset, lineJoin: "round" },
              },
            ],
          },
        ],
      }).length,
    );
  }
  assert.throws(() => paint({ dash: [period, period] }, "path", "/paint"), DocumentError);
});

test("prototype-name colors fail directly and in unused/matched CSS rules", () => {
  for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    assert.throws(() => parseColor(name), DocumentError);
    for (const usage of ["", '<rect class="a" width="20" height="20"/>']) {
      assert.throws(
        () => compileSVG(`<svg width="100" height="100"><style>.a{fill:${name}}</style>${usage}</svg>`, target),
        SVGError,
      );
    }
  }
});

test("style concatenates logical normal/CDATA/comment pieces and maps entity-expanded warning exactly", () => {
  for (const value of ["<![CDATA[red]]>", "<!--split-->red", "&#114;<![CDATA[ed]]>"]) {
    const result = compileSVG(
      `<svg width="100" height="100"><style>.a{fill:${value}}</style><rect class="a" width="20" height="20"/></svg>`,
      target,
    );
    const path = drawn(result.node);
    assert.ok(path?.type === "path");
    assert.deepEqual(path.paint?.fill, [1, 0, 0]);
  }
  const source =
    '<svg width="100" height="100"><rect width="20" height="20" style="fill:&#114;ed; stroke:\'none\';"/></svg>';
  const warning = compileSVG(source, target).diagnostics[0];
  assert.ok(warning?.span);
  assert.equal(source.slice(warning.span.start, warning.span.end).trim(), "stroke:'none'");
  const mixed =
    '<svg width="100" height="100"><style>.a{fill:<![CDATA[red; stroke:]]>\'none\';}</style><rect class="a" width="20" height="20"/></svg>';
  const other = compileSVG(mixed, target).diagnostics[0];
  assert.ok(other?.span && mixed.slice(other.span.start, other.span.end).includes("stroke:"));
});

test("VDOM Svg remapping retains original source span and adds only conceptual tree path", () => {
  const source = '<svg width="100" height="100"><rect width="20" height="20" onclick="bad()"/></svg>';
  let direct: DocumentError | undefined;
  try {
    renderSVG(source, target);
  } catch (error: unknown) {
    assert.ok(error instanceof DocumentError);
    direct = error;
  }
  assert.ok(direct?.diagnostics[0]?.span);
  const tree = h("document", {
    version: 1,
    children: h("page", { width: 100, height: 100, children: h(Svg, { source, ...target }) }),
  });
  assert.throws(
    () => lower(tree),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.deepEqual(error.diagnostics[0]?.span, direct?.diagnostics[0]?.span);
      assert.ok(error.diagnostics[0]?.path.startsWith("/tree") && error.diagnostics[0]?.path.endsWith("/@onclick"));
      return true;
    },
  );
});

async function cssProbe(mode: string): Promise<void> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", new URL("probes/css-budget.ts", import.meta.url).pathname, mode],
    { cwd: new URL("../", import.meta.url).pathname, stdio: "pipe" },
  );
  const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    assert.equal(code, 0, "900k CSS input must reject without pathological rescan/timeouts");
  } finally {
    clearTimeout(timer);
  }
}
test("unterminated adversarial CSS rejects the first opener in a bounded child", () => cssProbe("comment"));
test("adversarial declaration whitespace rejects in a bounded child without backtracking", () =>
  cssProbe("declaration"));

test("forward declarations preserve whitespace, empty entries and strict property/value rejection", () => {
  const wrap = (css: string): string =>
    `<svg width="100" height="100"><style>.a{${css}}</style><rect class="a" width="20" height="20"/></svg>`;
  const node = drawn(compileSVG(wrap(" ; \tfill \n: \tred \n; ;"), target).node);
  assert.ok(node?.type === "path");
  assert.deepEqual(node.paint?.fill, [1, 0, 0]);
  for (const css of [
    "fill",
    ":red",
    "fill:",
    "fi ll:red",
    "Fill:red",
    "fill:red:blue",
    "unknown:red",
    "fill:red!important",
  ]) {
    assert.throws(() => compileSVG(wrap(css), target), SVGError);
  }
});

test("CSS and transforms retain exact original suffix spans after entities, CDATA and comment gaps", () => {
  const styles = ["&#114;ed", "<![CDATA[red]]>", "&#114;<![CDATA[ed]]><!--gap-->"];
  const sources = styles.map((value) => `<svg width="100" height="100"><style>.a{fill:${value}} ???</style></svg>`);
  for (const element of ["svg", "g", "rect"]) {
    const attrs = 'transform="translate(&#53; 0) ???"';
    sources.push(
      element === "svg"
        ? `<svg width="100" height="100" ${attrs}/>`
        : `<svg width="100" height="100"><${element} ${element === "rect" ? 'width="20" height="20"' : ""} ${attrs}/></svg>`,
    );
  }
  sources.push('<svg width="100" height="100"><svg width="20" height="20" transform="translate(&#53; 0) ???"/></svg>');
  for (const source of sources) {
    const expected = { start: source.indexOf("???"), end: source.indexOf("???") + 3 };
    const tree = h("document", {
      version: 1,
      children: h("page", { width: 100, height: 100, children: h(Svg, { source, ...target }) }),
    });
    for (const [lowered, run] of [
      [false, () => compileSVG(source, target)],
      [true, () => lower(tree)],
    ] as const) {
      assert.throws(run, (error: unknown) => {
        assert.ok(error instanceof DocumentError);
        const diagnostic = error.diagnostics[0];
        assert.deepEqual(diagnostic?.span, expected);
        assert.equal(source.slice(expected.start, expected.end), "???");
        assert.ok(Object.isFrozen(diagnostic?.span));
        assert.ok(diagnostic?.code === (source.includes("<style>") ? "SVG_STYLE" : "SVG_GEOMETRY"));
        assert.equal(diagnostic?.path.startsWith("/tree"), lowered);
        return true;
      });
    }
  }
});

function image(color: readonly [number, number, number], move = 0, missing = false, alpha = 1, thickness = 2): Image {
  const rgb = new Uint8Array(100 * 100 * 3).fill(255);
  for (let y = 10; y < 90; y++) {
    for (let x = 10; x < 90; x++) {
      const horizontal = y >= 49 && y < 49 + thickness;
      const vertical = x >= 49 + move && x < 49 + move + thickness;
      if (!horizontal && (!vertical || (missing && y > 35 && y < 65))) continue;
      color.forEach((value, c) => {
        rgb[(y * 100 + x) * 3 + c] = Math.round(255 - (255 - value) * alpha);
      });
    }
  }
  return { width: 100, height: 100, rgb };
}
test("reference metric cannot hide thin wrong colors, missing segments, internal moves or opacity behind white ROI", () => {
  const red = image([255, 0, 0]);
  assert.ok(acceptable(compare(red, red)));
  for (const other of [
    image([0, 0, 255]),
    image([0, 0, 0]),
    image([255, 0, 0], 0, true),
    image([255, 0, 0], 10),
    image([255, 0, 0], 0, false, 0.5),
  ]) {
    const result = compare(red, other);
    assert.equal(result.bboxDelta, 0);
    assert.equal(result.interiorMismatchRatio, 0);
    assert.ok(!acceptable(result), JSON.stringify(result));
  }
  assert.ok(
    acceptable(compare(red, image([255, 0, 0], 1))),
    "One-pixel antialias/placement band remains bounded and allowed",
  );
  assert.ok(!acceptable(compare(image([255, 0, 0], 0, false, 1, 1), image([0, 0, 0], 0, false, 1, 1))));
});
