import { fail } from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";
import type { PreparationContext } from "@updf/layout/internal-preparation";
import type { captureOptions } from "./load-options.js";
import type { ImageClaim } from "./cache-owner.js";
import { preparedJob } from "./prepared-job.js";
import { imageSource, sourceUrl } from "./source.js";
import type { ImageProps } from "./types.js";

type Config = ReturnType<typeof captureOptions>;
export function imageSession(config: Config, context: PreparationContext) {
  return new Session(config, context);
}
class Session {
  private readonly local = new Map<string, Promise<OwnedResource>>();
  private transported = 0;
  private closed = false;
  private claims?: Set<ImageClaim>;
  constructor(
    private readonly config: Config,
    private readonly context: PreparationContext,
  ) {
    for (const format of config.formats) context.appendProvider(format.provider);
  }
  private check(): void {
    this.context.check();
    if (this.closed) fail("MEASUREMENT_CONTEXT", "/images/load", "Image preparation session closed");
  }
  private async load(uri: string): Promise<OwnedResource> {
    this.check();
    const { config, context } = this;
    const hit = config.cache?.peek(config.policy, uri);
    if (hit) return hit.resource;
    const remaining = Math.min(context.resourceBytes - this.transported, context.remaining());
    if (remaining <= 0) fail("LIMIT", "/images/load", "Image resource bytes exhausted before transport");
    const claim = config.cache?.acquire(
      config.policy,
      uri,
      remaining,
      context.signal,
      preparedJob.bind(undefined, config, uri, remaining),
    );
    if (claim) {
      this.claims ??= new Set();
      this.claims.add(claim);
    }
    const result = await (claim?.result ?? preparedJob(config, uri, remaining, context.signal));
    this.check();
    this.transported += result.sourceBytes;
    return result.resource;
  }
  readonly resolve = async (source: ImageProps["src"]) => {
    this.check();
    const url = sourceUrl(source);
    if (url === undefined) return imageSource(source, "/images/src");
    // URI policy runs for every occurrence, including normalized cache hits.
    const uri = this.config.loader.resolve(url);
    if (typeof uri !== "string" || !uri) fail("TYPE", "/images/loader/resolve", "Expected normalized URL");
    this.check();
    let resource = this.local.get(uri);
    if (!resource) {
      resource = this.load(uri);
      this.local.set(uri, resource);
    }
    return resource;
  };
  readonly close = (): void => {
    this.closed = true;
    for (const claim of this.claims ?? []) claim.release();
    this.claims?.clear();
    this.local.clear();
  };
}
