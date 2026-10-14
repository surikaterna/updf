import { render } from "@updf/core";
import type { PathCommand } from "@updf/core/painting";
import { h, lower } from "@updf/core/vdom";
import type { QRMatrix } from "../../packages/barcodes/src/qr-encoder/encoder.js";

function rectangle(x: number, y: number, width: number, unit: number): PathCommand[] {
  return [
    { type: "move", x, y },
    { type: "line", x: x + width, y },
    { type: "line", x: x + width, y: y + unit },
    { type: "line", x, y: y + unit },
    { type: "close" },
  ];
}

/** Test/measurement host: native vectors, four white quiet modules, no encoder-specific rendering shortcut. */
export function vectorPDF(matrix: QRMatrix, unit = 2): Uint8Array {
  const commands: PathCommand[] = [];
  for (let y = 0; y < matrix.size; y++) {
    let x = 0;
    while (x < matrix.size) {
      const start = x;
      if (!matrix.cells[y * matrix.size + x++]) continue;
      while (x < matrix.size && matrix.cells[y * matrix.size + x]) x++;
      commands.push(...rectangle((start + 4) * unit, (y + 4) * unit, (x - start) * unit, unit));
    }
  }
  const size = (matrix.size + 8) * unit;
  const page = h("page", { width: size, height: size, children: h("path", { commands }) });
  return render(lower(h("document", { version: 1, children: page })));
}
