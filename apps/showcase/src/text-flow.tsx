/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { Block, createExtensions, Document, Flow, layout, Paragraph, Span, pt } from "@updf/layout";
import { pngProvider } from "@updf/png";
import { createTextService } from "@updf/text";
import { floatable, textFlow } from "@updf/text-flow";
import { pathShapes } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";
import { loadEevee, wrappingNotice } from "./text-flow-asset.js";
import { eeveeAdapter, EeveeImage } from "./text-flow-image.js";

const continuation =
  "Ordinary paragraphs continue naturally across pages. The image paints once, and lines below its authored outline return to the full body width. The changing side interval follows a manually drawn polygon, not automatic transparency extraction. ";

const FloatingBlock = floatable(Block);
function definition(side: "left" | "right", title: string) {
  return (
    <Document>
      <Flow
        pageSize={{ width: 480, height: 520 }}
        margins={{ top: 28, right: 28, bottom: 28, left: 28 }}
        extensions={createExtensions([eeveeAdapter])}
      >
        <Paragraph style={{ fontSize: 18, lineHeight: pt(24) }}>{title}</Paragraph>
        <FloatingBlock
          key="eevee"
          style={{
            width: 164,
            height: 164,
            float: side,
            // Hand-authored conservative outline in the same local coordinates as the unmirrored PNG.
            shapeOutside: Source.path(
              "M46 0 L54 40 L71 40 L80 59 L96 51 L112 49 L118 45 L118 34 L112 22 L128 22 L140 33 L150 44 L157 60 L157 83 L148 106 L128 117 L115 118 L120 140 L124 148 L124 159 L110 164 L48 164 L29 159 L29 148 L39 141 L39 134 L30 123 L27 110 L30 104 L25 99 L22 87 L22 78 L28 66 L33 60 L29 49 L29 32 L31 14 L39 2 Z",
            ),
          }}
        >
          <EeveeImage width={164} height={164} />
        </FloatingBlock>
        <Paragraph key="first" style={{ fontSize: 12, lineHeight: pt(17) }}>
          Eevee on the {side}.{" "}
          <Span style={{ color: [0.4, 0.16, 0.05], backgroundColor: [1, 0.9, 0.62] }}>
            A real PNG beside rich text.
          </Span>{" "}
          This short first paragraph shares the authored silhouette with the next ordinary sibling.
        </Paragraph>
        <Paragraph key="second" style={{ fontSize: 12, lineHeight: pt(17) }}>
          {continuation.repeat(3)}
        </Paragraph>
        <Paragraph key="third" style={{ fontSize: 12, lineHeight: pt(17) }}>
          {continuation.repeat(5)}
        </Paragraph>
        <Paragraph key="end" style={{ fontSize: 11, lineHeight: pt(16) }}>
          End of authored path flow. {wrappingNotice}
        </Paragraph>
        <Paragraph style={{ fontSize: 9, lineHeight: pt(13) }}>
          External reference demo only: Eevee PNG from IconScout, referenced by theosoti on CodePen (ogjjged). License
          unknown; no package redistribution license asserted.
        </Paragraph>
      </Flow>
    </Document>
  );
}

export async function textFlowExample(title: string, side: "left" | "right", signal?: AbortSignal) {
  const eevee = await loadEevee(signal);
  const runtime = fontRuntime();
  const options = {
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
    extensions: [textFlow({ handlers: [pathShapes()] })],
    resources: { Helvetica: createHelvetica(), eevee },
    providers: [fontProvider(runtime), pngProvider()],
  };
  const result = layout(definition(side, title), options);
  return { bytes: render(result.document, options), pageCount: result.pageCount, image: eevee.metadata };
}
