import { layout as contentLayout, measure as contentMeasure } from "@updf/layout";
import { textOptions } from "./text-options.js";

export const layout: typeof contentLayout = (input, options = {}) => contentLayout(input, textOptions(options));
export const measure: typeof contentMeasure = (input, constraints, options = {}) =>
  contentMeasure(input, constraints, textOptions(options));
