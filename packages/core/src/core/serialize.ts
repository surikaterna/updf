import { commands } from "./content.js";
import { name } from "./pdf-values.js";
import { PdfWriter } from "./pdf-writer.js";
import type { MeasuredPage } from "./plan.js";
import { type Policy, policy } from "./policy.js";
import type { DocumentResources } from "./resource-types.js";

export function serialize(
  pages: readonly MeasuredPage[],
  resources: DocumentResources,
  limits: Policy = policy(),
): Uint8Array<ArrayBuffer> {
  const writer = new PdfWriter(limits.outputBytes);
  const catalog = writer.reserve();
  writer.setRoot(catalog);
  const tree = writer.reserve();
  const reserved = resources.open(writer);
  reserved.reserve("bootstrap");
  const pageRefs = pages.map(() => ({ page: writer.reserve(), content: writer.reserve() }));
  reserved.reserve("content");
  writer.define(catalog, { Type: name("Catalog"), Pages: tree });
  writer.define(tree, { Type: name("Pages"), Kids: pageRefs.map((refs) => refs.page), Count: pages.length });
  reserved.define("bootstrap");
  const budget = { length: 0, maximum: limits.outputBytes };
  pages.forEach((page, i) => {
    const refs = pageRefs[i]!;
    writer.define(refs.page, {
      Type: name("Page"),
      Parent: tree,
      MediaBox: [0, 0, page.width, page.height],
      Resources: reserved.dictionary,
      Contents: refs.content,
    });
    writer.defineStream(refs.content, commands(page, budget, resources.page(page)));
  });
  reserved.define("content");
  return writer.seal();
}
