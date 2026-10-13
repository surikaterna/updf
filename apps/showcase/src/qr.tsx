/** @jsxImportSource @updf/core */
import { QRCode, qrCode } from "@updf/barcodes/qr";
import { type QrControls, qrDefaults, validateBarcodeControls } from "./barcode-controls.js";
import { barcodePage } from "./barcode-page.js";

export function qrDemo(title: string, controls: QrControls = qrDefaults) {
  validateBarcodeControls(controls);
  const options = { moduleSize: controls.moduleSize, errorCorrection: controls.errorCorrection };
  const symbol = qrCode(controls.value, options);
  const summary = `QR ${controls.errorCorrection}; ${controls.value.length} ASCII bytes; ${symbol.width.toFixed(2)} × ${symbol.height.toFixed(2)} pt including four quiet modules; local encoder, no external request.`;
  const bytes = barcodePage(
    title,
    `QR Model 2 | correction ${controls.errorCorrection} | ${controls.moduleSize} pt modules`,
    <QRCode value={controls.value} {...options} x={24} y={138} maxWidth={432} />,
  );
  return { bytes, summary };
}
