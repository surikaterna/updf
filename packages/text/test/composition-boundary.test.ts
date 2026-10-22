import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import type { CompositionPlan } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

const input = () => ({ ...rectangular("AB"), maxHeight: 100 });
function withOutput(change: (plan: CompositionPlan) => unknown) {
  return createLayoutOperation(compositionOptions({}, change));
}
test("malformed synchronous composition output rejects before issuing any frame", () => {
  for (const change of [
    () => undefined,
    () => Promise.resolve({}),
    (plan: CompositionPlan) => ({ ...plan, measurement: { ...plan.measurement, width: NaN } }),
    (plan: CompositionPlan) => ({ ...plan, fragments: plan.fragments.map((item) => ({ ...item, run: undefined })) }),
    (plan: CompositionPlan) => ({ ...plan, bands: [{ top: 1, bottom: 0, baseline: 1 }] }),
    (plan: CompositionPlan) => ({ ...plan, bands: [] }),
  ]) {
    const operation = withOutput(change);
    try {
      assert.throws(() => operation.composeText(input(), "/origin"), DocumentError);
    } finally {
      operation.close();
    }
  }
});
test("width identity stays exact while derived occupied band containment uses local arithmetic scale", () => {
  const mismatch = withOutput((plan) => ({
    ...plan,
    measurement: { ...plan.measurement, width: plan.measurement.width + Number.EPSILON * plan.measurement.width },
  }));
  try {
    assert.throws(() => mismatch.composeText(input(), "/identity"), DocumentError);
  } finally {
    mismatch.close();
  }
  for (const top of [-Number.EPSILON, -0.01]) {
    const operation = withOutput((plan) => ({ ...plan, bands: plan.bands.map((band) => ({ ...band, top })) }));
    try {
      if (top === -Number.EPSILON) assert.equal(operation.composeText(input(), "/band").bands[0]?.top, top);
      else assert.throws(() => operation.composeText(input(), "/band"), DocumentError);
    } finally {
      operation.close();
    }
  }
});
test("input getters and unsupported input properties reject without invoking getters", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  let reads = 0;
  try {
    assert.throws(
      () =>
        operation.composeText(
          {
            ...input(),
            get width() {
              reads++;
              return 100;
            },
          },
          "/getter",
        ),
      DocumentError,
    );
    assert.equal(reads, 0);
    for (const value of [NaN, Infinity, -1, 0])
      assert.throws(() => operation.composeText({ ...input(), width: value }, "/width"), DocumentError);
    assert.throws(() => operation.composeText({ ...input(), intervals: [] } as never, "/unsupported"), DocumentError);
  } finally {
    operation.close();
  }
});
