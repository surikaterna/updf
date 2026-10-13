export type FontEngine = "fontkit" | "fontkite";
export type FontUriAction = "active" | "submit" | "engine";
export interface FontUriControls {
  readonly engine: FontEngine;
  readonly uri: string;
  readonly fontSize: number;
}
export const googleFontUri = "https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxP.ttf";
export const fontUriDefaults: FontUriControls = Object.freeze({ engine: "fontkit", uri: "", fontSize: 18 });
let activeUri = "";
let activeEngine: FontEngine = fontUriDefaults.engine;
let controller: AbortController | undefined;

export function fontEngine(value: unknown): FontEngine {
  if (value !== "fontkit" && value !== "fontkite") throw new Error("Font engine must be Fontkit or Fontkite");
  return value;
}
export function validateFontUriControls(controls: FontUriControls): void {
  fontEngine(controls.engine);
  if (typeof controls.uri !== "string" || controls.uri.length > 2048)
    throw new Error("Font URI must be at most 2048 characters");
  if (!Number.isInteger(controls.fontSize) || controls.fontSize < 10 || controls.fontSize > 32)
    throw new Error("Font size must be an integer from 10 to 32 points");
}
export function activateFontUri(uri: string, engine: FontEngine): void {
  activeUri = uri;
  activeEngine = engine;
}
export function resetFontUri(): void {
  activeUri = "";
  activeEngine = fontUriDefaults.engine;
}
export function fontUriControls(form: HTMLFormElement, action: FontUriAction = "active"): FontUriControls {
  const engine = action === "active" ? activeEngine : form.querySelector<HTMLSelectElement>("#font-engine")!.value;
  const controls = {
    engine: fontEngine(engine),
    uri: action === "submit" ? form.querySelector<HTMLInputElement>("#font-uri")!.value.trim() : activeUri,
    fontSize: form.querySelector<HTMLInputElement>("#font-uri-size")!.valueAsNumber,
  };
  validateFontUriControls(controls);
  return controls;
}
export function cancelFontLoad(): void {
  controller?.abort();
  controller = undefined;
}
export function fontLoadSignal(): AbortSignal {
  cancelFontLoad();
  controller = new AbortController();
  return controller.signal;
}
