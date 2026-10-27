import {
  definePreparationResource,
  replaceParticipationData,
  type CapturedVisualResource,
  type PreparationContext,
  type VisualReplacement,
} from "@updf/layout/internal-preparation";
import {
  defineParticipation,
  type ParticipationContext,
  type ParticipationSource,
} from "@updf/layout/internal-participation";
import { resolveImageResource } from "@updf/images/internal-preparation";
import type { OwnedResource } from "@updf/core/resources";
// @ts-expect-error The bridge is not a public layout export.
import { replaceParticipationData as publicReplacement } from "@updf/layout";
void publicReplacement;
declare const context: PreparationContext;
declare const capture: CapturedVisualResource;
declare const resource: OwnedResource;
declare const participation: ParticipationContext;
declare const source: ParticipationSource;
const owner = defineParticipation(() => ({ blocks: [], close() {} }));
definePreparationResource({
  identity: owner,
  slot: "participation-data",
  capture: () => capture,
  resolve: () => resolveImageResource(context, "mask.png", "/mask"),
  replace: (request, owned, id) => replaceParticipationData(request, owned, id, { ...request.data, owned }),
});
const rectangle: Readonly<{ x: number; y: number; width: number; height: number }> = participation.reference(
  source,
  participation.prepare(source),
);
// @ts-expect-error Reference coordinates are readonly.
rectangle.x = 2;
// @ts-expect-error Replacement tokens cannot be manufactured structurally.
const forged: VisualReplacement = {};
void forged;
replaceParticipationData(capture, resource, "Prepared0", {});
// @ts-expect-error A data update is not a resolved resource binding.
replaceParticipationData(capture, {}, "Prepared0", {});
