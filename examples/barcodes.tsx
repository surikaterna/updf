/** @jsxImportSource @updf/core */
import { Code39 } from "@updf/barcodes/code39";
import { QRCode } from "@updf/barcodes/qr";
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";

/** Fixed-coordinate, font-free example; module dimensions are points, never stretch-to-fit widths. */
export function barcodeExample(): Uint8Array {
  return render(
    lower(
      <document version={1}>
        <page width={480} height={360}>
          <Code39 value="SHIP-12345" x={36} y={36} moduleWidth={1} barHeight={48} maxWidth={408} />
          <Code39 value="CHECK-43" x={36} y={110} moduleWidth={1} barHeight={32} checksum="mod43" />
          <QRCode value="https://example.com/ship/12345" x={36} y={180} moduleSize={3} />
          <QRCode value="UPDF optional QR" x={240} y={180} moduleSize={3} errorCorrection="H" />
        </page>
      </document>,
    ),
  );
}
