import { createLayoutOperation } from "@updf/core/internal";
import { h } from "@updf/core/vdom";
import { Paragraph } from "@updf/layout";
import { siblingFlow as f, siblingOptions as options } from "../../../tests/fixtures/text-flow/siblings.js";
import { compileParticipation, participationRole, participationSources } from "../../layout/dist/cjs/participation.js";
import { dataRecipe } from "../../layout/dist/cjs/content-data.js";
import { checkRole } from "../../layout/dist/cjs/content-role.js";
import { FragmentState } from "../../layout/dist/cjs/fragment-state.js";
import { OutputBudget } from "../../layout/dist/cjs/budget.js";
import type { Extensions } from "@updf/layout";
import type { FlowParticipation } from "@updf/layout/internal-participation";

function defaultChildren() {
  return [
    h(f.Block, { style: { width: 72, height: 36, float: "left", backgroundColor: [0.2, 0.4, 0.6] } }, "visual"),
    h(Paragraph, { children: "first paragraph rich source units" }, "one"),
    h(Paragraph, { children: "second paragraph text continues at full width. ".repeat(10) }, "two"),
  ];
}
export function protocolFixture(
  children?: unknown,
  extensions?: Extensions,
  width = 200,
  height = 100,
  participation: FlowParticipation = f.participation,
) {
  const operation = createLayoutOperation(options);
  const lifetime = { active: true };
  const nodes = operation.normalizeContent(
    children ?? defaultChildren(),
    dataRecipe,
    "/siblings",
    (value, path, parent) => {
      const role = participationRole(participation, value, parent);
      checkRole(role.value, path, role.parent);
    },
  );
  const sources = participationSources(nodes, operation, participation);
  const compiled = compileParticipation(participation, sources, width, {
    operation,
    lifetime,
    freshHeight: height,
    ...(extensions ? { extensions } : {}),
  });
  return {
    block: compiled.blocks[0]!,
    operation,
    sources,
    request: {
      offset: 0,
      width,
      availableHeight: height,
      freshHeight: height,
      usedHeight: 0,
      atFreshRegion: true,
      state: new FragmentState(),
      budget: new OutputBudget(operation.policy),
    },
    close() {
      compiled.close();
      operation.close();
      lifetime.active = false;
    },
  };
}
