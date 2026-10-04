import assert from "node:assert/strict";
import test from "node:test";
import { manifestExample } from "../../examples/business/manifest.js";
import { calculateManifest, consignmentTotals, kilograms } from "../../examples/business/manifest-calculations.js";
import { mockManifest } from "../../examples/business/manifest-data.js";

import { expectedCartons, expectedGrams, expectedPackages, expectedPallets } from "./manifest-expected.js";

test("#46-B independent line/group/grand counts and integer grams; frozen deterministic input", () => {
  const before = JSON.stringify(mockManifest),
    totals = calculateManifest(mockManifest);
  assert.deepEqual(
    totals.groups.map(({ cartons, pallets, packages, grams, consignmentCount }) => ({
      cartons,
      pallets,
      packages,
      grams,
      consignmentCount,
    })),
    [
      { cartons: 62, pallets: 15, packages: 77, grams: 1672500, consignmentCount: 16 },
      { cartons: 62, pallets: 15, packages: 77, grams: 1822500, consignmentCount: 16 },
      { cartons: 62, pallets: 15, packages: 77, grams: 1972500, consignmentCount: 16 },
    ],
  );
  totals.groups.forEach((group, route) => {
    group.lines.forEach((line, index) => {
      assert.deepEqual(line, {
        cartons: expectedCartons[index],
        pallets: expectedPallets[index],
        packages: expectedPackages[index],
        grams: expectedGrams[route]?.[index],
      });
    });
  });
  assert.deepEqual(
    { ...totals, groups: undefined },
    { groups: undefined, consignmentCount: 48, cartons: 186, pallets: 45, packages: 231, grams: 5467500 },
  );
  assert.ok(Object.isFrozen(mockManifest.routes[0]?.consignments[0]));
  assert.deepEqual(manifestExample().bytes, manifestExample().bytes);
  assert.equal(JSON.stringify(mockManifest), before);
  assert.equal(kilograms(3250), "3.250 kg");
});

test("#46-B application input guards reject unsafe arithmetic, empty routes and duplicate identifiers", () => {
  const route = mockManifest.routes[0],
    item = route?.consignments[0];
  assert.ok(route && item);
  for (const cartons of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER])
    assert.throws(() => consignmentTotals({ ...item, cartons }));
  for (const palletGrams of [0, -1, 1.5, Number.MAX_SAFE_INTEGER])
    assert.throws(() => consignmentTotals({ ...item, pallets: 2, palletGrams }));
  assert.throws(() => consignmentTotals({ ...item, cartons: 0, pallets: 0 }));
  assert.throws(() => calculateManifest({ ...mockManifest, routes: [] }));
  assert.throws(() => calculateManifest({ ...mockManifest, routes: [{ ...route, consignments: [] }] }));
  assert.throws(() => calculateManifest({ ...mockManifest, routes: [route, route] }));
  assert.throws(() =>
    calculateManifest({ ...mockManifest, routes: [route, { ...route, consignments: [{ ...item, id: "other" }] }] }),
  );
  assert.throws(() => calculateManifest({ ...mockManifest, routes: [{ ...route, consignments: [item, item] }] }));
  assert.throws(() =>
    calculateManifest({
      ...mockManifest,
      routes: [
        {
          ...route,
          consignments: [
            { ...item, cartons: 1, cartonGrams: Number.MAX_SAFE_INTEGER },
            { ...item, id: "another" },
          ],
        },
      ],
    }),
  );
  assert.throws(() => kilograms(-1));
});
