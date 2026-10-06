/** @jsxImportSource @updf/core */
import { type Box, type DocumentDefinition, render, type XObjectNode } from "@updf/core";
import type { OwnedResource, ResourceProvider, XObjectSite } from "@updf/core/resources";
import { bind, h, lower } from "@updf/core/vdom";
import { jpeg, type JpegMetadata, jpegProvider, type JpegResource, prepareJpeg } from "@updf/jpeg";

export function imagePdf(source: Uint8Array): Uint8Array {
  const photo: JpegResource = prepareJpeg(source);
  const metadata: JpegMetadata = photo.metadata;
  const owned: OwnedResource = photo;
  const provider: ResourceProvider = jpegProvider();
  const box: Box = { x: 10, y: 20, width: 60, height: 40 };
  const leaf: XObjectNode = jpeg("photo", box);
  const document: DocumentDefinition = { version: 1, pages: [{ width: 100, height: 100, children: [leaf] }] };
  const options = { resources: { photo: owned }, providers: [provider] };
  const Bound = bind("xObject", { resource: "photo", ...box });
  const node = h("xObject", { resource: "photo", ...box });
  const tree = (
    <document version={1}>
      <page width={100} height={100}>
        <Bound />
        {node}
        <xObject resource="photo" {...box} />
      </page>
    </document>
  );
  render(lower(tree, options), options);
  void metadata;
  return render(document, options);
}
export function siteResource(site: XObjectSite): OwnedResource {
  return site.resource;
}
export function invalidSource(): void {
  // @ts-expect-error A JPEG source is bytes, not a URL or base64 string.
  prepareJpeg("photo.jpg");
}
