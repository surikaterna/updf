import { DocumentError } from "@updf/core";
import { blockControls } from "./block-controls.js";
import { demoId, demos, generate } from "./demos.js";
import { flowControls } from "./flow-controls.js";
import { mixedControls } from "./mixed-controls.js";
import { richControls } from "./rich-controls.js";
import { tableControls } from "./table-controls.js";
import "./style.css";

function element<T extends HTMLElement>(id: string, type: new (...args: never[]) => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Missing UI element: ${id}`);
  return found;
}

const form = element("demo-form", HTMLFormElement);
const selection = element("example", HTMLSelectElement);
const title = element("title", HTMLInputElement);
const source = element("source", HTMLElement);
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

function showSource(): void {
  const id = demoId(selection.value);
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
  source.textContent =
    id === "svg" ||
    id === "flow" ||
    id === "tables" ||
    id === "blocks" ||
    id === "mixed" ||
    id === "rows" ||
    id === "rows-overflow"
      ? `Loading optional ${id} adapter and source…`
      : demos[id].source;
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
  status.textContent = blobUrl ? "Updating… Previous PDF remains shown and linked." : "Generating…";
  output.hidden = false;
  try {
    const id = demoId(selection.value);
    const result = await generate(
      id,
      title.value,
      id === "rich" ? richControls(form) : undefined,
      id === "flow" ? flowControls(form) : undefined,
      id === "tables" ? tableControls(form) : undefined,
      id === "blocks" ? blockControls(form) : undefined,
      id === "mixed" ? mixedControls(form) : undefined,
    );
    if (current !== generation) return;
    source.textContent = result.source;
    await renderOutput(current, id, result.bytes, result.summary);
  } catch (error) {
    if (current === generation) {
      status.textContent = `${readableError(error)}${blobUrl ? " Previous PDF remains shown and linked." : ""}`;
      output.hidden = !blobUrl;
    }
  } finally {
    if (current === generation) {
      form.setAttribute("aria-busy", "false");
    }
  }
}

async function renderOutput(current: number, id: string, bytes: Uint8Array, summary?: string): Promise<void> {
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
  publishPdf(id, bytes);
  preview.replaceChildren(pages ?? "Canvas preview unavailable. Open or download this PDF instead.");
  status.textContent = failure
    ? "PDF generated locally, but preview failed. Open or download the new PDF below."
    : `Generated ${bytes.length.toLocaleString()} bytes locally. ${preview.childElementCount} page(s) previewed. Download or open the PDF below.`;
  if (summary) status.textContent += ` ${summary}`;
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
  status.textContent = blobUrl ? "Updating… Previous PDF remains shown and linked." : "Waiting for input…";
  timer = setTimeout(() => void renderExample(), 300);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void renderExample();
});
selection.addEventListener("change", () => {
  showSource();
  void renderExample();
});
title.addEventListener("input", scheduleUpdate);
for (const id of ["rich-controls", "flow-controls", "table-controls", "block-controls", "mixed-controls"]) {
  element(id, HTMLFieldSetElement).addEventListener("input", scheduleUpdate);
}
element("reset-demo", HTMLButtonElement).addEventListener("click", () => {
  form.reset();
  showSource();
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
showSource();
void renderExample();

for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-local]"))) {
  link.href = `${import.meta.env.BASE_URL}${link.dataset.local}`;
}
