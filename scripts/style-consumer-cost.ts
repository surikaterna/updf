import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build, type Metafile, version } from "esbuild";

interface CostReport {
  phase: string;
  scope: string;
  node: string;
  esbuild: string;
  input: string;
  options: object;
  raw: number;
  gzip: number;
  retained: string[];
  modules: string[];
  metafile: Metafile | undefined;
}

const phase = process.argv[2];
assert.ok(phase === "before" || phase === "after");
const output = new URL(`../artifacts/${process.argv[3] ?? "style49"}/`, import.meta.url);
const composition = `import { render as coreRender } from '@updf/core';
import { createHelvetica, fontRuntime, fontProvider } from '@updf/fonts';
import { createTextService } from '@updf/text';
const runtime = fontRuntime();
const options = {resources: {Helvetica: createHelvetica()}, text: createTextService({runtime, defaultFont: 'Helvetica'}), providers: [fontProvider(runtime)]};
const render = document => coreRender(document, options);`;
const inputs = {
  textOnly: `${composition}
export const pdf = (text) => render({version:1,pages:[{width:200,height:200,children:[{type:'text',x:10,y:10,width:180,height:20,text,font:'Helvetica',fontSize:12,lineHeight:16,align:'left'}]}]});`,
  paragraphFlow: `${composition}
import { document, flow, paragraph, layout, pageSize } from '@updf/layout';
export const pdf = (text) => render(layout(document({children:flow({pageSize:pageSize(200,200),children:paragraph({children:text})})}), options).document);`,
  fixedGeometry: `${composition}
export const pdf = (text) => render({version:1,pages:[{width:200,height:200,children:[{type:'rect',x:10,y:10,width:180,height:180,paint:{fill:[0.9,0.9,0.9],stroke:null}},{type:'text',x:20,y:20,width:160,height:20,text,font:'Helvetica',fontSize:12,lineHeight:16,align:'left'}]}]});`,
};
await mkdir(output, { recursive: true });
for (const [scope, contents] of Object.entries(inputs)) {
  if (process.argv[4] && process.argv[4] !== scope) continue;
  const result = await build({
    stdin: { contents, resolveDir: process.cwd(), sourcefile: `${scope}.js` },
    bundle: true,
    minify: true,
    target: "es2022",
    platform: "browser",
    format: "esm",
    metafile: true,
    write: false,
  });
  const bytes = result.outputFiles[0]?.contents;
  assert.ok(bytes);
  const modules = Object.entries(result.metafile?.inputs ?? {}).map(([id]) => id);
  const retained = Object.entries(result.metafile?.outputs ?? {}).flatMap(([, output]) =>
    Object.entries(output.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([id]) => id),
  );
  assert.ok(!retained.some((id) => /fontkit|pdfjs|\/svg\/|\/tables\/|node_modules\/react|selector/i.test(id)));
  const report: CostReport = {
    phase,
    scope,
    node: process.version,
    esbuild: version,
    input: contents,
    options: { target: "es2022", platform: "browser", format: "esm", minify: true },
    raw: bytes.length,
    gzip: gzipSync(bytes).length,
    retained,
    modules,
    metafile: result.metafile,
  };
  await writeFile(new URL(`${phase}-${scope}.json`, output), `${JSON.stringify(report, null, 2)}\n`);
  console.log({ phase, scope, raw: report.raw, gzip: report.gzip, retained: retained.length });
  if (phase === "after") {
    const before: {
      input: string;
      options: object;
      node: string;
      esbuild: string;
      raw: number;
      gzip: number;
      retained: string[];
    } = JSON.parse(await readFile(new URL(`before-${scope}.json`, output), "utf8"));
    assert.equal(before.input, report.input);
    assert.deepEqual(before.options, report.options);
    assert.equal(before.node, report.node);
    assert.equal(before.esbuild, report.esbuild);
    const delta = {
      scope,
      raw: report.raw - before.raw,
      gzip: report.gzip - before.gzip,
      added: retained.filter((id) => !before.retained.includes(id)),
      removed: before.retained.filter((id: string) => !retained.includes(id)),
    };
    await writeFile(new URL(`delta-${scope}.json`, output), `${JSON.stringify(delta, null, 2)}\n`);
    console.log(delta);
  }
}
