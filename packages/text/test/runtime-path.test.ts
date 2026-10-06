import assert from "node:assert/strict";
import test from "node:test";
import { createOwnedResource, type TextRun, type TextRuntime } from "@updf/core/resources";
import { createTextMeasurer, createTextService, measureText } from "@updf/text";
import { richInput } from "../../../tests/fixtures/rich-input.js";

test("five-callback runtimes capture receiver and fourth-argument source paths for both factories", () => {
  for (const factory of [createTextMeasurer, createTextService]) {
    const paths: string[] = [];
    const runtime: TextRuntime = {
      validateResource() {},
      validateText() {},
      lineMetrics: () => ({ ascent: 8, descent: 2 }),
      measure(_resource, text, size, path) {
        assert.equal(this, runtime);
        assert.equal(size, 10);
        paths.push(path);
        return {
          advance: text.length * 5,
          left: 0,
          right: text.length * 5,
          ascent: 8,
          descent: 2,
          top: -8,
          bottom: 2,
          empty: !text,
          run: Object.freeze({}) as TextRun,
        };
      },
      joinRuns: () => Object.freeze({}) as TextRun,
    };
    const measurer = factory({ runtime });
    runtime.measure = () => assert.fail("replacement after capture");
    const result = measureText(richInput("AB", 100, 10, 12, "Host"), {
      resources: { Host: createOwnedResource({}) },
      measurer: { measure: measurer.measure },
    });
    assert.equal(result.lineCount, 1);
    assert.ok(paths.length > 0);
    assert.ok(paths.every((path) => path.startsWith("/paragraphs/0/runs/0")));
  }
});
