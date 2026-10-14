import assert from "node:assert/strict";
import test from "node:test";
import { barcodeProfile, profiles } from "../../scripts/consumer/barcode-cost.js";

test("Emitted barcode profiles keep QR/decoder/SVG optional and execute the real dynamic consumers", async () => {
  for (const name of Object.keys(profiles) as (keyof typeof profiles)[]) {
    const result = await barcodeProfile(name);
    const module = await import(`data:text/javascript;base64,${Buffer.from(result.code).toString("base64")}`);
    if (name.endsWith("Geometry")) {
      const encode = name === "code39Geometry" ? module.code39 : module.qrCode;
      assert.notDeepEqual(encode("A"), encode("ABC"));
    } else {
      const bytes = module.pdf("A");
      assert.ok(bytes instanceof Uint8Array && bytes.length > 100);
      if (name !== "core") assert.notDeepEqual(bytes, module.pdf("ABC"));
    }
    console.log(`${name}: ${result.raw} minified bytes, ${result.gzip} gzip bytes`);
  }
});
