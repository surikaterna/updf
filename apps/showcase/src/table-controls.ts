import type { TableControls } from "./tables.js";

export function tableControls(form: HTMLFormElement): TableControls {
  const data = new FormData(form);
  const count = Number(data.get("tableCount"));
  const preset = data.get("tablePreset");
  const cellPreset = data.get("tableCellPreset");
  const minHeight = Number(data.get("tableMinHeight"));
  if (!Number.isInteger(count) || count < 1 || count > 40) throw new Error("Row count must be 1–40");
  if (preset !== "compact" && preset !== "wide" && preset !== "overflow") throw new Error("Unknown table preset");
  if (cellPreset !== "text" && cellPreset !== "chart" && cellPreset !== "svg") throw new Error("Unknown cell preset");
  if (!Number.isFinite(minHeight) || minHeight < 0 || minHeight > 100)
    throw new Error("Minimum row height must be 0–100");
  return {
    count,
    preset,
    repeatHeader: data.has("tableRepeatHeader"),
    wrapped: data.has("tableWrapped"),
    cellPreset,
    minHeight,
  };
}
