import { DocumentError } from "@updf/core";
import { blockControls } from "./block-controls.js";
import { brandingControls, showBrandLogo } from "./branding-controls.js";
import { demoId, generate } from "./demos.js";
import { flowControls } from "./flow-controls.js";
import { mixedControls } from "./mixed-controls.js";
import { richControls } from "./rich-controls.js";
import { tableControls } from "./table-controls.js";
import { commitSource, failed, pending, showMetadata, titleError, validateForm } from "./result-ui.js";
import "./style.css";
import "./workspace.css";

function element<T extends HTMLElement>(id: string, type: new (...args: never[]) => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Missing UI element: ${id}`);
  return found;
}

const form = element("demo-form", HTMLFormElement);
const selection = element("example", HTMLSelectElement);
const title = element("title", HTMLInputElement);
const status = element("status", HTMLElement);
const output = element("output", HTMLElement);
const preview = element("preview", HTMLElement);
const actions = element("pdf-actions", HTMLElement);
const download = element("download", HTMLAnchorElement);
const open = element("open", HTMLAnchorElement);
let blobUrl: string | undefined;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let renderer: import("./preview.js").CanvasPreview | undefined;
let rendererLoad: Promise<import("./preview.js").CanvasPreview> | undefined;
let disposed = false;

function clearOutput(): void {
  preview.replaceChildren();
  download.removeAttribute("href");
  open.removeAttribute("href");
  output.hidden = true;
  actions.hidden = true;
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = undefined;
}

function invalidate(): number {
  clearTimeout(timer);
  generation += 1;
  renderer?.cancel();
  return generation;
}

function showDemo(): void {
  const id = demoId(selection.value);
  showMetadata(id);
  element("rich-controls", HTMLFieldSetElement).hidden = id !== "rich";
  element("rich-controls", HTMLFieldSetElement).disabled = id !== "rich";
  element("flow-controls", HTMLFieldSetElement).hidden = id !== "flow";
  element("flow-controls", HTMLFieldSetElement).disabled = id !== "flow";
  element("table-controls", HTMLFieldSetElement).hidden = id !== "tables";
  element("table-controls", HTMLFieldSetElement).disabled = id !== "tables";
  element("block-controls", HTMLFieldSetElement).hidden = id !== "blocks";
  element("block-controls", HTMLFieldSetElement).disabled = id !== "blocks";
  element("mixed-controls", HTMLFieldSetElement).hidden = id !== "mixed";
  element("mixed-controls", HTMLFieldSetElement).disabled = id !== "mixed";
  element("branding-controls", HTMLFieldSetElement).hidden = id !== "branding";
  element("branding-controls", HTMLFieldSetElement).disabled = id !== "branding";
  if (id === "branding") showBrandLogo();
}

function captureArguments(): Parameters<typeof generate> {
  validateForm(form);
  const id = demoId(selection.value);
  return [
    id,
    title.value,
    id === "rich" ? richControls(form) : undefined,
    id === "flow" ? flowControls(form) : undefined,
    id === "tables" ? tableControls(form) : undefined,
    id === "blocks" ? blockControls(form) : undefined,
    id === "mixed" ? mixedControls(form) : undefined,
    id === "branding" ? brandingControls(form) : undefined,
  ];
}

function readableError(error: unknown): string {
  if (error instanceof DocumentError) {
    return error.diagnostics.map(({ code, path, message }) => `${code} at ${path}: ${message}`).join("\n");
  }
  return `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}. Try a core example or reload.`;
}

async function renderExample(): Promise<void> {
  if (disposed) return;
  const current = invalidate();
  form.setAttribute("aria-busy", "true");
  pending(!!blobUrl);
  output.hidden = false;
  try {
    const args = captureArguments();
    const result = await generate(...args);
    if (current !== generation) return;
    await renderOutput(current, args, result);
  } catch (error) {
    if (current === generation) {
      if (error instanceof DocumentError && error.diagnostics.some(({ code }) => code === "CHARACTER")) {
        titleError(readableError(error));
      }
      failed(readableError(error), !!blobUrl);
      output.hidden = !blobUrl;
    }
  } finally {
    if (current === generation) {
      form.setAttribute("aria-busy", "false");
    }
  }
}

async function renderOutput(
  current: number,
  args: Parameters<typeof generate>,
  result: Awaited<ReturnType<typeof generate>>,
): Promise<void> {
  const { bytes, source, summary } = result;
  let pages: DocumentFragment | undefined;
  let failure = false;
  try {
    rendererLoad ??= import("./preview.js").then(({ CanvasPreview }) => new CanvasPreview());
    renderer = await rendererLoad;
    if (current !== generation) return;
    pages = await renderer.render(bytes, Math.max(1, preview.clientWidth));
  } catch {
    failure = true;
  }
  if (current !== generation) return;
  if (!pages && !failure) return;
  publishPdf(args[0], bytes);
  preview.replaceChildren(pages ?? "Canvas preview unavailable. Open or download this PDF instead.");
  status.textContent = failure
    ? "PDF generated locally, but preview failed. Open or download the new PDF below."
    : `Generated ${bytes.length.toLocaleString()} bytes locally. ${preview.childElementCount} page(s) previewed. Download or open this PDF.`;
  if (summary) status.textContent += ` ${summary}`;
  commitSource(
    args[0],
    source,
    args,
    `${bytes.length.toLocaleString()} bytes · ${failure ? "Preview unavailable" : `${preview.childElementCount} page(s)`}${summary ? ` · ${summary}` : ""}`,
  );
}

function publishPdf(id: string, bytes: Uint8Array): void {
  const previous = blobUrl;
  blobUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  download.href = blobUrl;
  download.download = `updf-${id}.pdf`;
  open.href = blobUrl;
  actions.hidden = false;
  if (previous) URL.revokeObjectURL(previous);
}

function scheduleUpdate(): void {
  invalidate();
  form.setAttribute("aria-busy", "true");
  pending(!!blobUrl);
  timer = setTimeout(() => void renderExample(), 300);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void renderExample();
});
selection.addEventListener("change", () => {
  showDemo();
  void renderExample();
});
title.addEventListener("input", scheduleUpdate);
for (const id of [
  "rich-controls",
  "flow-controls",
  "table-controls",
  "block-controls",
  "mixed-controls",
  "branding-controls",
]) {
  element(id, HTMLFieldSetElement).addEventListener("input", scheduleUpdate);
}
element("reset-demo", HTMLButtonElement).addEventListener("click", () => {
  for (const field of Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"))) {
    if (field.closest("fieldset")?.disabled) continue;
    if (field instanceof HTMLInputElement) {
      field.value = field.defaultValue;
      field.checked = field.defaultChecked;
    } else {
      field.selectedIndex = Array.from(field.options).findIndex((option) => option.defaultSelected);
      if (field.selectedIndex < 0) field.selectedIndex = 0;
    }
  }
  showDemo();
  void renderExample();
});
window.addEventListener("pagehide", () => {
  disposed = true;
  invalidate();
  clearOutput();
});
window.addEventListener("pageshow", () => {
  if (!disposed) return;
  disposed = false;
  void renderExample();
});
let previewWidth = 0;
const resize = new ResizeObserver(() => {
  const width = preview.clientWidth;
  if (!width || width === previewWidth) return;
  const previous = previewWidth;
  previewWidth = width;
  if (previous && !disposed) scheduleUpdate();
});
resize.observe(preview);
showDemo();
void renderExample();

for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-local]"))) {
  link.href = `${import.meta.env.BASE_URL}${link.dataset.local}`;
}
