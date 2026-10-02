import { render } from "@updf/core";
import { jsxDEV } from "@updf/core/jsx-dev-runtime";
import { jsx } from "@updf/core/jsx-runtime";
import { lower, type VNode } from "@updf/core/vdom";

const page: VNode = jsx("page", { width: 100, height: 100 });
const tree: VNode = jsxDEV("document", { version: 1, children: page });
export const bytes: Uint8Array = render(lower(tree));
