import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { render } from "@updf/core";
import { compileSVG, type SVGTarget } from "@updf/svg";
import type { Page } from "playwright";
import type { Image } from "./compare.js";

export async function readPNG(page: Page, bytes: Uint8Array, width: number, height: number): Promise<Image> {
  const source = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  const result = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing PNG decode canvas");
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const rgb: number[] = [];
    for (let i = 0; i < rgba.length; i += 4) rgb.push(rgba[i] ?? 255, rgba[i + 1] ?? 255, rgba[i + 2] ?? 255);
    return { width: canvas.width, height: canvas.height, rgb };
  }, source);
  assert.equal(result.width, width);
  assert.equal(result.height, height);
  return { width, height, rgb: new Uint8Array(result.rgb) };
}

export async function pdf(
  page: Page,
  source: string,
  width: number,
  height: number,
  name: string,
  placement?: SVGTarget,
): Promise<Image> {
  const node = compileSVG(source, placement ?? { x: 0, y: 0, w: width, h: height }).node;
  const path = new URL(`../../artifacts/svg-${name}.pdf`, import.meta.url).pathname;
  await writeFile(path, render({ version: 1, pages: [{ width, height, children: [node] }] }));
  execFileSync("qpdf", ["--check", path]);
  // Cairo preserves fractional stroke coverage; Splash snaps narrow strokes to its pixel grid.
  execFileSync("pdftocairo", ["-r", "144", "-singlefile", "-png", path, path.slice(0, -4)]);
  return readPNG(page, await readFile(`${path.slice(0, -4)}.png`), width * 2, height * 2);
}
