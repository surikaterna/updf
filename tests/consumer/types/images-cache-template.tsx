import { images } from "@updf/images/load";
import { createImageCache, type ImageCache, type ImageCacheSnapshot } from "@updf/images/cache";
import { pngImages } from "@updf/images/png";
import { createAssetLoader } from "@updf/images/load";

const cache: ImageCache = createImageCache({ maxEntries: 2, maxBytes: 1024, maxConsumers: 2 });
const state: Readonly<ImageCacheSnapshot> = cache.snapshot();
images({ loader: createAssetLoader(), formatHandlers: [pngImages()], cache });
cache.clear();
cache.dispose();
// @ts-expect-error snapshot is immutable
state.entries = 1;
// @ts-expect-error all exact bounds are mandatory
createImageCache({ maxEntries: 1, maxBytes: 1024 });
// @ts-expect-error cache identity is opaque, not structural
export const forged: ImageCache = { clear() {}, dispose() {}, snapshot: cache.snapshot };
// @ts-expect-error extra policy isn't supported
createImageCache({ maxEntries: 1, maxBytes: 1024, maxConsumers: 1, ttl: 1 });
