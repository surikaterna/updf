import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const updfBaseline = "0bf8812b6c02c9e7114b75db02468ca4fe6f6147";
export const baselinePaths = [
  ...["binary64", "width-resolver", "width-distribution", "width-input", "width-types"].map(
    (name) => `packages/layout/src/${name}.ts`,
  ),
  ...["intervals.ts", "terminal.ts", "bundle.mjs", "run.mjs"].map((name) => `scripts/tui-layout-proof/${name}`),
];

// Only historical comparison needs uPDF Git; archives/current proofs must not discover a parent repo.
export function verifyBaseline(root = fileURLToPath(new URL("../../", import.meta.url))) {
  try {
    const expected = realpathSync(root);
    const git = (...args) =>
      execFileSync("git", ["-C", expected, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    if (realpathSync(git("rev-parse", "--show-toplevel")) !== expected) throw new Error("uPDF Git root mismatch");
    git("cat-file", "-e", `${updfBaseline}^{commit}`);
    for (const path of baselinePaths) {
      if (git("cat-file", "-t", `${updfBaseline}:${path}`) !== "blob")
        throw new Error(`Missing baseline blob: ${path}`);
    }
  } catch (cause) {
    throw new Error(
      `Historical TUI baseline requires the actual uPDF repository/worktree root at ${root}, with commit ${updfBaseline} and all nine baseline source blobs locally available. Use a full-history checkout containing that revision; archives and shallow checkouts without it cannot run --baseline. For current profiling, run profile.mjs without --baseline. No history is fetched automatically.`,
      { cause },
    );
  }
}
