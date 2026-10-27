import type { Extensions } from "@updf/layout";
import { protocolFixture as siblingFixture } from "./sibling-protocol-fixture.js";

export function protocolFixture(children: unknown, extensions?: Extensions, width = 200, height = 100) {
  return siblingFixture(children, extensions, width, height);
}
