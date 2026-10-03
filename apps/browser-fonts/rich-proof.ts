import { type PreparedFont, render } from "@updf/core";
import { measureText } from "@updf/core/measurement";
import { type Component, createContext, h, lower, useContext } from "@updf/core/vdom";

export function richProof(font: PreparedFont) {
  const options = { profile: "service", resources: { Demo: font } } as const;
  const input = {
    kind: "rich",
    width: 250,
    paragraphs: [
      {
        defaultStyle: { font: "Demo", fontSize: 16, color: [0, 0, 0] },
        runs: [
          { text: "Привет  ", style: { color: [0, 0, 1] } },
          { text: " portable", style: { font: "Helvetica", fontSize: 20, color: [1, 0, 0] } },
          { text: " measurement\nА\u00a0Б" },
        ],
        lineHeight: 26,
        align: "center",
        whiteSpace: "collapse",
        breakLongWords: "codePoint",
      },
    ],
  } as const;
  const measurement = measureText(input, options);
  const Theme = createContext({ font, x: 20 });
  const Document: Component<object> = () => {
    const theme = useContext(Theme);
    if (theme.font !== font) throw new Error("Context must retain owned prepared fonts");
    return h("document", {
      version: 1,
      children: h("page", {
        width: 300,
        height: 300,
        children: h("richText", {
          x: theme.x,
          y: 20,
          width: input.width,
          height: measurement.consumedHeight,
          paragraphs: input.paragraphs,
        }),
      }),
    });
  };
  const tree = h(Theme.Provider, { value: { font, x: 20 }, children: h(Document, {}) });
  const bytes = render(lower(tree, options), options);
  return { bytes, measurement };
}
