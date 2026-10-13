/** @jsxImportSource @updf/core */
import { Code39, code39 } from "@updf/barcodes/code39";
import { type Code39Controls, code39Defaults, validateBarcodeControls } from "./barcode-controls.js";
import { barcodePage } from "./barcode-page.js";

export function code39Demo(title: string, controls: Code39Controls = code39Defaults) {
  validateBarcodeControls(controls);
  const options = {
    moduleWidth: controls.moduleWidth,
    barHeight: controls.barHeight,
    wideRatio: controls.wideRatio,
    checksum: controls.checksum,
  };
  const symbol = code39(controls.value, options);
  const summary = `Code 39; ${controls.value.length} payload characters; ${symbol.width.toFixed(2)} × ${symbol.height} pt including quiet zones; ${controls.checksum}.`;
  const bytes = barcodePage(
    title,
    `Code 39 | ratio ${controls.wideRatio}:1 | checksum ${controls.checksum}`,
    <Code39 value={controls.value} {...options} x={24} y={138} maxWidth={432} />,
  );
  return { bytes, summary };
}
