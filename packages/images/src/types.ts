import type { OwnedResource } from "@updf/core/resources";
import type { BlockStyle } from "@updf/layout";

/** Structural metadata compatibility does not authenticate a codec's private resource. */
export type PreparedImage = OwnedResource<{
  readonly kind: "png" | "jpeg";
  readonly width: number;
  readonly height: number;
}>;

export interface ImageProps {
  readonly src: PreparedImage | string | UrlImageSource;
  readonly fit?: "contain" | "fill";
  readonly style: BlockStyle & { readonly width: number; readonly height: number };
}

export interface ImageCapture {
  readonly src: ImageProps["src"];
  readonly fit: "contain" | "fill";
}

export interface UrlImageSource {
  readonly kind: "url";
  readonly src: string;
}
