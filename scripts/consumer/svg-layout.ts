import assert from "node:assert/strict";
import { installedGraph } from "./graphs.js";
import { execute } from "./install.js";
import { typeConsumer } from "./types.js";

export async function svgPeerProof(directory: string, layout: boolean): Promise<void> {
  await typeConsumer(directory, ["svg-graphic-template.tsx", "svg-authoring-template.tsx"]);
  await typeConsumer(directory, ["svg-graphic-template.tsx", "svg-authoring-template.tsx"], true);
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
  for (const order of ["require", "import"])
    await execute(
      directory,
      `
      import assert from 'node:assert/strict';
      import {createRequire} from 'node:module';
      const require = createRequire(import.meta.url);
      const a = ${order === "require" ? "require('@updf/svg/layout')" : "await import('@updf/svg/layout')"};
      const b = ${order === "require" ? "await import('@updf/svg/layout')" : "require('@updf/svg/layout')"};
      assert.equal(a.svgAdapters, b.svgAdapters);
      const l = await import('@updf/layout');
      const c = require('@updf/core');
      const s = require('@updf/svg');
      const graphic = s.prepareSVG('<svg viewBox="0 0 20 10"><rect width="20" height="10"/></svg>');
      const children = a.svgBlock(graphic, {width:40});
      const extensions = l.createExtensions(b.svgAdapters);
      const doc = l.document({children:l.flow({pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},extensions,children})});
      assert.ok(c.render(l.layout(doc).document).length > 100);
    `,
    );
}
