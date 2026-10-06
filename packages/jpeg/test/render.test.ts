import assert from "node:assert/strict";
import { test } from "node:test";
import { type DocumentDefinition, render, renderUnknown } from "@updf/core";
import { createOwnedResource, type OwnedResource } from "@updf/core/resources";
import { bind, h, lower } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { createTextService } from "@updf/text";
import { document, failure, fixture } from "./helpers.js";
import { imageTree } from "./jsx-fixture.js";
const binary = (bytes: Uint8Array): string => Buffer.from(bytes).toString("latin1");
const imageCount = (bytes: Uint8Array): number => (binary(bytes).match(/\/Subtype \/Image/g) ?? []).length;

test("exact compressed streams, pixel metadata vs point placement, immutable source and deterministic reuse", async () => {
  const source = fixture();
  const original = new Uint8Array(source);
  const photo = prepareJpeg(source);
  source.fill(0);
  const provider = jpegProvider();
  const options = { resources: { photo, alias: photo }, providers: [provider] };
  const input: DocumentDefinition = { version: 1, pages: [...document().pages, ...document("alias").pages] };
  const output = render(input, options);
  const pdf = binary(output);
  assert.equal(imageCount(output), 1);
  assert.equal((pdf.match(/\/Im1 Do/g) ?? []).length, 2);
  assert.ok(pdf.includes("60 0 0 40 10 40 cm\n/Im1 Do"));
  assert.ok(
    pdf.includes(
      "/Width 32 /Height 24 /BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /DCTDecode /DecodeParms << /ColorTransform 1 >>",
    ),
  );
  assert.ok(Buffer.from(output).includes(Buffer.from(original)));
  assert.deepEqual(render(input, options), output);
  const repeated = await Promise.all(Array.from({ length: 4 }, async () => render(input, options)));
  for (const result of repeated) assert.deepEqual(result, output);
  const distinct = { resources: { photo, alias: prepareJpeg(original) }, providers: [provider] };
  assert.equal(imageCount(render(input, distinct)), 2);
  failure(() => render(document(), { ...options, limits: { outputBytes: 100 } }), "LIMIT", "");
  assert.deepEqual(render(input, options), output);
});
test("gray has DeviceGray and no transform; aliases including prototype names are safe", () => {
  const photo = prepareJpeg(fixture("gray"));
  const resources = Object.assign(Object.create(null), { constructor: photo, __proto__: photo });
  const bytes = render(document("constructor"), { resources, providers: [jpegProvider()] });
  assert.ok(binary(bytes).includes("/ColorSpace /DeviceGray"));
  assert.ok(!binary(bytes).includes("/ColorTransform"));
  assert.equal(imageCount(bytes), 1);
});
test("missing, wrong owned handle, unclaimed and conflicting providers fail RESOURCE before serialization", () => {
  const photo = prepareJpeg(fixture());
  failure(() => render(document()), "RESOURCE", "/pages/0/children/0/resource");
  failure(() => render(document(), { resources: { photo } }), "RESOURCE", "/pages/0/children/0/resource");
  failure(
    () =>
      render(document(), { resources: { photo: createOwnedResource(photo.metadata) }, providers: [jpegProvider()] }),
    "RESOURCE",
    "/pages/0/children/0/resource",
  );
  failure(
    () => render(document(), { resources: { photo }, providers: [jpegProvider(), jpegProvider()] }),
    "RESOURCE",
    "/pages/0/children/0/resource",
  );
  const font = createHelvetica();
  failure(
    () => render(document(), { resources: { photo: font }, providers: [jpegProvider(), fontProvider(fontRuntime())] }),
    "RESOURCE",
    "/pages/0/children/0/resource",
  );
});
test("unique resourceBytes includes unused JPEG and fonts while aliases count once", () => {
  const source = fixture();
  const photo = prepareJpeg(source),
    other = prepareJpeg(source);
  const options = {
    resources: { photo, alias: photo },
    providers: [jpegProvider()],
    limits: { resourceBytes: source.length },
  };
  render(document(), options);
  failure(
    () => render(document(), { ...options, resources: { ...options.resources, unused: other } }),
    "LIMIT",
    "/resources/unused",
  );
  failure(
    () =>
      render(document(), {
        ...options,
        resources: { ...options.resources, unused: createOwnedResource({}, { byteLength: 1 }) },
      }),
    "LIMIT",
    "/resources/unused",
  );
  failure(
    () => render(document(), { ...options, limits: { resourceBytes: source.length - 1 } }),
    "LIMIT",
    "/resources/photo",
  );
});
test("native VDOM/bound primitive translation matches JSON; geometry and source origins remain strict", () => {
  const photo = prepareJpeg(fixture());
  const options = { resources: { photo }, providers: [jpegProvider()] };
  const Bound = bind("xObject", { resource: "photo", x: 0, y: 0, width: 60, height: 40 });
  const tree = h("document", {
    version: 1,
    children: h("page", { width: 100, height: 100, children: h("group", { x: 10, y: 20, children: h(Bound, {}) }) }),
  });
  assert.deepEqual(render(lower(tree, options), options), render(document(), options));
  assert.deepEqual(render(lower(imageTree(), options), options), render(document(), options));
  const bad = h("document", {
    version: 1,
    children: h("page", {
      width: 100,
      height: 100,
      children: h("xObject", { resource: "photo", x: 90, y: 0, width: 60, height: 40 }),
    }),
  });
  failure(() => lower(bad, options), "BOUNDS", "/tree/props/children/props/children/props");
  failure(() => lower(tree), "RESOURCE", "/tree/props/children/props/children/props/children/expanded/props/resource");
  for (const key of ["paint", "transform", "extra"]) {
    const node = { ...document().pages[0]?.children[0], [key]: null };
    failure(
      () => renderUnknown({ version: 1, pages: [{ width: 100, height: 100, children: [node] }] }, options),
      "KEY",
      `/pages/0/children/0/${key}`,
    );
  }
});
test("drawing/text bytes unchanged when unused JPEG is configured and image operations preserve text state", () => {
  const Helvetica = createHelvetica();
  const runtime = fontRuntime();
  const text = createTextService({ runtime });
  const paragraph = {
    runs: [{ text: "caption" }],
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const },
    lineHeight: 12,
    align: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "error" as const,
  };
  const caption = { type: "richText" as const, x: 10, y: 70, width: 80, height: 12, paragraphs: [paragraph] };
  const input: DocumentDefinition = { version: 1, pages: [{ width: 100, height: 100, children: [caption] }] };
  const options = { resources: { Helvetica }, text, providers: [fontProvider(runtime)] };
  const baseline = render(input, options);
  const imageOptions = {
    ...options,
    resources: { Helvetica, photo: prepareJpeg(fixture()) },
    providers: [...options.providers, jpegProvider()],
  };
  assert.deepEqual(render(input, imageOptions), baseline);
  const mixed = render(
    { version: 1, pages: [{ width: 100, height: 100, children: [...document().pages[0]!.children, caption] }] },
    imageOptions,
  );
  assert.ok(binary(mixed).includes("/Im1 Do\nQ\nq\n0 0 0 rg\n"));
  assert.ok(binary(mixed).includes("/F1 10 Tf"));
});
test("forged public metadata does not create private JPEG ownership", () => {
  const photo = { metadata: { kind: "jpeg", width: 32, height: 24, components: 3 } } as OwnedResource;
  // Generic binding ownership is checked independently of format-specific provider ownership.
  failure(
    () => render(document(), { resources: { photo }, providers: [jpegProvider()] }),
    "RESOURCE",
    "/resources/photo",
  );
});
