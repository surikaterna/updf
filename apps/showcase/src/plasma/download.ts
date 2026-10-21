interface DownloadURL {
  timer: ReturnType<typeof setTimeout>;
  retired: boolean;
}

export class FrameDownload {
  private readonly urls = new Map<string, DownloadURL>();

  constructor(private readonly changed: () => void) {}

  get available(): boolean {
    return this.urls.size < 8;
  }

  save(index: number, generate: (index: number) => Uint8Array): void {
    if (!this.available) return;
    const bytes = generate(index);
    const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "application/pdf" }));
    // Downloads consume the URL asynchronously; retain it beyond anchor activation.
    const timer = setTimeout(() => this.release(url), 30000);
    this.urls.set(url, { timer, retired: false });
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plasma-frame-${index}.pdf`;
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      this.changed();
    }
  }

  retire(): void {
    for (const [url, entry] of this.urls) {
      if (entry.retired) continue;
      clearTimeout(entry.timer);
      entry.retired = true;
      entry.timer = setTimeout(() => this.release(url), 1000);
    }
  }

  dispose(): void {
    for (const url of this.urls.keys()) this.release(url);
  }

  private release(url: string): void {
    const entry = this.urls.get(url);
    if (!entry) return;
    clearTimeout(entry.timer);
    URL.revokeObjectURL(url);
    this.urls.delete(url);
    this.changed();
  }
}
