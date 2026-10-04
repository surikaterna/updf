import { fail, type SemanticRecipe } from "@updf/core/internal";
import { isAdapterComponent } from "./author-parts.js";
import { autoMarginInput } from "./auto-margin.js";
import { blockIdentity, legacyIdentity, paragraphIdentity, spanIdentity, visualIdentity } from "./content-data.js";
import { blockBodyIdentity, blockFooterIdentity, blockHeaderIdentity } from "./deferred-decoration.js";
import { pageBreakIdentity, pageBreakProps } from "./page-break.js";
import { columnIdentity, rowIdentity } from "./row-data.js";

export function checkRole(value: string | SemanticRecipe, path: string, parent: object | undefined): void {
  const inline = parent === paragraphIdentity || parent === spanIdentity;
  if (typeof value === "string") {
    if (!inline) fail("VDOM_HIERARCHY", path, "Text requires a Paragraph");
    return;
  }
  if (value.identity === pageBreakIdentity) pageBreakProps(value.props, path);
  autoMarginInput(
    value.identity === legacyIdentity ? value.props.descriptor : value.props,
    value.identity === blockIdentity,
    path,
  );
  const slot =
    parent === blockIdentity && [blockBodyIdentity, blockHeaderIdentity, blockFooterIdentity].includes(value.identity);
  const valid =
    parent === rowIdentity
      ? value.identity === columnIdentity
      : slot ||
        (inline
          ? value.identity === spanIdentity || value.identity === visualIdentity
          : value.identity === paragraphIdentity ||
            value.identity === blockIdentity ||
            value.identity === rowIdentity ||
            value.identity === columnIdentity ||
            value.identity === pageBreakIdentity ||
            value.identity === legacyIdentity ||
            isAdapterComponent(value.identity));
  if (!valid) fail("VDOM_HIERARCHY", path, inline ? "Expected inline content" : "Inline content requires a Paragraph");
}
