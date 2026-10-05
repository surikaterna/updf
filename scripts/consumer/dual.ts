import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execute, root } from "./install.js";
import { fontsRuntime, hostRuntime } from "./dual-text.js";

export async function publicEntries(directory: string, names: readonly string[]): Promise<string[]> {
  const entries: string[] = [];
  for (const name of names.filter((name) => !["cmr", "legacy"].includes(name))) {
    const manifest: { name: string; exports: Record<string, unknown> } = JSON.parse(
      await readFile(join(directory, "node_modules/@updf", name, "package.json"), "utf8"),
    );
    for (const path of Object.keys(manifest.exports)) entries.push(manifest.name + (path === "." ? "" : path.slice(1)));
  }
  return entries;
}

export async function dualProof(directory: string, names: readonly string[]): Promise<void> {
  const entries = await publicEntries(directory, names);
  if (!entries.length) return;
  if (names.includes("fonts")) {
    for (const file of ["liberation-sans.json", "LiberationSans-Regular.ttf"])
      await writeFile(join(directory, file), await readFile(join(root, "tests/fixtures/fonts", file)));
  }
  for (const order of ["require", "import"]) {
    await execute(
      directory,
      String.raw`
      import assert from 'node:assert/strict';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      for (const entry of ${JSON.stringify(entries)}) {
        const first = ${order === "require" ? "require(entry)" : "await import(entry)"};
        const second = ${order === "require" ? "await import(entry)" : "require(entry)"};
        assert.deepEqual(Object.keys(first).filter(k => k !== '__esModule').sort(), Object.keys(second).sort(), entry);
        assert.equal('default' in first, false, entry);
        assert.equal('default' in second, false, entry);
        for (const key of Object.keys(second)) assert.equal(first[key], second[key], entry + ':' + key);
        assert.match(require.resolve(entry), /\/dist\/cjs\//u);
        assert.ok(Object.keys(require.cache).every(path => !path.endsWith('.mjs')), 'require must load only CJS');
      }
      ${names.includes("core") ? mixedRuntime : ""}
      ${names.includes("text") && !names.includes("fonts") ? hostRuntime : ""}
      ${names.includes("fonts") && names.includes("text") ? fontsRuntime : ""}
      ${names.includes("layout") ? layoutRuntime : ""}
      ${names.includes("svg") ? svgRuntime : ""}
      ${names.includes("fontkit") ? fontkitRuntime : ""}
    `,
    );
  }
  await writeFile(
    join(directory, "require-only.cjs"),
    entries.map((entry) => `require(${JSON.stringify(entry)});`).join("\n"),
  );
  execFileSync(process.execPath, ["--no-experimental-require-module", "require-only.cjs"], {
    cwd: directory,
    stdio: "pipe",
  });
  await mixedTypes(directory, entries);
}

async function mixedTypes(directory: string, entries: readonly string[]): Promise<void> {
  const common = entries
    .map((entry, i) => `import p${i} = require(${JSON.stringify(entry)});\nexport type P${i} = typeof p${i};`)
    .join("\n");
  const esm = entries
    .map(
      (entry, i) =>
        `import * as p${i} from ${JSON.stringify(entry)};\nimport type { P${i} } from './mixed.cts';\nconst c${i}: P${i} = p${i};\nconst e${i}: typeof p${i} = c${i};\nvoid e${i};`,
    )
    .join("\n");
  const brands = entries.includes("@updf/fonts")
    ? `
    export type Font = import('@updf/fonts').PreparedFont;
    export type Owned = import('@updf/core/resources').OwnedResource;
    export type Run = import('@updf/core/resources').TextRun;
    export type Context = import('@updf/core/vdom').Context<Font>;
  `
    : "";
  const aliases = brands
    ? `
    import type { Font, Context, Owned, Run } from './mixed.cts';
    import type { PreparedFont } from '@updf/fonts';
    import type { OwnedResource, TextRun } from '@updf/core/resources';
    import type { Context as EContext } from '@updf/core/vdom';
    export function brands(f: Font, e: PreparedFont, c: Context, ec: EContext<PreparedFont>): void {
      f = e; e = f; c = ec; ec = c; void [f, e, c, ec];
    }
    export function resources(a: Owned, b: OwnedResource, r: Run, s: TextRun): void {
      a = b; b = a; r = s; s = r; void [a,b,r,s];
    }
  `
    : "";
  await writeFile(join(directory, "mixed.cts"), common + brands);
  await writeFile(join(directory, "mixed.mts"), esm + aliases);
  await compileMixedTypes(directory);
  assert.ok(entries.length);
}

