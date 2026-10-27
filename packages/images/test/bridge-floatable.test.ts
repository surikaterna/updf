import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Image } from "@updf/images";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { resolveImageResource } from "@updf/images/internal-preparation";
import { Block, Paragraph, layout } from "@updf/layout";
import {
  definePreparationResource,
  layoutPrepared,
  prepareDocument,
  replaceParticipationData,
} from "@updf/layout/internal-preparation";
import { floatable, textFlow } from "@updf/text-flow";
import { manualParticipation } from "../../text-flow/dist/cjs/manual-participation.js";
import type { PngResource } from "@updf/png";
import { textOptions } from "../../../tests/fixtures/text-options.js";
import { authored } from "../../layout/test/preparation-fixture.js";
import { transport } from "./url-helpers.js";

test("actual floatable Image and plain Block prepare synthetic metadata on both sides without changing native geometry", async () => {
  for (const plain of [false, true])
    for (const side of ["left", "right"] as const) {
      const metadata = definePreparationResource({
        identity: manualParticipation,
        slot: "participation-data",
        capture: (_props, _path, capture) => capture,
        resolve: async () => assert.fail("session required"),
        replace: (capture, resource, id) =>
          replaceParticipationData(capture!, resource, id, { ...capture!.data, syntheticMask: resource }),
        session: (context) => ({
          resolve: () => resolveImageResource(context, "mask.png", "/synthetic/mask"),
          close() {},
        }),
      });
      const { loader } = transport();
      const options = {
        ...textOptions({}),
        extensions: [textFlow(), metadata, images({ loader, formatHandlers: [pngImages()] })],
      };
      const Floating = plain ? floatable(Block) : floatable(Image);
      const scene = (src: Parameters<typeof Image>[0]["src"]) =>
        authored([
          h(
            Floating as never,
            {
              style: { width: 40, height: 30, float: side, paddingLeft: 1.25 },
              ...(plain ? { children: h(Block, { style: { height: 3 }, children: null }) } : { src }),
            },
            "float",
          ),
          h(Paragraph, { children: "Text follows the prepared floating Block on either side. ".repeat(10) }),
        ]);
      const output = layoutPrepared(await prepareDocument(scene("visual.png"), options));
      const control = layout(scene(output.options.resources.Prepared0! as PngResource), {
        ...options,
        resources: output.options.resources,
      });
      assert.deepEqual(output.document, control.document);
      assert.deepEqual(output.placements, control.placements);
      assert.equal(
        Object.keys(output.options.resources).filter((key) => key.startsWith("Prepared")).length,
        plain ? 1 : 2,
      );
    }
});
