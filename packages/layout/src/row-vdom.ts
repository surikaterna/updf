import { semanticComponent } from "@updf/core/internal";
import type { BlockComponent } from "./content-types.js";
import { columnIdentity, rowIdentity } from "./row-data.js";
import type { ColumnProps, RowProps } from "./row-types.js";

/** JSX atomic horizontal Columns; default top alignment, widths resolve before descendants. */
export const Row = semanticComponent<Record<string, unknown>>(rowIdentity) as unknown as BlockComponent<RowProps>;
/** JSX vertical block stack; standalone Columns fragment, Row children move with their atomic Row. */
export const Column = semanticComponent<Record<string, unknown>>(
  columnIdentity,
) as unknown as BlockComponent<ColumnProps>;
