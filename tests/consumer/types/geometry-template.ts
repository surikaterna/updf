import { type PathNode, render } from "@updf/core";
import { type PathCommand, parsePathData } from "@updf/geometry";

const commands: readonly PathCommand[] = parsePathData("M10 10L20 20");
const node: PathNode = { type: "path", commands };
export const bytes: Uint8Array = render({ version: 1, pages: [{ width: 100, height: 100, children: [node] }] });
