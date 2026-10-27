import type { ImageProps } from "@updf/images";
import { Image as ImageComponent, images } from "@updf/images";
import type { OwnedResource } from "@updf/core/resources";
import type { PngResource } from "@updf/png";
import type { JpegResource } from "@updf/jpeg";
import { floatable } from "@updf/text-flow";
import { Source } from "@updf/text-flow/sources";

function types(png: PngResource, jpeg: JpegResource, font: OwnedResource<{ kind: "font" }>) {
  const Image = (props: Parameters<typeof ImageComponent>[0]) => props;
  const style = { width: 120, height: 80 };
  Image({ src: png, style });
  Image({ src: jpeg, style, fit: "fill" });
  const Wrapped = floatable(ImageComponent);
  const Floating = (props: Parameters<typeof Wrapped>[0]) => props;
  Floating({
    src: png,
    fit: "contain",
    style: { ...style, float: "right", shapeOutside: Source.path("M0 0H120V80Z") },
  });
  Image({ src: "logo", style });
  Image({ src: Source.url("https://invalid.test"), style });
  // @ts-expect-error font handles are not images
  Image({ src: font, style });
  // @ts-expect-error explicit dimensions are required
  Image({ src: png, style: { width: 120 } });
  // @ts-expect-error ordinary images do not float
  Image({ src: png, style: { ...style, float: "left" } });
  // @ts-expect-error ordinary images do not exclude shapes
  Image({ src: png, style: { ...style, shapeOutside: Source.path("M0 0Z") } });
  Floating({ src: "logo", style: { ...style, float: "left" } });
  // @ts-expect-error root remains zero-argument prepared-only installation
  images({ formatHandlers: [] });
  const props: ImageProps = { src: png, style };
  return props;
}
void types;
