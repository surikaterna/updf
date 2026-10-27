import { blockComponent, defineBlockAdapter } from "@updf/layout";
import { png } from "@updf/png";

// The visual uses the PNG resource owner; wrapping never inspects image pixels.
const adapter = defineBlockAdapter<{ width: number; height: number }>({
  name: "showcase.eevee",
  validate(value) {
    if (!value || typeof value !== "object") throw new Error("Expected image dimensions");
    const { width, height } = value as { width: number; height: number };
    if (![width, height].every((n) => Number.isFinite(n) && n > 0 && n <= 240))
      throw new Error("Image dimensions must be positive and at most 240pt");
    return { width, height };
  },
  measure({ width, height }) {
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width, height },
      next: () => ({ end: 1, height, nodes: [png("eevee", { x: 0, y: 0, width, height })] }),
    };
  },
});

export const EeveeImage = blockComponent(adapter);
export const eeveeAdapter = adapter;
