import assert from "node:assert/strict";
import { test } from "node:test";
import { render } from "@updf/core";
import { document, flow, layout, page } from "@updf/layout";
import { jpeg, jpegProvider, prepareJpeg } from "@updf/jpeg";
import { nativeDocument } from "../../layout/src/native-vdom.js";
import { lower } from "@updf/core/vdom";
import { failure, fixture } from "./helpers.js";

test("fixed native Page and atomic FixedBlock flow preserve generic leaf placement and pixel-independent boxes", () => {
  const photo = prepareJpeg(fixture());
  const options = { resources: { photo }, providers: [jpegProvider()], limits: { pathCommands: 0 } };
  const leaf = jpeg("photo", { x: 0, y: 0, width: 60, height: 40 });
  const fixed = layout(document({ children: page({ size: { width: 100, height: 100 }, children: [leaf] }) }), options);
  assert.deepEqual(fixed.document.pages[0]?.children, [leaf]);
  assert.deepEqual(render(lower(nativeDocument(fixed.document), options), options), render(fixed.document, options));
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 100 },
        margins: { top: 20, right: 10, bottom: 20, left: 10 },
        children: [
          { type: "fixed", height: 40, children: [leaf] },
          { type: "fixed", height: 40, children: [leaf] },
        ],
      }),
    }),
    options,
  );
  assert.equal(result.document.pages.length, 2);
  const pdf = Buffer.from(render(result.document, options)).toString("latin1");
  assert.equal((pdf.match(/\/Subtype \/Image/g) ?? []).length, 1);
  assert.equal((pdf.match(/60 0 0 -40 0 40 cm/g) ?? []).length, 2);
  assert.equal((pdf.match(/1 0 0 1 10 20 cm/g) ?? []).length, 2);
  assert.equal(photo.metadata.width, 32);
});
test("fixed image blocks are atomic, not image-specific fragmented or resized", () => {
  const photo = prepareJpeg(fixture());
  const input = document({
    children: flow({
      pageSize: { width: 100, height: 100 },
      margins: { top: 20, right: 10, bottom: 20, left: 10 },
      children: [{ type: "fixed", height: 70, children: [jpeg("photo", { x: 0, y: 0, width: 60, height: 70 })] }],
    }),
  });
  failure(() => layout(input, { resources: { photo } }), "LAYOUT_OVERSIZED", "/document/children/body/0");
});
