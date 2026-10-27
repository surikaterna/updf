import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { Image } from "@updf/images";
import { createImageCache } from "@updf/images/cache";
import { images, type ImagesOptions } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { renderAsync } from "@updf/layout/async";
import { layoutPrepared, prepareDocument } from "@updf/layout/internal-preparation";
import { authored } from "../../layout/test/preparation-fixture.js";
import { fixture } from "../../png/test/helpers.js";
import { imageSource } from "../src/source.js";

export const code = (expected: string) => (error: unknown) =>
  error instanceof DocumentError && error.diagnostics[0]?.code === expected;
export const image = (src: Parameters<typeof Image>[0]["src"] = "logo") =>
  h(Image, { src, style: { width: 20, height: 20 } });
export const tree = (urls = ["logo"]) => authored(urls.map((url) => image(url)));
export const cache = (bounds = {}) => createImageCache({ maxEntries: 8, maxBytes: 100000, maxConsumers: 8, ...bounds });
export const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
export const render = (config: ImagesOptions, urls?: string[], controller?: AbortController, resourceBytes?: number) =>
  renderAsync(
    tree(urls),
    { extensions: [images(config)], ...(resourceBytes === undefined ? {} : { limits: { resourceBytes } }) },
    controller ? { signal: controller.signal } : {},
  );
export async function resource(config: ImagesOptions) {
  return imageSource(
    layoutPrepared(await prepareDocument(tree(), { extensions: [images(config)] })).options.resources.Prepared0!,
    "/test",
  );
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export function controlled(bounds = {}) {
  const jobs: ReturnType<typeof deferred<Uint8Array<ArrayBuffer>>>[] = [];
  const signals: unknown[] = [];
  let resolutions = 0;
  const loader: ImagesOptions["loader"] = {
    resolve(url) {
      resolutions++;
      return url;
    },
    load(_uri, options) {
      signals.push(options?.signal);
      const job = deferred<Uint8Array<ArrayBuffer>>();
      jobs.push(job);
      return job.promise;
    },
  };
  const config = { loader, cache: cache(bounds), formatHandlers: [pngImages()] };
  return {
    jobs,
    signals,
    config,
    resolutions: () => resolutions,
    complete: (index: number) => jobs[index]!.resolve(new Uint8Array(fixture())),
  };
}
