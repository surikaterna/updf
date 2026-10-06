import type { NodeDefinition } from "@updf/core";
import { defineBlockAdapter, extension } from "@updf/layout";

export interface ChartProps {
  readonly height: number;
  readonly values: readonly number[];
}

function validate(input: unknown): ChartProps {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Expected chart props");
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 2 || !keys.includes("height") || !keys.includes("values"))
    throw new TypeError("Unknown chart prop");
  const height = Object.getOwnPropertyDescriptor(input, "height");
  const values = Object.getOwnPropertyDescriptor(input, "values");
  if (!height || !("value" in height) || !values || !("value" in values))
    throw new TypeError("Chart getters are not data");
  if (typeof height.value !== "number" || !Number.isFinite(height.value) || height.value < 40)
    throw new TypeError("Expected chart height >= 40");
  if (!Array.isArray(values.value) || values.value.length === 0) throw new TypeError("Expected chart values");
  const copied = Array.from(values.value, (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)
      throw new TypeError("Expected chart values in [0, 1]");
    return value;
  });
  return { height: height.value, values: copied };
}

function nodes(props: ChartProps, width: number): readonly NodeDefinition[] {
  const step = (width - 20) / props.values.length;
  return [
    {
      type: "richText",
      x: 10,
      y: 6,
      width: width - 20,
      height: 14,
      paragraphs: [
        {
          runs: [{ text: "External chart" }],
          defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
          lineHeight: 14,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "error",
        },
      ],
    },
    {
      type: "path",
      commands: [
        { type: "move", x: 10, y: 24 },
        { type: "line", x: 10, y: props.height - 5 },
        { type: "line", x: width - 5, y: props.height - 5 },
      ],
      paint: { stroke: [0, 0, 0], width: 1, fill: null, lineCap: "butt", lineJoin: "bevel" },
    },
    ...props.values.map(
      (value, index): NodeDefinition => ({
        type: "rect",
        x: 12 + step * index,
        y: props.height - 6 - (props.height - 32) * value,
        width: step - 4,
        height: (props.height - 32) * value,
        paint: { fill: [0.1, 0.4, 0.8], stroke: null },
      }),
    ),
  ];
}

/** An ordinary external producer: no paginator import, native kind or central chart dispatch. */
export const chartAdapter = defineBlockAdapter<ChartProps>({
  name: "example.chart",
  validate,
  measure(props, context) {
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: context.width, height: props.height },
      fragment(request) {
        if (props.height > request.availableHeight) return { status: "defer" };
        return { status: "placed", nextOffset: 1, height: props.height, nodes: nodes(props, context.width) };
      },
    };
  },
});
export const chart = (props: ChartProps) => extension(chartAdapter, props);
