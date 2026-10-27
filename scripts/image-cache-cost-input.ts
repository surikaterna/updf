import { urlImageInput } from "./url-image-cost-inputs.js";

/** Same real PNG URL/PDF workload, explicitly opting into retention across its two renders. */
export function imageCacheCostInput() {
  return urlImageInput("png")
    .replace("import {h}", "import {createImageCache} from '@updf/images/cache';import {h}")
    .replace(
      "const extension=images({loader,",
      "const cache=createImageCache({maxEntries:2,maxBytes:1048576,maxConsumers:2});const extension=images({loader,cache,",
    )
    .replace("fetches!==expectedFetches*2", "fetches!==expectedFetches");
}
