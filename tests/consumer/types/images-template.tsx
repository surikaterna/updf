import { Image, images, type PreparedImage } from "@updf/images";
import { createOwnedResource } from "@updf/core/resources";
import { Document, Flow } from "@updf/layout";
import { render } from "@updf/layout/render";

export function pdf(src: PreparedImage) {
  const input = (
    <Document>
      <Flow pageSize={{ width: 200, height: 200 }} margins={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Image src={src} style={{ width: 120, height: 80 }} />
      </Flow>
    </Document>
  );
  return render(input, { resources: { logo: src }, extensions: [images()] });
}
export function negative(src: PreparedImage) {
  const font = createOwnedResource({ kind: "font" as const });
  const string = <Image src="logo" style={{ width: 120, height: 80 }} />;
  const url = <Image src={{ kind: "url", src: "logo" }} style={{ width: 120, height: 80 }} />;
  // @ts-expect-error only URL declarations, not unowned format-shaped objects
  const raw = <Image src={{ kind: "png", src: "logo" }} style={{ width: 120, height: 80 }} />;
  // @ts-expect-error arrays are not URL declarations
  const array = <Image src={["logo"]} style={{ width: 120, height: 80 }} />;
  // @ts-expect-error owned font is not an image
  const wrong = <Image src={font} style={{ width: 120, height: 80 }} />;
  // @ts-expect-error explicit dimensions required
  const missing = <Image src={src} style={{ width: 120 }} />;
  // @ts-expect-error ordinary Image cannot float
  const floated = <Image src={src} style={{ width: 120, height: 80, float: "left" }} />;
  return [string, url, raw, array, wrong, missing, floated];
}
