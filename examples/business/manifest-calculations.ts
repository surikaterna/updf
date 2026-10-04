import type { Consignment, ManifestData } from "./manifest-data.js";

function integer(value: number, minimum = 0): number {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new Error("Manifest counts/mass must be safe non-negative integers");
  return value;
}
export function consignmentTotals(item: Consignment) {
  const cartons = integer(item.cartons),
    pallets = integer(item.pallets);
  const packages = integer(cartons + pallets, 1);
  const grams = integer(
    integer(cartons * integer(item.cartonGrams, 1)) + integer(pallets * integer(item.palletGrams, 1)),
    1,
  );
  return { cartons, pallets, packages, grams };
}
function sum(items: readonly ReturnType<typeof consignmentTotals>[]) {
  return items.reduce(
    (total, item) => ({
      cartons: integer(total.cartons + item.cartons),
      pallets: integer(total.pallets + item.pallets),
      packages: integer(total.packages + item.packages),
      grams: integer(total.grams + item.grams),
    }),
    { cartons: 0, pallets: 0, packages: 0, grams: 0 },
  );
}
export function calculateManifest(data: ManifestData) {
  if (!data.routes.length || data.routes.some((route) => !route.consignments.length))
    throw new Error("Manifest routes must contain freight");
  const ids = data.routes.flatMap((route) => route.consignments.map((item) => item.id));
  if (new Set(ids).size !== ids.length || ids.some((id) => !id))
    throw new Error("Consignment identifiers must be unique and non-empty");
  const codes = data.routes.map((route) => route.code);
  if (new Set(codes).size !== codes.length || codes.some((code) => !code))
    throw new Error("Route codes must be unique and non-empty");
  const groups = data.routes.map((route) => {
    const lines = route.consignments.map(consignmentTotals);
    return { code: route.code, consignmentCount: lines.length, lines, ...sum(lines) };
  });
  return { groups, consignmentCount: ids.length, ...sum(groups) };
}
export function kilograms(grams: number): string {
  integer(grams);
  return `${Math.floor(grams / 1000)}.${String(grams % 1000).padStart(3, "0")} kg`;
}
