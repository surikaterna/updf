import type { FlowControls } from "./flow.js";

export function flowControls(form: HTMLFormElement): FlowControls {
  const data = new FormData(form);
  const count = Number(data.get("flowCount"));
  const preset = data.get("flowPreset");
  if (!Number.isInteger(count) || count < 1 || count > 21) throw new Error("Paragraph count must be 1–21");
  if (preset !== "compact" && preset !== "letter" && preset !== "overflow") throw new Error("Unknown page preset");
  return { count, preset, regions: data.has("flowRegions"), keepTogether: data.has("flowKeepTogether") };
}
