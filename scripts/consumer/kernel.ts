import assert from "node:assert/strict";
import { installedGraph } from "./graphs.js";
import { absent, execute } from "./install.js";
import { boxPropertyRuntime } from "./kernel-box-properties.js";
import { fragmentationRuntime } from "./kernel-fragmentation.js";
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
  await typeConsumer(directory, ["kernel-template.ts", "kernel-fragmentation-template.ts"]);
  await typeConsumer(directory, ["kernel-template.ts", "kernel-fragmentation-template.ts"], true);
  await standaloneRuntime(directory);
  await candidateRuntime(directory);
  await rangeRuntime(directory);
  await execute(
    directory,
    `import assert from 'node:assert/strict';
     import {resolveWidths, LayoutInputError} from '@updf/layout-boxes';
      ${ownPropertyRuntime}`,
  );
  await execute(
    directory,
    `import assert from 'node:assert/strict'; import {LayoutInputError} from '@updf/layout-boxes'; ${boxPropertyRuntime}`,
  );
  const graph = await installedGraph(directory, "@updf/layout-boxes");
  const boxes = await installedGraph(directory, "@updf/layout-boxes/boxes");
  const fragments = await installedGraph(directory, "@updf/layout-boxes/fragmentation");
  assert.ok(fragments.every((path) => path.startsWith("@updf/layout-boxes/dist/")));
  assert.ok([...graph, ...boxes].every((path) => !path.includes("fragment")));
  assert.ok(boxes.every((path) => path.startsWith("@updf/layout-boxes/dist/")));
  assert.ok(graph.every((path) => path.startsWith("@updf/layout-boxes/dist/")));
  return [...new Set([...graph, ...boxes, ...fragments])];
}
async function rangeRuntime(directory: string): Promise<void> {
  await execute(
    directory,
    `
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';
    for (const {createRangeOperation} of [
      await import('@updf/layout-boxes/fragmentation'),
      createRequire(import.meta.url)('@updf/layout-boxes/fragmentation')
    ]) {
      const op = createRangeOperation({next: (_, {offset}, work) => {
        work.consume(1); return {end:offset+1,height:1,content:offset};
      }});
      assert.deepEqual(Object.keys(op).sort(), ['close','counts','prepare','select']);
      const source = op.prepare({id:'r',path:'/r',descriptor:{},extent:2,mode:'splittable',width:{mode:'fixed',value:8}});
      assert.equal(op.select(source,{offset:0,width:8,height:1,usedHeight:0}).end,1);
      assert.deepEqual(op.counts(),{attempts:1,sourceVisits:1,sourceReads:1,measurements:2,unitsExamined:2,outputFragments:1,providerUnits:2});
      assert.equal(op.select(source,{mode:'complete',offset:1,width:8}).end,2);
      assert.deepEqual(op.counts(),{attempts:2,sourceVisits:2,sourceReads:1,measurements:3,unitsExamined:3,outputFragments:2,providerUnits:3});
      op.close();
      assert.throws(()=>op.select(source,{offset:0,width:8,height:1,usedHeight:0}));
    }
  `,
  );
}
async function candidateRuntime(directory: string): Promise<void> {
  await execute(
    directory,
    `
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';
    for (const {createFragmentOperation} of [
      await import('@updf/layout-boxes/fragmentation'),
      createRequire(import.meta.url)('@updf/layout-boxes/fragmentation')
    ]) {
      const content = {};
      const op = createFragmentOperation({next: (_, {offset}, work) => {
        work.consume(2); return {end:offset+1, height:1, content};
      }});
      const source = op.prepare({id:'a',path:'/a',descriptor:{},extent:2,mode:'splittable',width:{mode:'reflow'}});
      const first = op.nextCandidate(op.candidates(source,{offset:0,width:10}));
      assert.equal(first.done,false);
      const second = op.nextCandidate(first.cursor);
      assert.deepEqual(op.nextCandidate(second.cursor),{done:true});
      assert.deepEqual(first.endpoint,{start:0,end:1,height:1,unit:{start:0,end:1,height:1,top:0}});
      assert.deepEqual(Reflect.ownKeys(first.cursor),[]);
      const selected = op.materializeCandidate(first.endpoint);
      assert.equal(selected.units[0].content,content);
      assert.ok(Object.isFrozen(selected.units));
      assert.notEqual(op.materializeCandidate(first.endpoint).units,selected.units);
      assert.deepEqual(op.counts(),{attempts:6,sourceVisits:1,sourceReads:1,measurements:2,unitsExamined:2,outputFragments:4,providerUnits:4});
      op.close();
      assert.throws(()=>op.materializeCandidate(first.endpoint));
    }
  `,
  );
}
async function standaloneRuntime(directory: string): Promise<void> {
  await execute(
    directory,
    `
    import assert from 'node:assert/strict';
     import { registerHooks, createRequire } from 'node:module';
    // Seal this consumer against unrelated ancestor /tmp/opencode/node_modules.
    const local = new URL('./node_modules/', import.meta.url).href;
    registerHooks({ resolve(specifier, context, next) {
      const resolved = next(specifier, context);
      if (resolved.url.includes('/node_modules/') && !resolved.url.startsWith(local))
        throw Object.assign(new Error('Outside standalone consumer: ' + specifier), {code:'ERR_MODULE_NOT_FOUND'});
      return resolved;
    }});
    const { LayoutInputError, resolveWidths } = await import('@updf/layout-boxes');
     const { bits, dyadic } = await import('@updf/layout-boxes/numeric');
     const { derivedAxis, tryMaterializedStart } = await import('@updf/layout-boxes/geometry');
     const axis = derivedAxis(0, .3, '/packed');
     assert.equal(tryMaterializedStart(axis, 0, .1), 0);
     assert.equal(tryMaterializedStart(axis, .1, .2), undefined);
     assert.equal(createRequire(import.meta.url)('@updf/layout-boxes/geometry').tryMaterializedStart(axis, 0, .1), 0);
     const { layoutBoxes, viewBox } = await import('@updf/layout-boxes/boxes');
     const prepared = {width:10,height:2,paddingTop:0,paddingBottom:0,paddingLeft:1,paddingRight:1,gap:1,alignItems:'start',childCount:2,childAt:i=>({width:i===0?3:4,height:1}),path:'/packed-row'};
     const placed = viewBox(prepared);
     assert.deepEqual(placed.children.map(c=>[c.left,c.width]),[[0,3],[4,4]]);
     assert.ok(placed.children.every(c=>prepared.paddingLeft+c.left+c.width<=prepared.width-prepared.paddingRight));
     assert.throws(()=>viewBox({...prepared,paddingLeft:0,paddingRight:0,gap:0,childAt:()=>({width:8,height:1})}),e=>e instanceof LayoutInputError && e.code==='GEOMETRY' && e.path==='/packed-row');
    ${fragmentationRuntime}
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
      await assert.rejects(import('@updf/layout-boxes/' + name), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  `,
  );
}
