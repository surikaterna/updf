import { createOwnedResource, type TextRun, type TextRuntime } from "@updf/core/resources";
import { createTextMeasurer, measureText } from "@updf/text";

const resource = createOwnedResource({ host: true });
const runtime: TextRuntime = {
  validateResource() {},
  validateText() {},
  fixedPolicy: () => ({ baseline: "ascent", checkInk: false }),
  lineMetrics: () => ({ ascent: 8, descent: 2 }),
  measure: (_resource, text) => ({
    advance: text.length * 5,
    left: 0,
    right: text.length * 5,
    ascent: 8,
    descent: 2,
    top: -8,
    bottom: 2,
    empty: !text,
    run: Object.freeze({}) as TextRun,
  }),
  joinRuns: () => Object.freeze({}) as TextRun,
};
const options = { resources: { Host: resource }, measurer: createTextMeasurer({ runtime, defaultFont: "Host" }) };
const result = measureText(
  { kind: "plain", text: "AB", width: 100, fontSize: 10, lineHeight: 12, align: "left" },
  options,
);
if (result.lines.length !== 1) throw new Error("Host metrics did not produce one line");
