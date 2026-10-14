import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { render } from "../../../tests/fixtures/text-options.js";
import { decorationFixture, nestedFixture, rowFixture } from "./flow-runtime-host-fixtures.js";
import { saveProvenance } from "./flow-runtime-provenance.js";

const hash = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");

const baseline = {
  nested: {
    nativeHash: "abb049b2c0f69016069024b204daa569e6d1e47ca6afcc3c380a5cc80ea45be2",
    traceHash: "ab328aa21b0a37fc2fbee6a9cf53a957348dc32bc4579b1d8bb276e075e70792",
    pdfHash: "f130ac290a3ec168f73e6201d6cdad2e420607daddf1355cea8a540e6e75b659",
    pdfLength: 1959,
  },
  decoration: {
    nativeHash: "b111c55cc0eb035ed63bfea0c50f02af92e2d73030e4f4ad744da7566ec394f8",
    traceHash: "4e4ae3209c4ab659b49470323139431c4f9e80649f083d0e8a74d0e60b651075",
    pdfHash: "ed6723e063d21dde191a541bc80fb96c740cb270e83ad3d456a3c52b316ff8f9",
    pdfLength: 1102,
  },
  row: {
    nativeHash: "feaaf13132710f5a69163c644d9ab4a7024b92b4f9307d95179a08fcbf699d1e",
    traceHash: "b00c21b5b919f3b848f68b02c097785d7edcf550181eb116c0340ea112052590",
    pdfHash: "5cf747a0c1a450e959b60bdd5d94284f9029c27bc29080dc78886d4c56a8f672",
    pdfLength: 1030,
  },
};

test("real host traces, native placements/output and PDF bytes have an exact pre-extraction baseline", () => {
  const evidence = Object.fromEntries(
    Object.entries({ nested: nestedFixture, decoration: decorationFixture, row: rowFixture }).map(([name, fixture]) => {
      const { result, trace } = fixture(),
        repeated = fixture();
      const pdf = render(result.document);
      assert.deepEqual(repeated, { result, trace });
      assert.deepEqual(render(repeated.result.document), pdf);
      return [
        name,
        {
          trace,
          result,
          nativeHash: hash(JSON.stringify(result)),
          traceHash: hash(JSON.stringify(trace)),
          pdfHash: hash(pdf),
          pdfLength: pdf.length,
          pdfBase64: Buffer.from(pdf).toString("base64"),
        },
      ];
    }),
  );
  const fingerprints = Object.fromEntries(
    Object.entries(evidence).map(([name, value]) => [
      name,
      { nativeHash: value.nativeHash, traceHash: value.traceHash, pdfHash: value.pdfHash, pdfLength: value.pdfLength },
    ]),
  );
  // These goldens freeze c48b5a3, including repeated native deferrals and exact floating-point requests.
  assert.deepEqual(fingerprints, baseline);
  saveProvenance(evidence);
});