async function compileMixedTypes(directory: string): Promise<void> {
  const tsc = join(root, "node_modules/typescript/bin/tsc");
  await writeFile(
    join(directory, "mixed-tsconfig.json"),
    JSON.stringify({
      compilerOptions: { noEmit: true, strict: true, module: "NodeNext", target: "ES2022", types: [] },
      files: ["mixed.cts", "mixed.mts"],
    }),
  );
  execFileSync(process.execPath, [tsc, "-p", "mixed-tsconfig.json"], { cwd: directory, stdio: "pipe" });
  execFileSync(
    process.execPath,
    [tsc, "-p", "mixed-tsconfig.json", "--module", "Preserve", "--moduleResolution", "Bundler"],
    { cwd: directory, stdio: "pipe" },
  );
}

const mixedRuntime = `
  const c = require('@updf/core'), e = await import('@updf/core');
  const cv = require('@updf/core/vdom'), ev = await import('@updf/core/vdom');
  const cj = require('@updf/core/jsx-runtime'), ej = await import('@updf/core/jsx-dev-runtime');
  const context = cv.createContext('default');
  const Reader = () => ev.useContext(context);
  const tree = cv.h(context.Provider,{value:'mixed',children:ej.jsxDEV('document',{version:1,children:cj.jsx('page',{width:100,height:100,children:ev.h(() => {assert.equal(Reader(),'mixed');return null;},{})})})});
  assert.deepEqual(e.render(cv.lower(tree)), c.render(ev.lower(tree)));
  assert.throws(() => c.render({version:2,pages:[]}), e.DocumentError);
  assert.throws(() => ev.useContext(context), c.DocumentError);
  const cr = require('@updf/core/resources'), er = await import('@updf/core/resources');
  for (const create of [cr.createOwnedResource, er.createOwnedResource]) {
    const resource = create({opaque:true},{byteLength:7});
    assert.equal(cr.isOwnedResource(resource),true);
    assert.equal(er.isOwnedResource(resource),true);
    assert.equal(er.ownedResourceBytes(resource),7);
    const drawing = {version:1,pages:[{width:100,height:100,children:[]}]};
    assert.deepEqual(c.render(drawing,{resources:{Demo:resource}}),e.render(drawing,{resources:{Demo:resource}}));
  }
`;

const layoutRuntime = `
  const cl = require('@updf/layout'), el = await import('@updf/layout');
  const recipe = cv.h(cl.Paragraph,{children:'mixed recipe'});
  assert.equal(el.measure(recipe,{width:100}, fontOptions).size.height,10);
  let measurements = 0;
  const adapter = cl.defineInlineAdapter({name:'mixed.adapter',validate:p=>p,measure:()=>{measurements++;return {advance:2,ascent:1,descent:0,inkBounds:{empty:true},nodes:[]};}});
  const content = el.paragraph({children:cl.inline(adapter,{})});
  assert.equal(cl.measure(content,{width:100},{...fontOptions,extensions:el.createExtensions([adapter])}).size.width,100);
  assert.ok(measurements > 0);
`;

const svgRuntime = `
  const cs = require('@updf/svg'), es = await import('@updf/svg');
  assert.ok(new cs.SVGError('SVG_XML','','mixed',{start:0,end:1}) instanceof e.DocumentError);
  assert.throws(()=>es.renderSVG('???',{x:0,y:0,w:10,h:10}),c.DocumentError);
`;

const fontkitRuntime = `
  const ck = require('@updf/fontkit'), ek = await import('@updf/fontkit');
  for (const prepare of [ck.prepareFont,ek.prepareFont]) {
    const font = prepare(new Uint8Array(readFileSync('fixture.ttf')));
    assert.equal(require('@updf/core/resources').isOwnedResource(font),true);
    const context = cv.createContext({font});
    const Reader = () => {assert.equal(ev.useContext(context).font,font);return null;};
    ev.lower(cj.jsx('document',{version:1,children:cj.jsx('page',{width:100,height:100,children:cv.h(Reader,{})})}));
    const definition = {version:1,pages:[{width:100,height:100,children:[{type:'text',x:0,y:0,width:90,height:12,text:'mixed',font:'Demo',fontSize:10,lineHeight:12,align:'left'}]}]};
    const options = {...fontOptions,resources:{Demo:font}};
    assert.deepEqual(c.render(definition,options),e.render(definition,options));
  }
  assert.throws(()=>ck.prepareFont(new Uint8Array()),e.DocumentError);
`;
