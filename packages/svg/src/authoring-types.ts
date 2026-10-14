/** Plain SVG element data; preparation validates and owns a snapshot without accepting XML provenance. */
export interface SvgElement {
  readonly kind: "element";
  readonly name: string;
  readonly attrs: Readonly<Record<string, { readonly value: string }>>;
  readonly children: readonly SvgNode[];
}
/** Numbers are attributes only; conditional false/null/undefined children are omitted. */
export type SvgNode = SvgElement | string | readonly SvgNode[] | false | null | undefined;
export type SvgAttribute = string | number;
interface MetadataProps {
  readonly children?: SvgNode;
  readonly key?: string | number;
  readonly id?: SvgAttribute;
  readonly "data-name"?: SvgAttribute;
}
interface DrawingProps extends MetadataProps {
  readonly class?: SvgAttribute;
  readonly style?: string;
  readonly transform?: string;
  readonly fill?: SvgAttribute;
  readonly stroke?: SvgAttribute;
  readonly "fill-opacity"?: SvgAttribute;
  readonly "stroke-opacity"?: SvgAttribute;
  readonly "fill-rule"?: SvgAttribute;
  readonly "stroke-width"?: SvgAttribute;
  readonly "stroke-linecap"?: SvgAttribute;
  readonly "stroke-linejoin"?: SvgAttribute;
  readonly "stroke-miterlimit"?: SvgAttribute;
  readonly "stroke-dasharray"?: SvgAttribute;
  readonly "stroke-dashoffset"?: SvgAttribute;
  readonly opacity?: SvgAttribute;
  readonly visibility?: SvgAttribute;
  readonly display?: SvgAttribute;
}
interface PositionProps extends DrawingProps {
  readonly x?: SvgAttribute;
  readonly y?: SvgAttribute;
  readonly width?: SvgAttribute;
  readonly height?: SvgAttribute;
}
interface RadiusProps extends DrawingProps {
  readonly cx?: SvgAttribute;
  readonly cy?: SvgAttribute;
  readonly rx?: SvgAttribute;
  readonly ry?: SvgAttribute;
}
export interface SvgIntrinsicElements {
  svg: PositionProps & {
    readonly viewBox?: string;
    readonly preserveAspectRatio?: string;
    readonly version?: SvgAttribute;
    readonly xmlns?: string;
  };
  g: DrawingProps;
  path: DrawingProps & { readonly d?: string };
  rect: PositionProps & { readonly rx?: SvgAttribute; readonly ry?: SvgAttribute };
  line: DrawingProps & {
    readonly x1?: SvgAttribute;
    readonly y1?: SvgAttribute;
    readonly x2?: SvgAttribute;
    readonly y2?: SvgAttribute;
  };
  circle: DrawingProps & { readonly cx?: SvgAttribute; readonly cy?: SvgAttribute; readonly r?: SvgAttribute };
  ellipse: RadiusProps;
  polygon: DrawingProps & { readonly points?: string };
  polyline: DrawingProps & { readonly points?: string };
  defs: MetadataProps;
  style: MetadataProps & { readonly type?: string };
  title: MetadataProps;
  desc: MetadataProps;
}
