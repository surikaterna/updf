import { getDocument, type PDFDocumentLoadingTask, PDFWorker, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface Job {
  readonly worker: Worker;
  readonly initialization: AbortController;
  loading?: PDFDocumentLoadingTask;
  pdfWorker?: PDFWorker;
  task?: RenderTask;
  cancelled: boolean;
  disposal?: Promise<void>;
}

function dispose(job: Job): Promise<void> {
  if (job.disposal) return job.disposal;
  job.task?.cancel();
  job.initialization.abort();
  const stopWorker = () => {
    job.pdfWorker?.destroy();
    job.worker.terminate();
  };
  // Before readiness there is no PDF.js loading task to await: terminate immediately.
  if (job.loading) job.disposal = job.loading.destroy().finally(stopWorker);
  else {
    stopWorker();
    job.disposal = Promise.resolve();
  }
  return job.disposal;
}

async function initialize(job: Job, bytes: Uint8Array): Promise<PDFDocumentLoadingTask> {
  // Do not create a loading task until readiness: its destroy() would wait for setup.
  await workerReady(job);
  if (job.cancelled) throw new Error("Preview cancelled");
  job.pdfWorker = PDFWorker.create({ port: job.worker });
  // PDF.js transfers its input to the worker; preserve the caller's downloadable bytes.
  job.loading = getDocument({ data: new Uint8Array(bytes), worker: job.pdfWorker, useSystemFonts: true });
  return job.loading;
}

function workerReady(job: Job): Promise<void> {
  return new Promise((resolve, reject) => {
    const listeners = new AbortController();
    const finish = (error?: Error) => {
      listeners.abort();
      if (error) reject(error);
      else resolve();
    };
    job.initialization.signal.addEventListener("abort", () => finish(new Error("Preview cancelled")), {
      signal: listeners.signal,
    });
    job.worker.addEventListener("error", () => finish(new Error("PDF worker failed to load")), {
      signal: listeners.signal,
    });
    job.worker.addEventListener(
      "message",
      (event: MessageEvent) => {
        if (
          event.data?.sourceName === "worker" &&
          event.data?.targetName === "main" &&
          event.data?.action === "ready"
        ) {
          finish();
        }
      },
      { signal: listeners.signal },
    );
  });
}

export class CanvasPreview {
  private job: Job | undefined;

  cancel(): void {
    if (!this.job) return;
    this.job.cancelled = true;
    // The render promise also awaits disposal; cancellation must not leave an unhandled rejection.
    void dispose(this.job).catch(() => {});
    this.job = undefined;
  }

  async render(bytes: Uint8Array, width: number): Promise<DocumentFragment | undefined> {
    this.cancel();
    const job: Job = {
      worker: new Worker(workerUrl, { type: "module" }),
      initialization: new AbortController(),
      cancelled: false,
    };
    this.job = job;
    const pages = document.createDocumentFragment();
    try {
      const loading = await initialize(job, bytes);
      const pdf = await loading.promise;
      for (let number = 1; number <= pdf.numPages; number += 1) {
        if (job.cancelled) return;
        const page = await pdf.getPage(number);
        if (job.cancelled) return;
        const natural = page.getViewport({ scale: 1 });
        const scale = Math.min(width / natural.width, 1.5);
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(viewport.width, viewport.height, number);
        job.task = page.render({ canvas, viewport, transform: [pixelRatio(), 0, 0, pixelRatio(), 0, 0] });
        await job.task.promise;
        page.cleanup();
        pages.append(canvas);
      }
      return job.cancelled ? undefined : pages;
    } catch (error) {
      if (!job.cancelled) throw error;
      return undefined;
    } finally {
      await dispose(job);
      if (this.job === job) this.job = undefined;
    }
  }
}

function pixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 3);
}

function createCanvas(width: number, height: number, number: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * pixelRatio());
  canvas.height = Math.ceil(height * pixelRatio());
  canvas.style.width = `${width}px`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `PDF page ${number}`);
  return canvas;
}
