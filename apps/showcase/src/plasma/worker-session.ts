import { type PDFDocumentLoadingTask, PDFWorker, type RenderTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export class WorkerSession {
  readonly native = new Worker(workerUrl, { type: "module" });
  readonly abort = new AbortController();
  readonly ready: Promise<PDFWorker>;
  worker?: PDFWorker;
  loading: PDFDocumentLoadingTask | undefined;
  task: RenderTask | undefined;
  private disposal?: Promise<void>;
  private stopped = false;
  private readonly cleanups = new WeakMap<PDFDocumentLoadingTask, Promise<void>>();

  constructor() {
    this.ready = this.initialize();
  }

  private async initialize(): Promise<PDFWorker> {
    await new Promise<void>((resolve, reject) => {
      const listeners = new AbortController();
      const timer = setTimeout(() => finish(new Error("PDF worker readiness timed out")), 10000);
      const finish = (error?: Error) => {
        clearTimeout(timer);
        listeners.abort();
        if (error) reject(error);
        else resolve();
      };
      this.abort.signal.addEventListener("abort", () => finish(new Error("Plasma cancelled")), {
        signal: listeners.signal,
      });
      this.native.addEventListener("error", () => finish(new Error("PDF worker failed to load")), {
        signal: listeners.signal,
      });
      this.native.addEventListener(
        "message",
        (event: MessageEvent) => {
          if (
            event.data?.sourceName === "worker" &&
            event.data?.targetName === "main" &&
            event.data?.action === "ready"
          )
            finish();
        },
        { signal: listeners.signal },
      );
    });
    if (this.abort.signal.aborted) throw new Error("Plasma cancelled");
    this.worker = PDFWorker.create({ port: this.native });
    await this.worker.promise;
    return this.worker;
  }

  dispose(): Promise<void> {
    if (this.disposal) return this.disposal;
    this.abort.abort();
    this.task?.cancel();
    if (!this.loading) {
      this.stopWorker();
      this.disposal = Promise.resolve();
    } else {
      this.disposal = this.cleanDocument(this.loading)
        .catch(() => {})
        .finally(() => this.stopWorker());
    }
    return this.disposal;
  }

  cleanDocument(loading: PDFDocumentLoadingTask): Promise<void> {
    let cleanup = this.cleanups.get(loading);
    if (!cleanup) {
      // Bound production cleanup too: playback cannot dispose until produce settles.
      cleanup = boundedCleanup(loading.destroy(), () => this.stopWorker());
      this.cleanups.set(loading, cleanup);
    }
    return cleanup;
  }

  private stopWorker(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.abort.abort();
    this.task?.cancel();
    this.worker?.destroy();
    this.native.terminate();
  }
}

function boundedCleanup(cleanup: Promise<void>, stop: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (success: boolean, error?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (success) resolve();
      else reject(error);
    };
    const timer = setTimeout(() => {
      stop();
      finish(false, new Error("PDF document cleanup timed out; plasma worker terminated"));
    }, 1000);
    void cleanup.then(
      () => finish(true),
      (error: unknown) => finish(false, error),
    );
  });
}
