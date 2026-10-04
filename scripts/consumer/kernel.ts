import assert from "node:assert/strict";
import { installedGraph } from "./graphs.js";
import { absent, execute } from "./install.js";
import { boxPropertyRuntime } from "./kernel-box-properties.js";
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
  await standaloneRuntime(directory);
  await execute(
    directory,
    `import assert from 'node:assert/strict';
     import {resolveWidths, LayoutInputError} from '@updf/layout-kernel';
      ${ownPropertyRuntime}`,
  );
  await execute(
    directory,
    `import assert from 'node:assert/strict'; import {LayoutInputError} from '@updf/layout-kernel'; ${boxPropertyRuntime}`,
  );
  const graph = await installedGraph(directory, "@updf/layout-kernel");
  const boxes = await installedGraph(directory, "@updf/layout-kernel/boxes");
  assert.ok(boxes.every((path) => path.startsWith("@updf/layout-kernel/dist/")));
  assert.ok(graph.every((path) => path.startsWith("@updf/layout-kernel/dist/")));
  return [...new Set([...graph, ...boxes])];
}
async function standaloneRuntime(directory: string): Promise<void> {
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
    const { layoutBoxes } = await import('@updf/layout-kernel/boxes');
    const view = { id: node => node.id, path: node => '/' + node.id, style: node => node.style ?? {}, childCount: node => node.children?.length ?? 0, childAt: (node, i) => node.children[i], content: node => node.content };
    assert.equal(layoutBoxes({root:{id:'empty'},view,width:80}).boxes[0].height, 0);
    const opaque = {text:'host'};
    const leaf = layoutBoxes({root:{id:'leaf',content:opaque},view,width:80,measure:(content,{allocation})=>{ assert.equal(content,opaque);assert.equal(allocation.width,80);return {height:3}; }});
    assert.equal(leaf.boxes[0].content, opaque);
    assert.equal(leaf.boxes[0].height, 3);
    assert.equal(Object.isFrozen(opaque),false);
    assert.throws(()=>layoutBoxes({root:{id:'leaf',content:opaque},view,width:80}), LayoutInputError);
    assert.deepEqual(resolveWidths({availableWidth:80,tracks:[20,{weight:1}],gap:1}).widths, [20,59]);
    assert.equal(dyadic(bits(Number.MIN_VALUE)), 2n);
    assert.throws(() => resolveWidths(null), LayoutInputError);
    for (const name of ['@updf/core','@updf/layout','react','fontkit'])
      await assert.rejects(import(name), {code:'ERR_MODULE_NOT_FOUND'});
    for (const name of ['src/width-input.js','internal','fonts','vdom'])
      await assert.rejects(import('@updf/layout-kernel/' + name), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  `,
  );
}
