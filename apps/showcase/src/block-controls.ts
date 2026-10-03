import type { BlockControls } from "./blocks.js";

export function blockControls(form: HTMLFormElement): BlockControls {
  const data = new FormData(form);
  const chartHeight = Number(data.get("chartHeight")),
    blockHeight = Number(data.get("blockHeight"));
  if (!Number.isInteger(chartHeight) || chartHeight < 40 || chartHeight > 180)
    throw new Error("Chart height must be 40–180");
  if (!Number.isInteger(blockHeight) || blockHeight < 0 || blockHeight > 220)
    throw new Error("Block height must be 0–220");
  return { chartHeight, blockHeight, keepTogether: data.has("blockKeepTogether"), hidden: data.has("blockHidden") };
}
