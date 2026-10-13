/** @jsxImportSource @updf/core */
import { Code39, code39 } from "@updf/barcodes/code39";
import { QRCode, qrCode } from "@updf/barcodes/qr";
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";

const dimensions = [code39("SHIP-123"), qrCode("https://example.com")];
export const output = render(
  lower(
    <document version={1}>
      <page width={500} height={400}>
        <Code39 value="SHIP-123" x={10} y={10} maxWidth={dimensions[0]!.width} />
        <QRCode value="https://example.com" x={10} y={100} maxWidth={dimensions[1]!.width} />
      </page>
    </document>,
  ),
);
if (output.length === 0) throw new Error("Empty barcode PDF");
