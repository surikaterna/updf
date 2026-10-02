import assert from "node:assert/strict";
import test from "node:test";
import { type NodeDefinition, type PathNode, render } from "@updf/core";
import { point } from "@updf/core/painting";
import { h, lower } from "@updf/core/vdom";
import { compileSVG, renderSVG, SVGError } from "@updf/svg";
import { createSVGTree, Svg } from "@updf/svg/tree";
import { logoLikeSVG, quotedNoneSVG } from "../../../apps/node/src/svg-fixtures.js";
import { transform } from "../dist/transform.js";

const target = { x: 0, y: 0, w: 100, h: 100 };
function paths(node: NodeDefinition): PathNode[] {
  return node.type === "path" ? [node] : node.type === "paintGroup" ? node.children.flatMap(paths) : [];
}
const source = (inside: string, attrs = "") => `<svg width="100" height="100" ${attrs}>${inside}</svg>`;
function invalid(svg: string): void {
  assert.throws(
    () => renderSVG(svg, target),
    (error: unknown) => {
      assert.ok(error instanceof SVGError);
      const diagnostic = error.diagnostics[0];
      assert.ok(diagnostic?.span && diagnostic.path.startsWith("/svg"));
      assert.ok(diagnostic.span.start >= 0 && diagnostic.span.end >= diagnostic.span.start);
      return true;
    },
  );
}

test("immutable SVG AST and VDOM bridge lower to identical bytes with no caller freezing", () => {
  const input = { x: 10, y: 10, w: 100, h: 100 };
  const svg = source('<g fill="red"><rect x="10" y="10" width="20" height="30"/><circle cx="60" cy="60" r="10"/></g>');
  const node = renderSVG(svg, input);
  const doc = { version: 1, pages: [{ width: 120, height: 120, children: [node] }] } as const;
  assert.ok(Object.isFrozen(node) && Object.isFrozen(node.children) && Object.isFrozen(node.clip));
  assert.ok(!Object.isFrozen(input));
  const tree = h("document", {
    version: 1,
    children: h("page", { width: 120, height: 120, children: createSVGTree(svg, input) }),
  });
  assert.deepEqual(render(lower(tree)), render(doc));
  const component = h("document", {
    version: 1,
    children: h("page", { width: 120, height: 120, children: h(Svg, { source: svg, ...input }) }),
  });
  assert.deepEqual(render(lower(component)), render(doc));
  assert.deepEqual(renderSVG(svg, input), node);
});

test("XML names/quotes/numeric and predefined entities/comments/CDATA/namespaces consume full source", () => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><!--a--><s:svg xmlns:s="http://www.w3.org/2000/svg" width='100px' height='100'><s:title>A &amp; B &#x41; &lt; &quot;</s:title><s:style><![CDATA[.a{fill:red}]]></s:style><s:rect id="x-y" class="a" x="&#49;0" y="10" width="20" height="20"/></s:svg><!--tail-->`;
  assert.deepEqual(paths(renderSVG(svg, target))[0]?.paint?.fill, [1, 0, 0]);
  for (const svg of [
    "<svg/>garbage",
    "<svg/><svg/>",
    "<svg><g></svg>",
    '<svg x="1" x="2"/>',
    "<svg width=100/>",
    "<svg><!--bad--comment--></svg>",
    "<!DOCTYPE svg><svg/>",
    source('<rect width="&external;"/>'),
  ])
    invalid(svg);
});

test("CSS cascade specificity/source order, multiple classes, inline and inherited fill/stroke", () => {
  const svg = source(
    `<style>.a{fill:red}.b{fill:blue;stroke-width:2}</style><g fill="green" stroke="black"><rect class="b a" x="10" y="10" width="10" height="10"/><rect class="a b" style="fill:rgb(0,255,0);stroke:none" x="30" y="10" width="10" height="10"/><rect fill="inherit" x="50" y="10" width="10" height="10"/></g>`,
  );
  const drawn = paths(renderSVG(svg, target));
  assert.deepEqual(drawn[0]?.paint?.fill, [0, 0, 1]);
  assert.deepEqual(drawn[1]?.paint?.fill, [0, 1, 0]);
  assert.equal(drawn[1]?.paint?.stroke, null);
  assert.deepEqual(drawn[2]?.paint?.fill, [0, 128 / 255, 0]);
  assert.equal(drawn[0]?.paint?.width, 2);
});

