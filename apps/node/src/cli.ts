import { writeFile } from "node:fs/promises";
import { cmrFixture } from "@updf/example-cmr/cmr";
import { createCmrTree } from "@updf/example-cmr/cmr-tree";
import { lower, render } from "./text-options.js";

const output = process.argv[2];
if (!output || process.argv.length !== 3) throw new Error("Usage: node apps/node/dist/cli.js OUTPUT.pdf");
await writeFile(output, render(lower(createCmrTree(cmrFixture))));
