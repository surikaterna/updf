import { fail, number } from "@updf/core/internal";

/** Derived aspect arithmetic only; the canonical Block already owns the content rectangle. */
export function imagePlacement(
  width: number,
  height: number,
  pixels: { width: number; height: number },
  fit: "contain" | "fill",
  path: string,
) {
  number(width, path, true);
  number(height, path, true);
  let paintedWidth = width;
  let paintedHeight = height;
  if (fit === "contain") {
    const ratio = pixels.width / pixels.height;
    if (width / height <= ratio) paintedHeight = width / ratio;
    else paintedWidth = height * ratio;
  }
  number(paintedWidth, path, true);
  number(paintedHeight, path, true);
  const x = (width - paintedWidth) / 2;
  const y = (height - paintedHeight) / 2;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x + paintedWidth > width ||
    y + paintedHeight > height
  )
    fail("GEOMETRY", path, "Image placement cannot certify finite content containment");
  return Object.freeze({ x, y, width: paintedWidth, height: paintedHeight });
}
