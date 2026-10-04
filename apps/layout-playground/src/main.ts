import type { Controls } from "./boxes.js";
import { compute } from "./compute.js";
import { errorDescription } from "./error.js";
import { display, setText } from "./inspect.js";
import { type Projection, project } from "./projection.js";
import "./style.css";

const form = document.querySelector<HTMLFormElement>("#controls");
const download = document.querySelector<HTMLButtonElement>("#download");
if (!form || !download) throw new Error("Missing controls");
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let accepted: Projection | undefined;
let bytes: Uint8Array<ArrayBuffer> | undefined;
let selected = "";

function readControls(): Controls {
  if (!form) throw new Error("Missing form");
  const data = new FormData(form);
  const string = (key: string) => String(data.get(key) ?? "");
  const number = (key: string) => (string(key) === "" ? Number.NaN : Number(string(key)));
  return {
    width: number("width"),
    height: number("height"),
    gap: number("gap"),
    padding: number("padding"),
    pageCap: number("pageCap"),
    direction: (string("direction") || "row") as Controls["direction"],
    align: (string("align") || "start") as Controls["align"],
    text: string("text"),
    preset: string("preset") as Controls["preset"],
    paginate: data.has("paginate"),
  };
}

function select(id: string): void {
  selected = id;
  if (accepted) display(accepted, selected, select);
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("#selection button")).find(
    (element) => element.getAttribute("aria-pressed") === "true",
  );
  button?.focus({ preventScroll: true });
}

async function update(token: number): Promise<void> {
  try {
    const controls = readControls();
    const snapshot = await compute(controls);
    if (token !== generation) return;
    const projection = project(snapshot);
    let nextBytes: Uint8Array<ArrayBuffer> | undefined;
    if (snapshot.pdf && snapshot.status === "done") {
      const { exportProjection } = await import("./pdf.js");
      if (token !== generation) return;
      nextBytes = exportProjection(projection);
    }
    if (token !== generation) return;
    accepted = projection;
    bytes = nextBytes;
    display(projection, selected, select);
    setText(
      "#status",
      `${snapshot.status === "done" ? "Complete" : `INCOMPLETE (${snapshot.status})`} — ${snapshot.regions.length} selected region(s). ${snapshot.pdf ? "PDF font: Helvetica 14pt / line height 18pt." : "Boxes only; no PDF runtime."}`,
    );
    if (download) download.disabled = !bytes;
  } catch (error) {
    if (token !== generation) return;
    setText(
      "#status",
      `Input / computation error: ${errorDescription(error)}. Last valid geometry retained; download disabled.`,
    );
  }
}

function schedule(): void {
  const token = ++generation;
  bytes = undefined;
  if (download) download.disabled = true;
  const direction = form?.querySelector<HTMLSelectElement>("[name=direction]");
  const align = form?.querySelector<HTMLSelectElement>("[name=align]");
  const preset = form?.querySelector<HTMLSelectElement>("[name=preset]");
  if (align) {
    align.disabled = direction?.value === "column" && preset?.value === "boxes";
    if (align.disabled) align.value = "start";
  }
  if (direction) {
    direction.disabled = preset?.value === "pdf";
    if (direction.disabled) direction.value = "row";
  }
  clearTimeout(timer);
  setText("#status", "Computing; last valid geometry retained until the new snapshot is accepted.");
  timer = setTimeout(() => void update(token), 100);
}

form.addEventListener("input", schedule);
form.addEventListener("submit", (event) => event.preventDefault());
download.onclick = () => {
  if (!bytes) return;
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "layout-snapshot.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
schedule();
