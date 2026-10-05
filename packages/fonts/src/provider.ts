import { fail } from "@updf/core/internal";
import { hex, literal, name, type PdfString } from "@updf/core/pdf";
import {
  type OwnedResource,
  type PaintingBinding,
  type Resource,
  type ResourceCollection,
  type ResourceProvider,
  resourceSlot,
  type TextRuntime,
  type TextSite,
  textSlot,
} from "@updf/core/resources";
import { addGlyph, encodeRun, type FontUsage } from "./cids.js";
import { defineFont, reserveFont } from "./pdf.js";
import { isPreparedFont } from "./prepare.js";
import { isHelvetica, type RunData, resolveRun } from "./runtime.js";

const fontSlot = resourceSlot<undefined>();

export function fontProvider(runtime: TextRuntime): ResourceProvider {
  let next = 1;
  let helveticaKey: string | undefined;
  let usages = new WeakMap<Resource<undefined>, FontUsage>();
  let bindings = new WeakMap<object, PaintingBinding<PdfString>>();
  const intern = (font: OwnedResource, collection: ResourceCollection): Resource<undefined> => {
    return collection.intern(fontSlot, font, () => {
      // Keep historical font names without reserving an unused Helvetica object.
      if (isHelvetica(font)) {
        const key = helveticaKey ?? `F${next++}`;
        helveticaKey = undefined;
        return builtin(key);
      }
      if (!isPreparedFont(font)) fail("FONT_RESOURCE", "/resources", "Expected an owned font");
      const usage: FontUsage = { font, key: `F${next++}`, glyphs: [], cids: new Map() };
      const resource = prepared(usage);
      usages.set(resource, usage);
      return resource;
    });
  };
  const bind = (site: TextSite, collection: ResourceCollection): void => {
    const data = resolveRun(runtime, site.run, site.path);
    const resource = intern(data.resource, collection);
    if (isPreparedFont(data.resource)) register(data, usages.get(resource));
    let binding = bindings.get(site.identity);
    if (binding && binding.resource !== resource) throw new Error("Conflicting font painting binding");
    if (!binding) {
      const usage = usages.get(resource);
      binding = { resource, finish: () => encoded(data, usage) };
      bindings.set(site.identity, binding);
    }
    collection.bindPainting(site.identity, textSlot, binding);
  };
  return {
    slot: fontSlot,
    initialize(_collection, context) {
      helveticaKey = [...context.bindings.values()].some(isHelvetica) ? "F1" : undefined;
      next = helveticaKey ? 2 : 1;
      usages = new WeakMap();
      bindings = new WeakMap();
    },
    collectText: bind,
  };
}

function register(data: RunData, usage: FontUsage | undefined): void {
  if (!usage) throw new Error("Missing font usage");
  // Encoding waits until the committed traversal has registered every page's CIDs.
  for (const glyph of data.glyphs) addGlyph(usage, glyph);
}

function encoded(data: RunData, usage: FontUsage | undefined): PdfString {
  if (!usage) return literal(data.text);
  return hex(encodeRun(usage, data.glyphs));
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
function builtin(key: string): Resource<undefined> {
  return {
    category: "Font",
    key,
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
