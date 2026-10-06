import { fail } from "@updf/core/internal";
import { hex, literal, name, type PdfString } from "@updf/core/pdf";
import {
  type OwnedResource,
  type PaintingBinding,
  type Resource,
  type ResourceCollection,
  type ResourceDefinition,
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
  let usages = new WeakMap<OwnedResource, FontUsage>();
  let bindings = new WeakMap<object, PaintingBinding<PdfString>>();
  const intern = (font: OwnedResource, collection: ResourceCollection): Resource<undefined> => {
    return collection.intern(fontSlot, font, () => {
      if (isHelvetica(font)) return builtin();
      if (!isPreparedFont(font)) fail("FONT_RESOURCE", "/resources", "Expected an owned font");
      const usage: FontUsage = { font, glyphs: [], cids: new Map() };
      const resource = prepared(usage);
      usages.set(font, usage);
      return resource;
    });
  };
  const bind = (site: TextSite, collection: ResourceCollection): void => {
    const data = resolveRun(runtime, site.run, site.path);
    const resource = intern(data.resource, collection);
    if (isPreparedFont(data.resource)) register(data, usages.get(data.resource));
    let binding = bindings.get(site.identity);
    if (binding && binding.resource !== resource) throw new Error("Conflicting font painting binding");
    if (!binding) {
      const usage = usages.get(data.resource);
      binding = { resource, finish: () => encoded(data, usage) };
      bindings.set(site.identity, binding);
    }
    collection.bindPainting(site.identity, textSlot, binding);
  };
  return {
    slot: fontSlot,
    initialize() {
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

function prepared(usage: FontUsage): ResourceDefinition<undefined> {
  return {
    category: "Font",
    phase: "content",
    payload: undefined,
    reserve(writer) {
      const refs = reserveFont(writer);
      return { ref: refs.font, define: () => defineFont(writer, usage, refs) };
    },
  };
}
function builtin(): ResourceDefinition<undefined> {
  return {
    category: "Font",
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
