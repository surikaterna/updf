import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "vite";
import { fixture } from "./helpers.js";

test("actual browser ESM JPEG/core closure renders without Node, fonts, text or decoder dependencies", async () => {
  const modules: string[] = [];
  const source = `import {render} from '@updf/core'; import {prepareJpeg,jpeg,jpegProvider} from '@updf/jpeg';
    export function imagePdf(source){const photo=prepareJpeg(source);return render({version:1,pages:[{width:100,height:100,children:[jpeg('photo',{x:10,y:20,width:60,height:40})]}]},{resources:{photo},providers:[jpegProvider()]});}`;
  const result = await build({
    configFile: false,
    logLevel: "silent",
    plugins: [
      {
        name: "jpeg-browser-proof",
        resolveId(id) {
          return id === "jpeg-proof" || id.endsWith("/jpeg-proof") ? "\0jpeg-proof" : undefined;
        },
        load(id) {
          return id === "\0jpeg-proof" ? source : undefined;
        },
        generateBundle() {
          modules.push(...this.getModuleIds());
        },
      },
    ],
    build: { write: false, minify: false, lib: { entry: "jpeg-proof", name: "jpegProof", formats: ["iife"] } },
  });
  const output = Array.isArray(result) ? result[0] : result;
  assert.ok(output && "output" in output);
  const chunk = output.output.find((item) => item.type === "chunk");
  assert.ok(chunk?.type === "chunk");
  assert.ok(modules.some((id) => id.endsWith("/jpeg/dist/index.js")));
  assert.ok(modules.some((id) => id.endsWith("/core/dist/index.js")));
  assert.ok(
    !modules.some((id) =>
      /node:|\/packages\/(?:fonts|text|fontkit|svg|legacy)\/|\/dist\/(?:node|cjs)\/|\/src\//u.test(id),
    ),
  );
  const context = { Uint8Array, ArrayBuffer, jpegProof: undefined as unknown };
  runInNewContext(chunk.code, context);
  const api = context.jpegProof as { imagePdf(source: Uint8Array): Uint8Array };
  const pdf = api.imagePdf(fixture());
  assert.ok(Buffer.from(pdf).toString("latin1").includes("/Subtype /Image"));
});
