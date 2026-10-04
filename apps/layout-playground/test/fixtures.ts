import type { Controls } from "../src/boxes.js";

export const DEFAULT_TEXT =
  "The real kernel allocates boxes. This paragraph is measured once at the selected width, then its prepared lines become legal fragmentation units.\n\nAn atomic row follows the paragraph. It moves as one unit, never splitting its children.";
export const controls: Controls = Object.freeze({
  preset: "pdf",
  paginate: true,
  width: 260,
  height: 108,
  gap: 8,
  padding: 8,
  direction: "row",
  align: "start",
  pageCap: 8,
  text: DEFAULT_TEXT,
});