test("quoted CSS stroke none is narrowly discarded with observable source warning, never normalized", () => {
  const result = compileSVG(quotedNoneSVG, target);
  assert.equal(result.diagnostics.length, 1);
  const warning = result.diagnostics[0];
  assert.ok(warning);
  assert.equal(warning.severity, "warning");
  assert.ok(quotedNoneSVG.slice(warning.span.start, warning.span.end).includes("stroke:'none'"));
  assert.deepEqual(paths(result.node)[0]?.paint?.stroke, [0, 0, 1]);
  assert.throws(() => renderSVG(quotedNoneSVG, target), SVGError);
});

test("transform order/center rotation/nonuniform scale/skew and viewBox meet/slice/none", () => {
  const span = { start: 0, end: 100 };
  assert.deepEqual(point(transform("translate(10 20) scale(2 3)", "/svg", span), 1, 1), [12, 23]);
  const rotated = point(transform("rotate(90 10 20)", "/svg", span), 20, 20);
  assert.ok(Math.abs(rotated[0] - 10) < 1e-8 && Math.abs(rotated[1] - 30) < 1e-8);
  assert.ok(point(transform("skewX(45) skewY(10)", "/svg", span), 1, 1)[0] > 2);
  const meet = renderSVG('<svg viewBox="10 20 100 50"><rect x="10" y="20" width="100" height="50"/></svg>', target);
  const inner = meet.children[0];
  assert.ok(inner?.type === "paintGroup" && inner.transform);
  assert.deepEqual(inner.transform, [1, 0, 0, 1, -10, 5]);
  const none = renderSVG('<svg viewBox="10 20 100 50" preserveAspectRatio="none"/>', target).children[0];
  assert.ok(none?.type === "paintGroup");
  assert.deepEqual(none.transform, [1, 0, 0, 2, -10, -40]);
  invalid('<svg viewBox="0 0 0 1"/>');
  invalid("<svg/>");
  for (const value of ["rotate(1 2)", "scale(0)", "matrix(1 0)", "translate(1),,scale(2)", "translate(1)junk"])
    invalid(source("<g/>", `transform="${value}"`));
});

test("native shape families, rounded radii/zero geometry, opacity and inherited visibility", () => {
  const shapes = paths(renderSVG(logoLikeSVG, { x: 0, y: 0, w: 320, h: 200 }));
  assert.ok(shapes.length >= 8 && shapes.some((shape) => shape.commands.some((command) => command.type === "cubic")));
  const visible = paths(
    renderSVG(
      source(
        '<g visibility="hidden"><rect width="10" height="10"/><circle visibility="visible" cx="20" cy="20" r="10"/></g><g display="none"><rect display="inline" width="10" height="10"/></g>',
      ),
      target,
    ),
  );
  assert.equal(visible.length, 1);
  const empty = paths(renderSVG(source('<rect width="0" height="2"/>'), target));
  assert.equal(empty[0]?.commands.length, 0);
  const rounded = paths(renderSVG(source('<rect width="20" height="100" rx="30"/>'), target))[0];
  assert.ok(rounded?.commands.some((command) => command.type === "cubic" && command.y === 30));
  invalid(source('<circle r="-1"/>'));
  invalid(source('<rect width="10%" height="10"/>'));
  invalid(source('<g opacity=".5"><rect width="20" height="20"/></g>'));
  invalid(source("<style>.unused{opacity:.5}</style>"));
  const nested = renderSVG(
    source(
      '<svg x="80" y="80" width="40" height="40" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>',
    ),
    target,
  );
  assert.ok(render({ version: 1, pages: [{ width: 100, height: 100, children: [nested] }] }).length);
});

test("unsupported SVG visual features, attrs, events, references, styles and text fail closed", () => {
  for (const body of [
    "<script/>",
    "<image/>",
    '<use href="#x"/>',
    "<text>no</text>",
    '<defs><path d="M0 0"/></defs>',
    "<linearGradient/>",
    "<filter/>",
    "<clipPath/>",
    "<mask/>",
    '<path onclick="bad()"/>',
    '<rect filter="url(#x)"/>',
    '<path style="stroke:url(#x)"/>',
    '<style>@import "x";</style>',
    "<style>g{fill:red}</style>",
    "<style>.a:hover{fill:red}</style>",
    "<style>.a{fill:red!important}</style>",
    '<rect unknown="x"/>',
  ])
    invalid(source(body));
});

test("bounded source/depth/element/class/command work fails before unchecked allocation", () => {
  invalid("x".repeat(1024 * 1024 + 1));
  invalid(source("<g>".repeat(65) + "</g>".repeat(65)));
  invalid(source("<g/>".repeat(10000)));
  invalid(source(`<style>${Array.from({ length: 1001 }, (_, i) => `.a${i}{fill:red}`).join("")}</style>`));
  invalid(source(`<path d="M0 0${" L1 1".repeat(4096)}"/>`));
});
