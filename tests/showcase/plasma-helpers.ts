import type { Page } from "playwright";

export async function plasmaWorkers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const Native = Worker;
    Object.assign(window, { liveWorkers: 0, createdWorkers: 0 });
    window.Worker = class extends Native {
      private ended = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        Reflect.set(window, "liveWorkers", Reflect.get(window, "liveWorkers") + 1);
        Reflect.set(window, "createdWorkers", Reflect.get(window, "createdWorkers") + 1);
      }
      override terminate(): void {
        if (!this.ended) Reflect.set(window, "liveWorkers", Reflect.get(window, "liveWorkers") - 1);
        this.ended = true;
        super.terminate();
      }
    };
  });
}

export async function playing(page: Page, frames = 2): Promise<void> {
  await page.waitForFunction((count) => {
    const text = document.querySelector("#metrics")?.textContent;
    return text?.startsWith("{") && JSON.parse(text).presented >= count;
  }, frames);
}

export async function measurements(page: Page) {
  return JSON.parse(await page.locator("#metrics").innerText()) as {
    state: string;
    capacity: number;
    queue: number;
    inFlight: boolean;
    presented: number;
    produced: number;
    presentedFPS: number;
    pipelineFPS: number;
    activeMs: number;
    pipelineMs: number;
    prebufferMs: number;
    underruns: number;
    lateSlots: number;
    index: number;
    generationMeanMs: number;
    rasterMeanMs: number;
  };
}

export async function pixels(page: Page, size = { width: 320, height: 200 }): Promise<number[]> {
  return page.evaluate(({ width, height }) => {
    const canvas = document.querySelector("#screen canvas");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Missing canvas");
    if (canvas.width !== 320 || canvas.height !== 200) throw new Error("Unexpected plasma canvas dimensions");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing context");
    return Array.from(context.getImageData(0, 0, width, height).data);
  }, size);
}
