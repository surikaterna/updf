import {
  array,
  DocumentError,
  exceeds,
  fail,
  type LayoutOperation,
  number,
  validateDataObject as record,
  sum,
} from "@updf/core/internal";
import type { TextMeasurement } from "@updf/core/measurement";
import { compile } from "./block-compiler.js";
import { OutputBudget } from "./budget.js";
import { reserveAncestors } from "./container-reservation.js";
import { authorParagraph } from "./content-normalize.js";
import { measureParagraph } from "./content-paragraph.js";
import { contentProducer } from "./content-producer.js";
import {
  currentEmissionOrigin,
  geometryNodes,
  instantiateEmissionNodes,
  snapshotEmissionData,
} from "./emission-nodes.js";
import { type ExtensionLifetime, extensionProducer } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import type { LeafCache } from "./leaf-cache.js";
import { paragraphFragments } from "./paragraph-fragments.js";
import { paragraphProducer } from "./paragraph-producer.js";
import type { PreparedBlock } from "./protocol.js";
import type { FlowBlock, FlowDocumentDefinition } from "./types.js";

function measured(
  block: FlowBlock & { type: "paragraph" },
  width: number,
  path: string,
  operation: LayoutOperation,
  cache?: LeafCache,
): TextMeasurement {
  const previous = cache?.paragraphs.get(block)?.get(width);
  if (previous) return previous;
  try {
    const result = operation.measureText({ kind: "rich", width, paragraphs: [block.paragraph] }, path);
    const widths = cache?.paragraphs.get(block) ?? new Map<number, TextMeasurement>();
    widths.set(width, result);
    cache?.paragraphs.set(block, widths);
    return result;
  } catch (error) {
    if (!(error instanceof DocumentError)) throw error;
    const diagnostic = error.diagnostics[0];
    if (!diagnostic) throw error;
    throw new DocumentError(
      diagnostic.code,
      diagnostic.path.replace(`${path}/paragraphs/0`, `${path}/paragraph`),
      diagnostic.message,
      diagnostic,
    );
  }
}
export function prepareLeaf(
  value: unknown,
  width: number,
  path: string,
  operation: LayoutOperation,
  extensions?: Extensions,
  lifetime: ExtensionLifetime = { active: true },
  cache?: LeafCache,
): PreparedBlock {
  record(value, ["type", "paragraph", "keepTogether", "height", "children", "props"], path);
  if (value.type === "extension") {
    record(value, ["type", "props"], path);
    return extensionProducer(value, width, path, operation, extensions, lifetime, cache);
  }
  if (value.type === "paragraph") {
    record(value, ["type", "paragraph", "keepTogether"], path);
    if ("keepTogether" in value && typeof value.keepTogether !== "boolean")
      fail("TYPE", `${path}/keepTogether`, "Expected boolean");
    const block = value as unknown as FlowBlock & { type: "paragraph" };
    const author = authorParagraph(block);
    if (author)
      return contentProducer(
        measureParagraph(author, width, operation, extensions, path),
        width,
        block.keepTogether === true,
        path,
        paragraphFragments(lifetime),
      );
    const measurement = measured(block, width, path, operation, cache);
    return paragraphProducer(block, measurement, width, path);
  }
  if (value.type === "pageBreak") {
    record(value, ["type"], path);
    return {
      fragmentation: "atomic",
      naturalSize: { width, height: 0 },
      extent: 1,
      control: "advance",
      fragment: () => ({ nextOffset: 1, height: 0, paint: () => [] }),
    };
  }
  if (value.type === "spacer") {
    record(value, ["type", "height"], path);
    return atomicProducer(number(value.height, `${path}/height`, true), width, () => []);
  }
  if (value.type !== "fixed") fail("TYPE", `${path}/type`, "Unsupported flow block");
  return fixedProducer(value, width, path, operation);
}
function fixedProducer(
  value: Record<string, unknown>,
  width: number,
  path: string,
  operation: LayoutOperation,
): PreparedBlock {
  record(value, ["type", "height", "children"], path);
  const height = number(value.height, `${path}/height`, true);
  array(value.children, operation.policy.nodes, `${path}/children`);
  const block = value as unknown as FlowBlock & { type: "fixed" };
  new OutputBudget(operation.policy).charge(block.children, path);
  const work = operation.validateFixed(geometryNodes(block.children), width, height, path);
  return atomicProducer(
    height,
    width,
    (context) => {
      if (!block.children.length) return [];
      context.budget.reserveWork(work, path);
      context.budget.charge([{ type: "paintGroup", children: block.children }], path);
      return [
        {
          type: "paintGroup",
          transform: [1, 0, 0, 1, context.x, context.y],
          children: snapshotEmissionData(
            instantiateEmissionNodes(block.children, currentEmissionOrigin(operation)),
            path,
          ),
        },
      ];
    },
    (request) => {
      if (!block.children.length) return;
      request.budget?.reserveWork(work, path);
      request.budget?.charge([{ type: "paintGroup", children: block.children }], path);
    },
  );
}
function atomicProducer(
  height: number,
  width: number,
  paint: import("./protocol.js").PlacedFragment["paint"],
  reserve?: (request: import("./protocol.js").FragmentRequest) => void,
): PreparedBlock {
  return {
    fragmentation: "atomic",
    naturalSize: { width, height },
    extent: 1,
    fragment(request) {
      if (exceeds(sum([request.usedHeight, height]), request.freshHeight)) return undefined;
      reserveAncestors(request.reserve, request.budget, request.state, height);
      reserve?.(request);
      return { nextOffset: 1, height, paint };
    },
  };
}
export function blocks(
  input: FlowDocumentDefinition,
  width: number,
  operation: LayoutOperation,
  extensions?: Extensions,
  lifetime: ExtensionLifetime = { active: true },
  freshHeight = Number.MAX_VALUE,
): readonly PreparedBlock[] {
  return compile(input.body, width, "/body", {
    operation,
    lifetime,
    freshHeight,
    ...(extensions ? { extensions } : {}),
  });
}
export function prepare(
  value: unknown,
  width: number,
  path: string,
  operation: LayoutOperation,
  extensions?: Extensions,
  lifetime: ExtensionLifetime = { active: true },
  freshHeight = Number.MAX_VALUE,
): PreparedBlock {
  const prepared = compile(
    [value],
    width,
    path,
    { operation, lifetime, freshHeight, ...(extensions ? { extensions } : {}) },
    true,
  )[0];
  if (!prepared) fail("TYPE", path, "Missing compiled block");
  return prepared;
}
