import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createPreparedFont, fontRuntime } from "@updf/fonts";
import { createTextComposition } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { exclusion, interval, jump } from "../src/exclusion.js";
import { compositionCapability } from "../src/composition-operation.js";
import { composeRectangular } from "../src/composition-plan.js";
import { serviceClosure } from "../src/service.js";

test("mixed fonts and negative bearings keep all ink outside both reserved edges", async () => {
  const data = await fontInput();
  const original = createPreparedFont(data);
  const glyph = original.metadata.glyphs.find((entry) => entry.codePoint === 65)!;
  const Demo = createPreparedFont({ ...data, glyphs: [{ ...glyph, advance: 600, bounds: [-200, -500, 900, 1400] }] });
  for (const side of ["left", "right"] as const) {
    const operation = createLayoutOperation(compositionOptions({ Demo }));
    try {
      const value = rectangular(
        "",
        {
          lineHeight: 24,
          breakLongWords: "codePoint",
          runs: [
            { text: "AAAA", style: { font: "Demo", fontSize: 14 } },
            { text: "AB CD", style: { fontSize: 12 } },
          ],
        },
        60,
      );
      const frame = operation.composeText({
        ...value,
        maxHeight: 200,
        exclusion: { shape: "rect", side, width: 25, height: 48 },
      });
      assert.ok(frame.measurement.lines.length >= 2);
      for (const line of frame.measurement.lines.filter((line) => line.top < 48 && !line.inkBounds.empty)) {
        assert.ok(!line.inkBounds.empty);
        assert.ok(side === "left" ? line.inkBounds.left >= 25 : line.inkBounds.right <= 35);
        assert.ok(line.inkBounds.top >= line.top);
        assert.ok(line.inkBounds.bottom <= line.top + 24);
      }
    } finally {
      operation.close();
    }
  }
});
test("vertical jumps are constant-work and reject nonfinite/no-progress geometry", () => {
  const rect = exclusion({ shape: "rect", side: "left", width: 10, height: 1e300 }, 10, "");
  const next = jump(rect, 0, -5, "");
  assert.equal(next, 1e300);
  assert.equal(interval(rect, 10, next, [-5, 16], "").active, false);
  assert.throws(() => jump(rect, next, 0, ""), DocumentError);
  assert.throws(() => jump({ ...rect, bottom: 1e308 }, 0, -1e308, ""), DocumentError);
  assert.throws(() => interval(rect, 10, 1e308, [0, 1e308], ""), DocumentError);
});
function counted(height: number, width: number) {
  const charges: number[] = [];
  const base = compositionOptions();
  const { service, fonts } = serviceClosure({ runtime: fontRuntime(), defaultFont: "Helvetica" });
  const capability = compositionCapability((input, context, path, charge) =>
    composeRectangular(input, fonts(context), context, path, (amount, at) => {
      charges.push(amount);
      charge(amount, at);
    }),
  );
  // Source/emitted private brands differ; this is the same checked test ABI as the shared fixture.
  const operation = createLayoutOperation({
    ...base,
    text: service,
    capability: capability as unknown as typeof base.capability,
  });
  try {
    const frame = operation.composeText({
      ...rectangular("AB", {}, 60),
      maxHeight: height + 16,
      exclusion: { shape: "rect", side: "left", width, height },
    });
    assert.equal(frame.measurement.lines.length, 1);
    assert.equal(frame.height, height + 16);
    return charges;
  } finally {
    operation.close();
  }
}
test("huge fully blocked and first-token retries have bounded identical attempt/scan accounting", () => {
  for (const width of [59, 60]) {
    const small = counted(32, width);
    assert.deepEqual(counted(1e12, width), small);
    // Run/atom/envelope/token reservations, line+two queries/selections, selected build, terminal.
    assert.deepEqual(small, [1, 3, 3, 2, 1, 1, 1, 1, 1, 2, 3, 1]);
  }
});
function failureCode(invoke: () => unknown): string | undefined {
  try {
    invoke();
    assert.fail("Expected failure");
  } catch (error) {
    assert.ok(error instanceof DocumentError);
    return error.diagnostics[0]?.code;
  }
}
test("failed exclusion work is cumulative and cannot evade the existing feature capture quota", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation({ ...options, limits: { nodes: 300 } });
  const input = {
    ...rectangular("abcdefgh", { breakLongWords: "codePoint" }, 60),
    maxHeight: 0,
    exclusion: { shape: "rect", side: "left", width: 59, height: 32 } as const,
  };
  let attempts = 0;
  try {
    for (; attempts < 20; attempts++) {
      const code = failureCode(() => operation.composeText(input));
      if (code === "LIMIT") break;
      assert.equal(code, "VERTICAL_OVERFLOW");
    }
    assert.ok(attempts > 0 && attempts < 20);
    assert.throws(
      () => operation.composeText({ ...input, maxHeight: 100 }),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
  } finally {
    operation.close();
  }
});

test("conservative selection includes vertical ink overhang, not just baseline or nominal line box", () => {
  const base = fontRuntime();
  const runtime = {
    ...base,
    measure(...args: Parameters<typeof base.measure>) {
      const metrics = base.measure(...args);
      return metrics.empty ? metrics : { ...metrics, top: metrics.top - 8, bottom: metrics.bottom + 8 };
    },
  };
  const options = { ...compositionOptions(), ...createTextComposition({ runtime, defaultFont: "Helvetica" }) };
  const operation = createLayoutOperation(options);
  try {
    const frame = operation.composeText({
      ...rectangular("\nA\n", {}, 60),
      maxHeight: 100,
      exclusion: { shape: "rect", side: "left", width: 20, top: 34, height: 2 },
    });
    const line = frame.measurement.lines[1]!;
    assert.ok(line.baseline < 34);
    assert.ok(line.top + line.height < 34);
    assert.ok(!line.inkBounds.empty && line.inkBounds.bottom > 34);
    assert.equal(line.fragments[0]?.x, 20);
    assert.equal(frame.height, 48);
  } finally {
    operation.close();
  }
});
