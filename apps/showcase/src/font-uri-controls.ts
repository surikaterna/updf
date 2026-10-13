export interface FontUriControls {
  readonly uri: string;
  readonly fontSize: number;
}
export const googleFontUri = "https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxP.ttf";
export const fontUriDefaults: FontUriControls = Object.freeze({ uri: "", fontSize: 18 });
let activeUri = "";
let controller: AbortController | undefined;

export function validateFontUriControls(controls: FontUriControls): void {
  if (typeof controls.uri !== "string" || controls.uri.length > 2048)
    throw new Error("Font URI must be at most 2048 characters");
  if (!Number.isInteger(controls.fontSize) || controls.fontSize < 10 || controls.fontSize > 32)
    throw new Error("Font size must be an integer from 10 to 32 points");
}
export function activateFontUri(uri: string): void {
  activeUri = uri;
}
export function resetFontUri(): void {
  activeUri = "";
}
export function fontUriControls(form: HTMLFormElement, submitted = false): FontUriControls {
  const controls = {
    uri: submitted ? form.querySelector<HTMLInputElement>("#font-uri")!.value.trim() : activeUri,
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
