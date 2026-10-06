import type { MeasuredRichText } from "../core/plan.js";
import { type ResolvedTextResources, textService } from "../core/text-resources.js";
import type { WorkLedger } from "../measurement/ledger.js";
import type { RichTextNode } from "../types.js";
import type { CollectionContext, InkContext, PaintContext, ValidationContext } from "./context.js";
import { box } from "./geometry.js";
import { rectangle } from "../painting/bounds.js";
import { decimal as n } from "../core/pdf-values.js";
import { fail } from "../core/error.js";
import { codePoints } from "../core/policy.js";
import { nativeFields } from "./native-fields.js";

export const richTextKeys = [
  "type",
  "x",
  "y",
  "width",
  "height",
  "paragraphs",
] as const satisfies readonly (keyof RichTextNode)[];

export function measureRichText(
  node: RichTextNode,
  path: string,
  fonts: ResolvedTextResources,
  budget: WorkLedger,
): MeasuredRichText {
  const plan = textService(fonts, path).rich(
    { width: node.width, height: node.height, paragraphs: node.paragraphs },
    { bindings: fonts.bindings, budget },
    path,
  );
  return { ...node, fragments: plan.fragments };
}

export function validateRichText(node: Record<string, unknown>, context: ValidationContext): void {
  const { path, view, fonts, budget } = context;
  box(node, view, path, false);
  textService(fonts, path).validate(
    { width: node.width, height: node.height, paragraphs: node.paragraphs },
    { bindings: fonts.bindings, budget },
    path,
  );
}

export function richTextInk(node: MeasuredRichText, context: InkContext): void {
  for (const fragment of node.fragments) {
    const bounds = fragment.inkBounds;
    if (bounds.empty) continue;
    context.addBounds(
      rectangle(
        bounds.left + node.x,
        bounds.top + node.y,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top,
        context.transform,
      ),
    );
  }
}

export function collectRichText(node: MeasuredRichText, context: CollectionContext): void {
  for (const site of node.fragments) {
    if (!site.run) fail("FONT_RESOURCE", site.path, "Missing text run");
    for (const provider of context.providers)
      provider.collectText?.({ identity: site, run: site.run, path: site.path }, context.collection);
    if (!context.hasPainting(site, context.textSlot))
      fail("FONT_RESOURCE", site.path, "No provider bound the text run");
  }
}

export function paintRichText(node: MeasuredRichText, context: PaintContext): void {
  context.push("q\n");
  for (const fragment of node.fragments) {
    context.push(`${fragment.style.color.map(n).join(" ")} rg\n`);
    context.push(context.text(fragment, node.x + fragment.x, node.y + fragment.baseline, fragment.style.fontSize));
  }
  context.push("Q\n");
}

export function lowerRichText(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "richText", ...nativeFields(props, x, y, path, "position") };
}

export function richTextWork(props: Readonly<Record<string, unknown>>) {
  let points = 0;
  if (Array.isArray(props.paragraphs)) for (const paragraph of props.paragraphs) points += paragraphPoints(paragraph);
  return { commands: 0, points };
}

function paragraphPoints(paragraph: unknown): number {
  if (!paragraph || typeof paragraph !== "object" || !("runs" in paragraph) || !Array.isArray(paragraph.runs)) return 0;
  let points = 0;
  for (const run of paragraph.runs) if (run && typeof run.text === "string") points += codePoints(run.text);
  return points;
}
