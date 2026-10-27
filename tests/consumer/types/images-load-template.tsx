import { Image } from "@updf/images";
import { images, createAssetLoader } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { Document, Flow } from "@updf/layout";
import { renderAsync } from "@updf/layout/async";

const loader = createAssetLoader({ baseURI: "https://fixture.invalid/" });
export const pdf: Promise<Uint8Array<ArrayBuffer>> = renderAsync(
  <Document>
    <Flow pageSize={{ width: 200, height: 200 }} margins={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Image src="logo.png" style={{ width: 20, height: 20 }} />
    </Flow>
  </Document>,
  { extensions: [images({ loader, formatHandlers: [pngImages()] })] },
);
// @ts-expect-error URL loading requires configuration
images();
// @ts-expect-error loader is mandatory
images({ formatHandlers: [pngImages()] });
// @ts-expect-error format selection is mandatory
images({ loader });
