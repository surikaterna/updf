import { contextLayoutOperation } from "@updf/core/internal";
import type { Component } from "@updf/core/vdom";
import { nativeDocument } from "../native-vdom.js";
import { tableLayout } from "./layout.js";
import type { TableDocumentDefinition, TableFlowDefinition } from "./types.js";

const Document: Component<TableDocumentDefinition | TableFlowDefinition> = (definition, context) => {
  const result = tableLayout(definition, contextLayoutOperation(context), "table" in definition);
  return nativeDocument(result.document);
};
export const Tables = Object.freeze({ Document });
