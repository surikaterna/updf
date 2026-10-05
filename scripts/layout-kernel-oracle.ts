import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolveWidths } from "@updf/layout-kernel";

type Resolver = (input: unknown, path?: string) => unknown;
function randomSource() {
  let state = 0x51ceab;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}
function invalid(index: number): unknown {
  const getter = {
    get weight() {
      throw new Error("Getter executed");
    },
  };
  const tracks = [getter];
  const cases: unknown[] = [
    null,
    { availableWidth: 10, tracks: [] },
    { availableWidth: 10, tracks: [0] },
    { availableWidth: 10, tracks: [11] },
    { availableWidth: 10, tracks: [getter] },
    { availableWidth: 10, tracks, maxTracks: 0 },
    { availableWidth: Infinity, tracks: [1] },
    { availableWidth: 10, tracks: [{ weight: 1, min: 5, max: 4 }] },
    { availableWidth: 10, tracks: [1], "bad/key~": 1 },
    { availableWidth: 10, tracks: [1], maxTracks: -1 },
    { availableWidth: 10, tracks: [1], gap: undefined },
    { availableWidth: 10, tracks: [1], maxTracks: "1" },
  ];
  return cases[index % cases.length];
}
export function oracle(resolve: Resolver) {
  const random = randomSource();
  const records: unknown[] = [];
  for (let i = 0; i < 3000; i++) {
    const scale = [Number.MIN_VALUE, 1e-300, 0.1, 1, 1e100, 1e300][i % 6] ?? 1;
    const availableWidth = scale * (10 + Math.floor(random() * 100));
    const tracks = Array.from({ length: 1 + Math.floor(random() * 5) }, (_, j) =>
      j % 3 === 0
        ? scale
        : { weight: (1 + Math.floor(random() * 9)) * scale, min: scale, ...(j % 2 ? { max: 8 * scale } : {}) },
    );
    const input = i % 5 === 0 ? invalid(i / 5) : { availableWidth, tracks, gap: i % 2 ? scale : 0 };
    try {
      records.push(resolve(input, "/oracle"));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message === "Getter executed") throw error;
      const diagnostic = "diagnostics" in error ? (error.diagnostics as readonly unknown[])[0] : error;
      const { code, path, message } = diagnostic as { code: string; path: string; message: string };
      records.push({ code, path, message });
    }
  }
  assert.equal(records.length, 3000);
  return { count: records.length, sha256: createHash("sha256").update(JSON.stringify(records)).digest("hex") };
}
if (process.argv[1]?.endsWith("layout-kernel-oracle.ts")) console.log(JSON.stringify(oracle(resolveWidths)));
