import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";
import { build, type Plugin } from "esbuild";
import ts from "typescript";
import { profiles } from "../consumer/barcode-cost.js";

export type Variant = "original" | "stripped" | "rewrite";
export type Profile = "qrGeometry" | "qr" | "encoder";

async function historicalEntry(): Promise<string> {
  const source = await readFile(new URL("../../tests/fixtures/qr-baseline/qr.ts.txt", import.meta.url), "utf8");
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "24f65bee700a18f4d177c599cbb615a30afa1762dd5e5e9c244c6e04cdab4034",
  );
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
  }).outputText;
}

function stripped(source: string): string {
  const file = ts.createSourceFile("qrcode.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = new Set([
    "createTableTag",
    "createSvgTag",
    "createDataURL",
    "createImgTag",
    "createASCII",
    "renderTo2dContext",
  ]);
  const ranges: [number, number][] = [];
  function visit(node: ts.Node): void {
    if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
      const expression = node.expression,
        left = expression.left;
      if (expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(left)) {
        const owner = left.expression.getText(file),
          name = left.name.text;
        if ((owner === "_this" && names.has(name)) || (owner === "qrcode" && name === "createStringToBytes"))
          ranges.push([node.getStart(file), node.end]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(ranges.length, 7);
  for (const [start, end] of ranges.sort((a, b) => b[0]! - a[0]!)) source = source.slice(0, start) + source.slice(end);
  return source;
}

function plugin(variant: Variant): Plugin {
  return {
    name: variant,
    setup(builder) {
      if (variant !== "rewrite")
        builder.onLoad({ filter: /packages\/barcodes\/dist\/qr\.js$/ }, async ({ path }) => ({
          contents: await historicalEntry(),
          resolveDir: dirname(path),
          loader: "js",
        }));
      if (variant === "stripped")
        builder.onLoad({ filter: /qrcode-generator\/dist\/qrcode\.mjs$/ }, async ({ path }) => ({
          contents: stripped(await readFile(path, "utf8")),
          loader: "js",
        }));
    },
  };
}

export async function bundle(profile: Profile, variant: Variant) {
  const contents =
    profile === "encoder"
      ? "export {encodeQR} from './packages/barcodes/dist/qr-encoder/encoder.js';"
      : profiles[profile];
  const result = await build({
    stdin: { contents, resolveDir: process.cwd(), sourcefile: "consumer.ts", loader: "ts" },
    platform: "browser",
    conditions: ["browser"],
    target: "es2022",
    format: "esm",
    bundle: true,
    minify: true,
    write: false,
    metafile: true,
    plugins: [plugin(variant)],
  });
  const output = result.outputFiles[0]!;
  const modules = Object.keys(result.metafile.inputs);
  if (variant === "rewrite") assert.ok(!modules.some((path) => /node_modules\/qrcode-generator\//u.test(path)));
  if (profile === "encoder")
    assert.ok(modules.every((path) => path === "consumer.ts" || path.startsWith("packages/barcodes/dist/qr-encoder/")));
  return {
    profile,
    variant,
    raw: output.contents.length,
    gzip: gzipSync(output.contents).length,
    code: output.text,
    modules,
  };
}
