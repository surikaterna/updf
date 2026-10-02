import { render } from "@updf/core";
import { renderSVG } from "@updf/svg";
export function svgDemo(title: string): Uint8Array {
  const painting = renderSVG(
    '<svg viewBox="0 0 120 80"><rect width="120" height="80" fill="#edf7ff"/><circle cx="60" cy="40" r="28" fill="#1670ab"/><path d="M40 40 L55 55 L80 25" fill="none" stroke="white" stroke-width="4"/></svg>',
    { x: 30, y: 80, w: 360, h: 180 },
  );
  return render({
    version: 1,
    pages: [
      {
        width: 420,
        height: 300,
        children: [
          {
            type: "text",
            x: 24,
            y: 24,
            width: 372,
            height: 32,
            text: title,
            fontSize: 16,
            lineHeight: 20,
            align: "left",
          },
          painting,
        ],
      },
    ],
  });
}
