import type { SVGTarget } from "@updf/svg";
import type { Page } from "playwright";
import type { Image } from "./compare.js";

export async function native(
  page: Page,
  source: string,
  width: number,
  height: number,
  placement?: SVGTarget,
): Promise<Image & { readonly png: string }> {
  const viewport = placement ?? { x: 0, y: 0, w: width / 2, h: height / 2 };
  const result = await page.evaluate(
    async ({ source, width, height, viewport }) => {
      const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Native SVG decode failed"));
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing reference canvas");
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, viewport.x * 2, viewport.y * 2, viewport.w * 2, viewport.h * 2);
        const rgba = context.getImageData(0, 0, width, height).data;
        const rgb: number[] = [];
        for (let i = 0; i < rgba.length; i += 4) rgb.push(rgba[i] ?? 255, rgba[i + 1] ?? 255, rgba[i + 2] ?? 255);
        return { rgb, png: canvas.toDataURL("image/png") };
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { source, width, height, viewport },
  );
  return { width, height, rgb: new Uint8Array(result.rgb), png: result.png };
}
