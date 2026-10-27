import { dataRecord, fail, number, ownDataValue, validateDataObject } from "@updf/core/internal";
import { Block, type BlockComponent, type ContentBlockProps } from "@updf/layout";
import { participationComponent, type FlowParticipation } from "@updf/layout/internal-participation";
import { visualCapture } from "@updf/layout/internal-visual-owner";
import type { ShapeSource } from "./sources.js";
import { captureSource } from "./source-capture.js";

export interface VisualDefinition {
  readonly capture: (
    input: Readonly<Record<string, unknown>>,
    path: string,
    floating: boolean,
  ) => { readonly props: ContentBlockProps; readonly visual: object };
}
const wrappers = new WeakMap<object, BlockComponent<object>>();
let owner: FlowParticipation;
let floatingBlock: BlockComponent<object>;
export function initializeMarker(participation: FlowParticipation): void {
  owner = participation;
  floatingBlock = participationComponent(owner, (props, path) =>
    captureMarker(props as unknown as ContentBlockProps, undefined, true, path),
  );
}
// Component identities are authoring-only capabilities, never installed configuration.
export function visualComponent<P extends object>(definition: VisualDefinition): BlockComponent<P> {
  const create = (floating: boolean) =>
    participationComponent<P>(owner, (input, path) => {
      const captured = definition.capture(input, path, floating);
      return captureMarker(captured.props, captured.visual, floating, path);
    });
  const component = create(false);
  wrappers.set(component, create(true) as BlockComponent<object>);
  return component;
}
export function floatingComponent(component: object): BlockComponent<object> {
  if (component === Block) return floatingBlock;
  const wrapper = wrappers.get(component);
  if (wrapper) return wrapper;
  const capture = visualCapture(component);
  if (!capture) fail("TYPE", "/floatable", "Expected the layout Block or an owned visual component");
  const floating = participationComponent(
    owner,
    (input, path) => {
      const style = ownDataValue(input, "style", `${path}/style`);
      dataRecord(style, `${path}/style`);
      const float = ownDataValue(style, "float", `${path}/style/float`);
      const shapeOutside = ownDataValue(style, "shapeOutside", `${path}/style/shapeOutside`);
      const ordinary = { ...style };
      delete ordinary.float;
      delete ordinary.shapeOutside;
      delete ordinary.shapeImageThreshold;
      const props = capture({ ...input, style: ordinary }, path);
      const floatingStyle = {
        ...props.style,
        float,
        ...(Object.hasOwn(style, "shapeOutside") ? { shapeOutside } : {}),
        ...(Object.hasOwn(style, "shapeImageThreshold")
          ? { shapeImageThreshold: ownDataValue(style, "shapeImageThreshold", `${path}/style/shapeImageThreshold`) }
          : {}),
      };
      const marker = captureMarker({ ...props, style: floatingStyle }, undefined, true, path);
      return { ...marker, data: Object.freeze({ ...marker.data, reference: "visual" }), body: props.children };
    },
    component,
  );
  wrappers.set(component, floating);
  return floating;
}
function captureMarker(props: ContentBlockProps, visual: object | undefined, floating: boolean, path: string) {
  validateDataObject(props, ["children", "style", "keepTogether", "decorations"], path);
  const authoredStyle = ownDataValue(props, "style", `${path}/style`);
  if (!authoredStyle || typeof authoredStyle !== "object")
    fail("TYPE", `${path}/style`, "Expected explicit dimensions");
  dataRecord(authoredStyle, `${path}/style`);
  const float = ownDataValue(authoredStyle, "float", `${path}/style/float`);
  const shapeOutside = ownDataValue(authoredStyle, "shapeOutside", `${path}/style/shapeOutside`);
  const style = { ...authoredStyle };
  const threshold = Object.hasOwn(authoredStyle, "shapeImageThreshold")
    ? ownDataValue(authoredStyle, "shapeImageThreshold", `${path}/style/shapeImageThreshold`)
    : 0;
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    fail("VALUE", `${path}/style/shapeImageThreshold`, "Expected finite threshold in [0,1]; omit an absent threshold");
  delete style.float;
  delete style.shapeOutside;
  delete style.shapeImageThreshold;
  if (floating && float !== "left" && float !== "right") fail("VALUE", `${path}/style/float`, "Expected left or right");
  if (!floating && ["float", "shapeOutside", "shapeImageThreshold"].some((key) => Object.hasOwn(authoredStyle, key)))
    fail("KEY", `${path}/style`, "Ordinary Path has no floating metadata");
  const width = number(ownDataValue(style, "width", `${path}/style/width`), `${path}/style/width`, true);
  const height = number(ownDataValue(style, "height", `${path}/style/height`), `${path}/style/height`, true);
  if (Object.keys(style).some((key) => key.startsWith("margin")))
    fail("KEY", `${path}/style`, "Margins are unsupported");
  const shape = Object.hasOwn(authoredStyle, "shapeOutside")
    ? captureSource(shapeOutside, `${path}/style/shapeOutside`)
    : undefined;
  return {
    props: { ...props, children: ownDataValue(props, "children", `${path}/children`) ?? null, style },
    data: Object.freeze({ floating, visual, shape, threshold, side: float, width, height }),
  };
}
export interface ManualMarker {
  readonly floating: boolean;
  readonly visual?: object;
  readonly shape?: ShapeSource | string;
  readonly threshold: number;
  readonly preparedShapeResource?: import("@updf/core/resources").OwnedResource;
  readonly reference?: "visual";
  readonly side: "left" | "right";
  readonly width: number;
  readonly height: number;
}
