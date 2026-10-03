import { array, checkLimit, fail, type LayoutOperation, validateDataObject as record } from "@updf/core/internal";
import { prepare } from "../blocks.js";
import { preflight, snapshot } from "../data.js";
import { Paginator } from "../paginator.js";
import { template } from "../template.js";
import { measureTable } from "./measure.js";
import { consumeTable } from "./producer.js";
import type { TablePlacement, TableResult } from "./types.js";
import { validateTable } from "./validate.js";

const blockKeys = [
  "type",
  "paragraph",
  "keepTogether",
  "height",
  "children",
  "style",
  "decorations",
  "props",
  "columns",
  "defaults",
  "rows",
  "header",
  "repeatHeader",
  "align",
  "grid",
];

export function tableLayout(input: unknown, operation: LayoutOperation, standalone = false): TableResult {
  preflight(input, operation.policy);
  record(input, standalone ? ["pageTemplate", "table"] : ["pageTemplate", "body"], "");
  const body = standalone ? [input.table] : input.body;
  array(body, operation.policy.nodes, "/body");
  let explicitPages = 1;
  body.forEach((item, i) => {
    record(item, blockKeys, standalone ? "/table" : `/body/${i}`);
    if (item.type === "pageBreak") checkLimit(++explicitPages, operation.policy.pages, `/body/${i}`, "Pages");
  });
  const geometry = template(input.pageTemplate, operation);
  const prepared = body.map((item, i) => {
    const path = standalone ? "/table" : `/body/${i}`;
    record(item, blockKeys, path);
    if (item.type === "table") return { table: measureTable(validateTable(item, path), geometry, path, operation) };
    if (standalone) fail("TYPE", "/table/type", "Expected table");
    return {
      block: prepare(item, geometry.body.width, path, operation, undefined, { active: true }, geometry.body.height),
    };
  });
  const paginator = new Paginator(geometry, operation.policy);
  const placements: TablePlacement[] = [];
  let tableIndex = 0;
  prepared.forEach((item, i) => {
    if (item.table) {
      const rows = consumeTable(paginator, item.table, i, tableIndex++, geometry.body.height);
      for (const row of rows) placements.push(row);
    } else if (item.block) paginator.consume(item.block, i);
  });
  const result = snapshot({
    ...paginator.result(body.length),
    tablePlacements: placements,
    repeatedHeaderCount: placements.filter((p) => p.repeatedHeader).length,
    consumedBodyRowCount: placements.filter((p) => p.rowIndex >= 0).length,
  });
  operation.validateDocument(result.document);
  return result;
}
