import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { ownPropertyRuntime } from "../../../scripts/consumer/kernel-own-properties.js";

test("kernel and DocumentError shim consume only own data without inherited getter evaluation", () => {
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `import assert from 'node:assert/strict';
       import {resolveWidths, LayoutInputError} from '@updf/layout-boxes';
       import {DocumentError} from '@updf/core';
       import {resolveWidths as layoutWidths} from ${JSON.stringify(new URL("../../layout/src/width-resolver.ts", import.meta.url).href)};
       ${ownPropertyRuntime}
       checkOwnProperties(layoutWidths, DocumentError);`,
    ],
    { cwd: new URL("../../../", import.meta.url), stdio: "pipe" },
  );
});
