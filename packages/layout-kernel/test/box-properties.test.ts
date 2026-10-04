import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { boxPropertyRuntime } from "../../../scripts/consumer/kernel-box-properties.js";

test("box options, styles and measure results use only own data properties in an isolated process", () => {
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import assert from 'node:assert/strict'; import {LayoutInputError} from '@updf/layout-kernel'; ${boxPropertyRuntime}`,
    ],
    { cwd: process.cwd(), stdio: "pipe" },
  );
});
