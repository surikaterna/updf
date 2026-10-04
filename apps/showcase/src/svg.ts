import { render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { Block, blockComponent, createExtensions, Document, defineBlockAdapter, Flow, Paragraph } from "@updf/layout";
import { compileSVG } from "@updf/svg";

const svgAdapter = defineBlockAdapter<Record<never, never>>({
  name: "showcase.svg",
  validate(input) {
    if (!input || typeof input !== "object" || Reflect.ownKeys(input).length)
      throw new Error("Expected empty SVG props");
    return {};
  },
  measure(_props, context) {
    const height = 180;
    const compiled = compileSVG(
      '<svg viewBox="0 0 120 80"><rect width="120" height="80" fill="#edf7ff"/><circle cx="60" cy="40" r="28" fill="#1670ab"/><path d="M40 40 L55 55 L80 25" fill="none" stroke="white" stroke-width="4"/></svg>',
      { x: 0, y: 0, w: context.width, h: height },
    );
    if (compiled.diagnostics.length) throw new Error("SVG warnings require author acceptance");
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: context.width, height },
      fragment: (request) =>
        height > request.availableHeight
          ? { status: "defer" }
          : { status: "placed", nextOffset: 1, height, nodes: [compiled.node] },
    };
  },
});
const Visual = blockComponent(svgAdapter);

export function svgDemo(title: string): Uint8Array {
  const tree = h(Document, {
    children: h(Flow, {
      pageSize: { width: 420, height: 300 },
      margins: { top: 24, right: 30, bottom: 24, left: 30 },
      extensions: createExtensions([svgAdapter]),
      children: h(Block, {
        keepTogether: true,
        style: { gap: 24 },
        children: [h(Paragraph, { style: { fontSize: 16, lineHeight: 1.25 }, children: title }), h(Visual, {})],
      }),
    }),
  });
  return render(lower(tree));
}
