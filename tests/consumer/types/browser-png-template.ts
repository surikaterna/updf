import { browserPngImages } from "@updf/images/browser-png";
import { images, createAssetLoader } from "@updf/images/load";
import type { ImageFormatHandler } from "@updf/images/load";

const selected: ImageFormatHandler = browserPngImages();
images({ loader: createAssetLoader({ allowUri: () => false }), formatHandlers: [selected] });
// @ts-expect-error The selected browser factory takes no configuration or callbacks.
browserPngImages({ normalize: () => new Uint8Array() });
// @ts-expect-error No transport/preprocessing flags are added to ordinary image options.
images({ normalize: true });
