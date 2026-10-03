import { render } from "@updf/core";
import { renderSVG } from "@updf/svg";

export const WIDTH = 320;
export const HEIGHT = 200;
export const TARGET_FPS = 25;
const columns = 32;
const rows = 20;
const palette = Array.from({ length: 256 }, (_, i) => {
  const channels = [0, 2, 4].map((shift) => Math.round(127.5 + 127.5 * Math.sin((i * Math.PI * 2) / 256 + shift)));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
});
const cells = Array.from({ length: columns * rows }, (_, i) => {
  const x = i % columns;
  const y = Math.floor(i / columns);
  return {
    x: x * 10,
    y: y * 10,
    horizontal: x * 0.31,
    diagonal: (x + y) * 0.21,
    radial: Math.hypot(x - 16, y - 10) * 0.42,
  };
});

export function plasmaSVG(frameIndex: number): string {
  if (!Number.isSafeInteger(frameIndex) || frameIndex < 0) throw new Error("Invalid plasma frame index");
  const phase = frameIndex / TARGET_FPS;
  const rects = cells.map(({ x, y, horizontal, diagonal, radial }) => {
    const wave = Math.sin(horizontal + phase) + Math.sin(diagonal - phase * 0.7) + Math.sin(radial + phase * 1.3);
    const color = palette[Math.round((wave + 3) * 42.5) % 256];
    return `<rect x="${x}" y="${y}" width="10" height="10" fill="${color}"/>`;
  });
  return `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}">${rects.join("")}</svg>`;
}

export function plasmaPDF(frameIndex: number): Uint8Array {
  const painting = renderSVG(plasmaSVG(frameIndex), { x: 0, y: 0, w: WIDTH, h: HEIGHT });
  return render({ version: 1, pages: [{ width: WIDTH, height: HEIGHT, children: [painting] }] });
}
