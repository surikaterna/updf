import { getDocument, type PDFDocumentLoadingTask } from "pdfjs-dist";
import { HEIGHT, plasmaPDF, WIDTH } from "./frame.js";
import { WorkerSession } from "./worker-session.js";

export interface PlasmaFrame {
  readonly index: number;
  readonly canvas: HTMLCanvasElement;
  readonly generationMs: number;
  readonly rasterMs: number;
  release(): void;
}

export class PlasmaRenderer {
  private readonly session = new WorkerSession();
  private activeCanvas: HTMLCanvasElement | undefined;

  async produce(index: number): Promise<PlasmaFrame> {
    const worker = await this.session.ready;
    if (this.session.abort.signal.aborted) throw new Error("Plasma cancelled");
    const started = performance.now();
    const bytes = plasmaPDF(index);
    const generationMs = performance.now() - started;
    const canvas = document.createElement("canvas");
    this.activeCanvas = canvas;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Amiga-style plasma rendered from a vector PDF");
    const loading = getDocument({ data: bytes, worker });
    this.session.loading = loading;
    let renderingFailed = false;
    try {
      const pdf = await loading.promise;
      if (pdf.numPages !== 1) throw new Error("Expected one plasma PDF page");
      const page = await pdf.getPage(1);
      this.session.task = page.render({ canvas, viewport: page.getViewport({ scale: 1 }) });
      await this.session.task.promise;
      page.cleanup();
      return {
        index,
        canvas,
        generationMs,
        rasterMs: performance.now() - started - generationMs,
        release: () => {
          canvas.width = 0;
          canvas.height = 0;
        },
      };
    } catch (error) {
      renderingFailed = true;
      canvas.width = 0;
      canvas.height = 0;
      throw error;
    } finally {
      await this.finishDocument(loading, canvas, renderingFailed);
    }
  }

  private async finishDocument(
    loading: PDFDocumentLoadingTask,
    canvas: HTMLCanvasElement,
    renderingFailed: boolean,
  ): Promise<void> {
    try {
      // Supplying an external PDFWorker means document destroy does not destroy it.
      await this.session.cleanDocument(loading);
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      // A cleanup timeout must not replace the original rendering diagnostic.
      if (!renderingFailed) throw error;
    } finally {
      if (this.activeCanvas === canvas) this.activeCanvas = undefined;
      if (this.session.loading === loading) this.session.loading = undefined;
      this.session.task = undefined;
    }
  }

  dispose(): Promise<void> {
    if (this.activeCanvas) {
      this.activeCanvas.width = 0;
      this.activeCanvas.height = 0;
      this.activeCanvas = undefined;
    }
    return this.session.dispose();
  }
}
