import assert from "node:assert/strict";
import { h } from "@updf/core/vdom";
import type { OwnedResource } from "@updf/core/resources";
import { Image } from "@updf/images";
import { resolveImageResource } from "@updf/images/internal-preparation";
import { Document, Flow, type ContentBlockProps } from "@updf/layout";
import {
  defineParticipation,
  participationComponent,
  type ParticipationContext,
  type ParticipationSource,
  type FlowParticipation,
} from "@updf/layout/internal-participation";
import {
  definePreparationResource,
  replaceParticipationData,
  type CapturedVisualResource,
} from "@updf/layout/internal-preparation";
import { visualCapture } from "@updf/layout/internal-visual-owner";

export function bridgeFixture(
  plain = false,
  inspect = (_sources: readonly ParticipationSource[], _context: ParticipationContext) => {},
) {
  const seen: ParticipationSource[] = [];
  const references: object[] = [];
  const captures: CapturedVisualResource[] = [];
  let count = 0;
  const owner = defineParticipation((sources, context) => {
    inspect(sources, context);
    seen.push(...sources);
    const blocks = sources.map((source) => {
      const block = context.prepare(source);
      references.push(context.reference(source, block));
      assert.throws(() => context.reference(source, { ...block }));
      return block;
    });
    return { blocks, close() {} };
  });
  const capture = visualCapture(Image)!;
  const Marker = participationComponent<Record<string, unknown>>(
    owner,
    (input, path) => {
      count++;
      const { mask, ...props } = input;
      const canonical = plain ? (props as unknown as ContentBlockProps) : capture(props, path);
      return {
        props: canonical,
        data: { mask, depth: { untouched: 7 } },
        ...(plain ? {} : { body: canonical.children }),
      };
    },
    plain ? undefined : Image,
  );
  const definition = metadataDefinition(owner, captures);
  const document = (props: Record<string, unknown>, key = "owned") => bridgeDocument(owner, h(Marker, props, key));
  return {
    owner,
    Marker,
    definition,
    feature: definePreparationResource(definition),
    document,
    seen,
    references,
    captures,
    count: () => count,
  };
}
function metadataDefinition(owner: FlowParticipation, captures: CapturedVisualResource[]) {
  return {
    identity: owner,
    slot: "participation-data" as const,
    capture(_props: Readonly<Record<string, unknown>>, _path: string, captured?: CapturedVisualResource) {
      assert.ok(captured?.data);
      captures.push(captured);
      return captured;
    },
    resolve: async (): Promise<OwnedResource> => assert.fail("Session required"),
    replace(request: CapturedVisualResource, resource: OwnedResource, id: string) {
      return replaceParticipationData(request, resource, id, { ...request.data, prepared: resource, id });
    },
    session(context: import("@updf/layout/internal-preparation").PreparationContext) {
      return {
        async resolve(request: CapturedVisualResource) {
          const resource = await resolveImageResource(
            context,
            (request.data as { mask: string }).mask,
            "/synthetic/mask",
          );
          context.retain(resource, "/synthetic/mask");
          return resource;
        },
        close() {},
      };
    },
  };
}
function bridgeDocument(owner: FlowParticipation, child: ReturnType<typeof h>) {
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 200 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      participation: owner,
      children: child,
    }),
  });
}
