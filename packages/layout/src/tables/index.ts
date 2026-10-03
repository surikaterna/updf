import type { RenderOptions } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { tableLayout } from "./layout.js";
import type { TableDocumentDefinition, TableFlowDefinition, TableResult } from "./types.js";

export type {
  TableCell,
  TableColumn,
  TableDefaults,
  TableDefinition,
  TableDocumentDefinition,
  TableFlowDefinition,
  TableOverrides,
  TablePlacement,
  TableResult,
  TableRow,
} from "./types.js";
export function layoutTable(input: TableDocumentDefinition, options: RenderOptions = {}): TableResult {
  return layoutTableUnknown(input, options);
}
export function layoutTableUnknown(input: unknown, options: RenderOptions = {}): TableResult {
  return run(input, options, true);
}
export function layoutTableFlow(input: TableFlowDefinition, options: RenderOptions = {}): TableResult {
  return layoutTableFlowUnknown(input, options);
}
export function layoutTableFlowUnknown(input: unknown, options: RenderOptions = {}): TableResult {
  return run(input, options, false);
}
function run(input: unknown, options: RenderOptions, standalone: boolean): TableResult {
  const operation = createLayoutOperation(options);
  try {
    return tableLayout(input, operation, standalone);
  } finally {
    operation.close();
  }
}
