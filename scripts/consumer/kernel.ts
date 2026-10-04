import assert from "node:assert/strict";
import { installedGraph } from "./graphs.js";
import { absent, execute } from "./install.js";
import { ownPropertyRuntime } from "./kernel-own-properties.js";
import { typeConsumer } from "./types.js";

export async function kernelProof(directory: string): Promise<readonly string[]> {
  await absent(directory, [
    "@updf/core",
    "@updf/layout",
    "@updf/tables",
    "@updf/fontkit",
    "react",
    "react-dom",
    "fontkit",
  ]);
  await typeConsumer(directory, ["kernel-template.ts"]);
  await typeConsumer(directory, ["kernel-template.ts"], true);
  await execute(
    directory,
    `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    // Seal this consumer against unrelated ancestor /tmp/opencode/node_modules.
    const local = new URL('./node_modules/', import.meta.url).href;
    registerHooks({ resolve(specifier, context, next) {
      const resolved = next(specifier, context);
      if (resolved.url.includes('/node_modules/') && !resolved.url.startsWith(local))
        throw Object.assign(new Error('Outside standalone consumer: ' + specifier), {code:'ERR_MODULE_NOT_FOUND'});
      return resolved;
    }});
    const { LayoutInputError, resolveWidths } = await import('@updf/layout-kernel');
    const { bits, dyadic } = await import('@updf/layout-kernel/numeric');
    assert.deepEqual(resolveWidths({availableWidth:80,tracks:[20,{weight:1}],gap:1}).widths, [20,59]);
    assert.equal(dyadic(bits(Number.MIN_VALUE)), 2n);
    assert.throws(() => resolveWidths(null), LayoutInputError);
    for (const name of ['@updf/core','@updf/layout','react','fontkit'])
      await assert.rejects(import(name), {code:'ERR_MODULE_NOT_FOUND'});
    for (const name of ['src/width-input.js','internal','fonts','vdom'])
      await assert.rejects(import('@updf/layout-kernel/' + name), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  `,
  );
  await execute(
    directory,
    `import assert from 'node:assert/strict';
     import {resolveWidths, LayoutInputError} from '@updf/layout-kernel';
     ${ownPropertyRuntime}`,
  );
  const graph = await installedGraph(directory, "@updf/layout-kernel");
  assert.ok(graph.every((path) => path.startsWith("@updf/layout-kernel/dist/")));
  return graph;
}
