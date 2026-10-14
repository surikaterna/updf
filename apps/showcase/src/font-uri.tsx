/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { fontProvider, fontRuntime, type PreparedFont } from "@updf/fonts";
import { Block, Document, Flow, layout, Paragraph, Span } from "@updf/layout";
import { createTextService } from "@updf/text";

export function fontUriExample(font: PreparedFont, title: string, fontSize = 18) {
  if (title.length > 40 || /[\r\n]/u.test(title))
    throw new Error("Font sample title must be one line, at most 40 characters");
  if (!Number.isInteger(fontSize) || fontSize < 10 || fontSize > 32)
    throw new Error("Font size must be 10 to 32 points");
  const runtime = fontRuntime();
  const options = {
    resources: { Remote: font },
    text: createTextService({ runtime, defaultFont: "Remote" }),
    providers: [fontProvider(runtime)],
    profile: "service" as const,
  };
  const result = layout(
    <Document>
      <Flow pageSize={{ width: 480, height: 560 }} margins={{ top: 24, right: 24, bottom: 24, left: 24 }}>
        <FontSample font={font} title={title} fontSize={fontSize} />
      </Flow>
    </Document>,
    options,
  );
  return {
    bytes: render(result.document, options),
    metadata: {
      fontName: font.metadata.descriptor.postscriptName,
      fontBytes: font.metadata.byteLength,
      pageCount: result.pageCount,
    },
  };
}

function FontSample({
  font,
  title,
  fontSize,
}: {
  readonly font: PreparedFont;
  readonly title: string;
  readonly fontSize: number;
}) {
  return (
    <Block style={{ gap: 16 }}>
      <Paragraph style={{ fontSize: 24, lineHeight: "normal" }} breakLongWords="codePoint">
        {title}
      </Paragraph>
      <Paragraph
        style={{ fontSize: 11, lineHeight: "normal" }}
        breakLongWords="codePoint"
      >{`Font: ${font.metadata.descriptor.postscriptName}`}</Paragraph>
      <Paragraph style={{ fontSize, lineHeight: "normal" }}>The quick brown fox jumps over the lazy dog.</Paragraph>
      <Paragraph style={{ fontSize, lineHeight: "normal" }} breakLongWords="codePoint">
        ABCDEFGHIJKLMNOPQRSTUVWXYZ
      </Paragraph>
      <Paragraph style={{ fontSize, lineHeight: "normal" }} breakLongWords="codePoint">
        abcdefghijklmnopqrstuvwxyz 0123456789
      </Paragraph>
      <Paragraph style={{ fontSize, lineHeight: "normal" }}>
        One font, <Span style={{ color: [0.05, 0.4, 0.65] }}>shared span styling</Span>, and measured wrapping.
      </Paragraph>
      <Paragraph
        style={{ fontSize: 10, lineHeight: "normal" }}
      >{`${font.metadata.byteLength} font bytes embedded. Static TrueType only. Simple LTR text; no shaping, bidi or fallback.`}</Paragraph>
      <Paragraph style={{ fontSize: 10, lineHeight: "normal" }}>
        A URI load happens before layout. The PDF is generated locally. Use trusted fonts with permission to embed them.
      </Paragraph>
    </Block>
  );
}
