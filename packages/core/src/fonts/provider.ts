import { fail } from "../core/error.js";
import { hex, literal, name, type PdfScalar } from "../core/pdf-values.js";
import type { MeasuredLine } from "../core/plan.js";
import {
  type PageResources,
  type Resource,
  type ResourceCollection,
  type ResourceProvider,
  resourceSlot,
} from "../core/resource-types.js";
import type { PrivateFragment } from "../measurement/lines.js";
import { addGlyph, encodeRun, type FontUsage } from "./cids.js";
import { defineFont, reserveFont } from "./pdf.js";
import type { PreparedFont } from "./types.js";

type FontSite = MeasuredLine | PrivateFragment;
interface FontPayload {
  readonly encode: (site: FontSite) => PdfScalar;
}
const fontSlot = resourceSlot<FontPayload>();

export function fontAt(resources: PageResources, site: FontSite): { key: string; encoded: PdfScalar } {
  const resource = resources.resolve(site, fontSlot);
  return { key: resource.key, encoded: resource.payload.encode(site) };
}

export function fontProvider(): ResourceProvider {
  let next = 2;
  let helvetica: Resource<FontPayload>;
  const usages = new WeakMap<Resource<FontPayload>, FontUsage>();
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
      if (!site.glyphs) fail("FONT_DATA", "", "Missing measured glyph run");
      // Encoding is deferred until the committed traversal has registered every page's CIDs.
      const usage = usages.get(resource);
      if (!usage) throw new Error("Missing font usage");
      for (const glyph of site.glyphs) addGlyph(usage, glyph);
    }
    collection.bind(site, fontSlot, resource);
  };
  return {
    slot: fontSlot,
    initialize(collection) {
      helvetica = collection.intern(fontSlot, "Helvetica", builtin);
    },
    collect(node, collection) {
      if (node.type === "text") for (const line of node.lines) bind(line, node.preparedFont, collection);
      else if (node.type === "richText")
        for (const fragment of node.fragments) bind(fragment, fragment.preparedFont, collection);
    },
  };
}

function prepared(usage: FontUsage): Resource<FontPayload> {
  return {
    category: "Font",
    key: usage.key,
    phase: "content",
    payload: Object.freeze({
      encode(site: FontSite) {
        if (!site.glyphs) fail("FONT_DATA", "", "Missing measured glyph run");
        return hex(encodeRun(usage, site.glyphs));
      },
    }),
    reserve(writer) {
      const refs = reserveFont(writer);
      return { ref: refs.font, define: () => defineFont(writer, usage, refs) };
    },
  };
}
function builtin(): Resource<FontPayload> {
  return {
    category: "Font",
    key: "F1",
    phase: "bootstrap",
    payload: Object.freeze({ encode: (site: FontSite) => literal(site.text) }),
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
