import type { MixedControls } from "./mixed.js";

export function mixedControls(form: HTMLFormElement): MixedControls {
  const data = new FormData(form);
  const count = Number(data.get("mixedCount"));
  const preset = data.get("mixedPreset"),
    orientation = data.get("mixedOrientation"),
    theme = data.get("mixedTheme");
  if (!Number.isInteger(count) || count < 1 || count > 40) throw new Error("Paragraph count must be 1–40");
  if (preset !== "A4" && preset !== "A5" && preset !== "Letter" && preset !== "Legal")
    throw new Error("Unknown page preset");
  if (orientation !== "portrait" && orientation !== "landscape") throw new Error("Unknown orientation");
  if (theme !== "ocean" && theme !== "amber") throw new Error("Unknown theme");
  return { count, preset, orientation, theme, header: data.has("mixedHeader"), footer: data.has("mixedFooter") };
}
