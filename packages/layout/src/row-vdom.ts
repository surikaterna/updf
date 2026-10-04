import { semanticComponent } from "@updf/core/internal";
import type { BlockComponent } from "./content-types.js";
import { columnIdentity, rowIdentity } from "./row-data.js";
import type { ColumnProps, RowProps } from "./row-types.js";

export const Row = semanticComponent<Record<string, unknown>>(rowIdentity) as unknown as BlockComponent<RowProps>;
export const Column = semanticComponent<Record<string, unknown>>(
  columnIdentity,
) as unknown as BlockComponent<ColumnProps>;
