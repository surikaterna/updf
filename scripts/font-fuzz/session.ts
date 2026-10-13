import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

/** One outstanding case at a time; the watchdog lives outside the synchronous parser. */
export class Session {
  private readonly child: ChildProcess;
  private closed = false;
  private failure: Error | undefined;
  private stderr = "";
  constructor(id: string, cache: string, worker = new URL("./worker.ts", import.meta.url)) {
    this.child = fork(fileURLToPath(worker), [id, cache], {
      execArgv: ["--max-old-space-size=256", "--import", "tsx"],
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    this.child.stderr?.on("data", (bytes: Buffer) => {
      this.stderr = (this.stderr + bytes.toString()).slice(-8192);
    });
    this.child.on("error", (error) => {
      this.failure = error;
    });
    this.child.on("close", (code, signal) => {
      this.closed = true;
      this.failure ??= new Error(`Worker exited (${code ?? signal}): ${this.stderr}`);
    });
  }
  receive(timeoutMs: number, command?: { seed: number; index: number; expectedSha256?: string }): Promise<unknown> {
    if (this.closed || this.failure) return Promise.reject(this.failure ?? new Error("Worker closed"));
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.child.off("message", message);
        this.child.off("exit", exited);
        this.child.off("error", failed);
      };
      const message = (value: unknown) => {
        cleanup();
        resolve(value);
      };
      const failed = (error: Error) => {
        cleanup();
        reject(error);
      };
      const exited = (code: number | null, signal: string | null) =>
        failed(new Error(`Worker exited (${code ?? signal}): ${this.stderr}`));
      const timer = setTimeout(() => {
        this.child.kill("SIGKILL");
        failed(new Error(`Worker deadline exceeded (${timeoutMs} ms)`));
      }, timeoutMs);
      this.child.once("message", message);
      this.child.once("exit", exited);
      this.child.once("error", failed);
      if (command)
        this.child.send(command, (error) => {
          if (error) failed(error);
        });
    });
  }
  async stop(): Promise<void> {
    if (this.closed) return;
    const closed = new Promise<void>((resolve) => this.child.once("close", () => resolve()));
    this.child.kill("SIGKILL");
    await closed;
  }
}
