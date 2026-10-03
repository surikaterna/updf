import type { RichControls } from "./rich.js";

export function richControls(form: HTMLFormElement): RichControls {
  const data = new FormData(form);
  const align = data.get("align"),
    whiteSpace = data.get("whiteSpace"),
    breakLongWords = data.get("breakLongWords");
  if (align !== "left" && align !== "center" && align !== "right") throw new Error("Unsupported alignment");
  if (whiteSpace !== "preserve" && whiteSpace !== "collapse") throw new Error("Unsupported whitespace");
  if (breakLongWords !== "error" && breakLongWords !== "codePoint") throw new Error("Unsupported break mode");
  return {
    width: Number(data.get("richWidth")),
    fontSize: Number(data.get("richFontSize")),
    align,
    whiteSpace,
    breakLongWords,
  };
}
