import type { DocumentDefinition } from "@updf/core";
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import type { PreparedFont } from "@updf/fonts";
import { fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";
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
  return lower(createCmrTree(unicodeCmrFixture, "CmrFont"), unicodeCmrOptions(font));
}

export function unicodeCmrOptions(font: PreparedFont) {
  const runtime = fontRuntime();
  return {
    resources: { CmrFont: font },
    text: createTextService({ runtime, defaultFont: "CmrFont" }),
    providers: [fontProvider(runtime)],
  };
}

export function renderUnicodeCMR(font: PreparedFont): Uint8Array<ArrayBuffer> {
  const options = unicodeCmrOptions(font);
  return render(lower(createCmrTree(unicodeCmrFixture, "CmrFont"), options), options);
}
