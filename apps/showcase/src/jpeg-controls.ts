export interface JpegControls {
  readonly variant: "color" | "gray";
  readonly width: number;
}

export const jpegDefaults: JpegControls = Object.freeze({ variant: "color", width: 192 });

export function validateJpegControls(value: JpegControls): void {
  if (value.variant !== "color" && value.variant !== "gray") throw new Error("Select color or grayscale JPEG");
  if (!Number.isInteger(value.width) || value.width < 96 || value.width > 192)
    throw new Error("JPEG display width must be an integer from 96 to 192 points");
}

export function jpegControls(form: HTMLFormElement): JpegControls {
  const variant = form.querySelector<HTMLSelectElement>("#jpeg-variant")!.value;
  if (variant !== "color" && variant !== "gray") throw new Error("Select color or grayscale JPEG");
  const controls: JpegControls = { variant, width: form.querySelector<HTMLInputElement>("#jpeg-width")!.valueAsNumber };
  validateJpegControls(controls);
  return controls;
}
