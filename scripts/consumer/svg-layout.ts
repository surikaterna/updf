import assert from "node:assert/strict";
import { installedGraph } from "./graphs.js";
import { execute } from "./install.js";
import { typeConsumer } from "./types.js";

export async function svgPeerProof(directory: string, layout: boolean): Promise<void> {
  const types = ["svg-graphic-template.tsx", "svg-authoring-template.tsx", "svg-diagnostics-template.ts"];
  await typeConsumer(directory, types);
  await typeConsumer(directory, types, true);
  for (const entry of ["@updf/svg", "@updf/svg/authoring", "@updf/svg/jsx-runtime", "@updf/svg/jsx-dev-runtime"])
    assert.ok(
      !(await installedGraph(directory, entry)).some((path) => /@updf\/(?:layout|text|fonts|tables)\//u.test(path)),
    );
  if (!layout) {
    for (const load of ["await import('@updf/svg/layout')", "createRequire(import.meta.url)('@updf/svg/layout')"])
      await assert.rejects(
        execute(directory, `import {createRequire} from 'node:module'; ${load};`),
        /MODULE_NOT_FOUND/u,
      );
    return;
  }
  const graph = await installedGraph(directory, "@updf/svg/layout");
  assert.ok(!graph.some((path) => /svg\/dist\/(?:xml|xml-lex|jsx-runtime|authoring|structured)\.js$/u.test(path)));
  await typeConsumer(directory, ["svg-graphic-template.tsx", "svg-layout-template.tsx"]);
  await typeConsumer(directory, ["svg-graphic-template.tsx", "svg-layout-template.tsx"], true);
  await svgCrossLoaderProof(directory);
}

async function svgCrossLoaderProof(directory: string): Promise<void> {
  for (const order of ["require", "import"])
    await execute(
      directory,
      `
      import assert from 'node:assert/strict';
      import {createRequire} from 'node:module';
      const require = createRequire(import.meta.url);
      const a = ${order === "require" ? "require('@updf/svg/layout')" : "await import('@updf/svg/layout')"};
      const b = ${order === "require" ? "await import('@updf/svg/layout')" : "require('@updf/svg/layout')"};
       const l = await import('@updf/layout');
       const lc = require('@updf/layout');
      const c = require('@updf/core');
      const s = require('@updf/svg');
      const graphic = s.prepareSVG('<svg viewBox="0 0 20 10"><rect width="20" height="10"/></svg>');
       const text = require('@updf/text').createTextService({defaultFont:'Metrics',runtime:{
         validateResource(){},validateText(){},lineMetrics(){return {ascent:8,descent:2}},
         measure(_resource,content){if(content!=='')throw Error('No text expected');
           return {advance:0,left:0,right:0,ascent:8,descent:2,top:-8,bottom:2,empty:true,run:Object.freeze({})}},
         joinRuns(){return Object.freeze({})}
       }});
       const options = {text,resources:{Metrics:require('@updf/core/resources').createOwnedResource({})}};
       for (const host of [l, lc]) {
         const children = [a.svgBlock(graphic, {width:40}),
           host.paragraph({children:b.svgInline(graphic, {width:20})})];
         const doc = host.document({children:host.flow({pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},children})});
         assert.ok(c.render(host.layout(doc, options).document, options).length > 100);
       }
    `,
    );
}
