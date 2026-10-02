import { paintingDemo } from "./painting.js";
import paintingSource from "./painting.ts?raw";
import { templateDemo } from "./template.js";
import templateSource from "./template.tsx?raw";
import { textDemo } from "./text.js";
import textSource from "./text.ts?raw";

export const demos = {
  text: { source: textSource, render: textDemo },
  template: { source: templateSource, render: templateDemo },
  painting: { source: paintingSource, render: paintingDemo },
};

export type DemoId = keyof typeof demos | "svg";

export function demoId(value: string): DemoId {
  if (value === "text" || value === "template" || value === "painting" || value === "svg") return value;
  throw new Error("Unknown predefined example");
}

export async function generate(id: DemoId, title: string): Promise<{ bytes: Uint8Array; source: string }> {
  if (title.length > 40) throw new Error("Title must be at most 40 characters");
  if (id === "svg") {
    const { svgDemo, source } = await import("./optional.js");
    return { bytes: svgDemo(title), source };
  }
  return { bytes: demos[id].render(title), source: demos[id].source };
}
