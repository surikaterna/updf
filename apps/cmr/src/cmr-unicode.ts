import type { DocumentDefinition } from "@updf/core";
import type { PreparedFont } from "@updf/core/fonts";
import { lower } from "@updf/core/vdom";
import { cmrFixture } from "./cmr.js";
import { createCmrTree } from "./cmr-tree.js";
import type { CmrData } from "./cmr-types.js";

export const unicodeCmrFixture = Object.freeze({
  ...cmrFixture,
  sender: "Северные товары\nПортовая улица 12\nМосква\nRU",
  terminal: "Западный терминал\nСклад 4\nRU",
  consignee: "Магазин Пример\nРыночная улица 8\nСанкт-Петербург\nRU",
  delivery: "Склад получателя\nСанкт-Петербург\n2026-10-02",
  takingOver: "Москва\n2026-10-01",
  carrier: "Пример перевозчика",
  successiveCarriers: "Нет",
  attachedDocuments: "Упаковочный лист PL-1042",
  reservations: "Без замечаний - демонстрационные данные",
  instructions: "Беречь от влаги\nДоставка: 2026-10-02\nКлиент: CLIENT-42",
} satisfies CmrData);

/** All labels/data use one explicitly selected font; source CMR geometry is unchanged. */
export function createUnicodeCmrDocument(font: PreparedFont): DocumentDefinition {
  return lower(createCmrTree(unicodeCmrFixture, "CmrFont"), { resources: { CmrFont: font } });
}
