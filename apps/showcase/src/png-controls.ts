export interface PngControls {
  readonly variant: "color" | "gray";
  readonly width: number;
}

export const pngDefaults: PngControls = Object.freeze({ variant: "color", width: 192 });

export function validatePngControls(value: PngControls): void {
  if (value.variant !== "color" && value.variant !== "gray") throw new Error("Select color or grayscale PNG");
  if (!Number.isInteger(value.width) || value.width < 96 || value.width > 192)
    throw new Error("PNG display width must be an integer from 96 to 192 points");
}

export function pngControls(form: HTMLFormElement): PngControls {
  const variant = form.querySelector<HTMLSelectElement>("#png-variant")!.value;
  if (variant !== "color" && variant !== "gray") throw new Error("Select color or grayscale PNG");
  const controls: PngControls = { variant, width: form.querySelector<HTMLInputElement>("#png-width")!.valueAsNumber };
  validatePngControls(controls);
  return controls;
}
