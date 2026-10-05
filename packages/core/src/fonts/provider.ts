import { fail } from "../core/error.js";
import { hex, literal, name, type PdfString } from "../core/pdf-values.js";
import type { MeasuredLine } from "../core/plan.js";
import {
  type PaintingBinding,
  type Resource,
  type ResourceCollection,
  type ResourceProvider,
  resourceSlot,
} from "../core/resource-types.js";
import { textSlot } from "../core/text-paint.js";
import type { PrivateFragment } from "../measurement/lines.js";
import { addGlyph, encodeRun, type FontUsage } from "./cids.js";
import { defineFont, reserveFont } from "./pdf.js";
import type { PreparedFont } from "./types.js";

type FontSite = MeasuredLine | PrivateFragment;
const fontSlot = resourceSlot<undefined>();

export function fontProvider(): ResourceProvider {
  let next = 2;
  let helvetica: Resource<undefined>;
  let usages = new WeakMap<Resource<undefined>, FontUsage>();
  let bindings = new WeakMap<FontSite, PaintingBinding<PdfString>>();
  const bind = (site: FontSite, font: PreparedFont | undefined, collection: ResourceCollection): void => {
    const resource = font
      ? collection.intern(fontSlot, font, () => {
          const usage: FontUsage = { font, key: `F${next++}`, glyphs: [], cids: new Map() };
          const resource = prepared(usage);
          usages.set(resource, usage);
          return resource;
        })
      : helvetica;
    if (font) {
      register(site, usages.get(resource));
    }
    let binding = bindings.get(site);
    if (binding && binding.resource !== resource) throw new Error("Conflicting font painting binding");
    if (!binding) {
      const usage = usages.get(resource);
      binding = { resource, finish: () => encoded(site, usage) };
      bindings.set(site, binding);
    }
    collection.bindPainting(site, textSlot, binding);
  };
  return {
    slot: fontSlot,
    initialize(collection) {
      next = 2;
      usages = new WeakMap();
      bindings = new WeakMap();
      helvetica = collection.intern(fontSlot, "Helvetica", builtin);
    },
    collect(node, collection) {
      if (node.type === "text") for (const line of node.lines) bind(line, node.preparedFont, collection);
      else if (node.type === "richText")
        for (const fragment of node.fragments) bind(fragment, fragment.preparedFont, collection);
    },
  };
}

function register(site: FontSite, usage: FontUsage | undefined): void {
  if (!site.glyphs) fail("FONT_DATA", "", "Missing measured glyph run");
  if (!usage) throw new Error("Missing font usage");
  // Encoding waits until the committed traversal has registered every page's CIDs.
  for (const glyph of site.glyphs) addGlyph(usage, glyph);
}

function encoded(site: FontSite, usage: FontUsage | undefined): PdfString {
  if (!usage) return literal(site.text);
  if (!site.glyphs) fail("FONT_DATA", "", "Missing measured glyph run");
  return hex(encodeRun(usage, site.glyphs));
}

function prepared(usage: FontUsage): Resource<undefined> {
  return {
    category: "Font",
    key: usage.key,
    phase: "content",
    payload: undefined,
    reserve(writer) {
      const refs = reserveFont(writer);
      return { ref: refs.font, define: () => defineFont(writer, usage, refs) };
    },
  };
}
function builtin(): Resource<undefined> {
  return {
    category: "Font",
    key: "F1",
    phase: "bootstrap",
    payload: undefined,
    reserve(writer) {
      const ref = writer.reserve();
      return {
        ref,
        define: () =>
          writer.define(ref, {
            Type: name("Font"),
            Subtype: name("Type1"),
            BaseFont: name("Helvetica"),
            Encoding: name("WinAnsiEncoding"),
          }),
      };
    },
  };
}
