import { DocumentError } from "@updf/core";
import { demoId, demos, generate } from "./demos.js";
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
const preview = element("preview", HTMLIFrameElement);
const download = element("download", HTMLAnchorElement);
const open = element("open", HTMLAnchorElement);
const submit = element("generate", HTMLButtonElement);
let blobUrl: string | undefined;
let generation = 0;

function clearOutput(): void {
  preview.removeAttribute("src");
  download.removeAttribute("href");
  open.removeAttribute("href");
  output.hidden = true;
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = undefined;
}

function invalidate(): void {
  generation += 1;
  clearOutput();
  submit.disabled = false;
  form.setAttribute("aria-busy", "false");
  status.textContent = "Ready. Generate a PDF; nothing leaves this browser.";
}

function showSource(): void {
  const id = demoId(selection.value);
  source.textContent =
    id === "svg" ? "SVG adapter and source load only when you generate this example." : demos[id].source;
}

function readableError(error: unknown): string {
  if (error instanceof DocumentError) {
    return error.diagnostics.map(({ code, path, message }) => `${code} at ${path}: ${message}`).join("\n");
  }
  return `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}. Try a core example or reload.`;
}

async function renderExample(): Promise<void> {
  invalidate();
  const current = generation;
  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  status.textContent = "Generating…";
  try {
    const id = demoId(selection.value);
    const result = await generate(id, title.value);
    if (current !== generation) return;
    source.textContent = result.source;
    blobUrl = URL.createObjectURL(new Blob([new Uint8Array(result.bytes)], { type: "application/pdf" }));
    download.href = blobUrl;
    download.download = `updf-${id}.pdf`;
    open.href = blobUrl;
    preview.src = blobUrl;
    output.hidden = false;
    status.textContent = `Generated ${result.bytes.length.toLocaleString()} bytes locally. Download or open the PDF below.`;
  } catch (error) {
    if (current === generation) status.textContent = readableError(error);
  } finally {
    if (current === generation) {
      submit.disabled = false;
      form.setAttribute("aria-busy", "false");
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void renderExample();
});
selection.addEventListener("change", () => {
  invalidate();
  showSource();
});
title.addEventListener("input", invalidate);
element("reset-demo", HTMLButtonElement).addEventListener("click", () => {
  form.reset();
  invalidate();
  showSource();
});
window.addEventListener("pagehide", invalidate);
showSource();

for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-local]"))) {
  link.href = `${import.meta.env.BASE_URL}${link.dataset.local}`;
}
