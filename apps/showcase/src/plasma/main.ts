import { Playback } from "./controller.js";
import type { PlasmaFrame } from "./renderer.js";
import "./styles.css";

function element<T extends HTMLElement>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing ${selector}`);
  return value;
}
const play = element<HTMLButtonElement>("#play");
const pause = element<HTMLButtonElement>("#pause");
const buffer = element<HTMLInputElement>("#buffer");
const screen = element("#screen");
const status = element("#status");
const metrics = element("#metrics");
let session: Playback<PlasmaFrame> | undefined;
let id = 0;
let loading = false;
let generationMs = 0;
let rasterMs = 0;

function update(): void {
  const data = session?.metrics();
  play.disabled = loading || (!!session && data?.state !== "paused");
  pause.disabled = !loading && data?.state !== "playing" && data?.state !== "prefilling";
  buffer.disabled = loading || !!session;
  status.textContent = loading
    ? "Loading pipeline…"
    : session?.error
      ? `Error: ${session.error}. Reset to retry.`
      : `${data?.state ?? "Stopped"}. Target 25 fps; explicit Play to resume.`;
  metrics.textContent = data
    ? JSON.stringify(
        {
          targetFPS: 25,
          ...data,
          generationMeanMs: generationMs / Math.max(data.presented, 1),
          rasterMeanMs: rasterMs / Math.max(data.presented, 1),
        },
        null,
        2,
      )
    : "Target: 25 fps · queue: 0 · presented: 0";
  if (data?.state === "error") screen.replaceChildren();
}

async function start(): Promise<void> {
  if (session?.state === "paused") {
    session.resume();
    return;
  }
  if (session || loading) return;
  if (!buffer.checkValidity()) {
    buffer.reportValidity();
    return;
  }
  const current = ++id;
  const capacity = buffer.valueAsNumber;
  loading = true;
  update();
  try {
    const { PlasmaRenderer } = await import("./renderer.js");
    if (current !== id) return;
    session = new Playback(
      capacity,
      new PlasmaRenderer(),
      (frame) => {
        screen.replaceChildren(frame.canvas);
        generationMs += frame.generationMs;
        rasterMs += frame.rasterMs;
      },
      update,
    );
    loading = false;
    session.start();
    update();
  } catch (error) {
    if (current !== id) return;
    loading = false;
    update();
    status.textContent = `Error: ${error instanceof Error ? error.message : String(error)}. Reset to retry.`;
  }
}

function reset(): void {
  id += 1;
  loading = false;
  session?.stop();
  session = undefined;
  generationMs = 0;
  rasterMs = 0;
  screen.replaceChildren();
  update();
}

play.addEventListener("click", () => {
  void start();
});
pause.addEventListener("click", () => {
  if (loading) reset();
  else session?.pause();
});
element("#reset").addEventListener("click", reset);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  if (loading) reset();
  else session?.pause();
});
window.addEventListener("pagehide", reset);
window.addEventListener("pageshow", update);
update();
