import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execute, root } from "./install.js";

export async function fontsProof(directory: string): Promise<void> {
  for (const name of ["LiberationSans-Regular.ttf", "liberation-sans.json"])
    await writeFile(join(directory, name), await readFile(join(root, "tests/fixtures/fonts", name)));
  await execute(
    directory,
    `
    import assert from 'node:assert/strict';
    import { readFileSync } from 'node:fs';
    import { render } from '@updf/core';
    import { createHelvetica, createPreparedFont, fontProvider, fontRuntime } from '@updf/fonts';
    import { createTextService } from '@updf/text';
    const prepared = createPreparedFont({
      ...JSON.parse(readFileSync('liberation-sans.json', 'utf8')),
      bytes: new Uint8Array(readFileSync('LiberationSans-Regular.ttf')),
    });
    const runtime = fontRuntime();
    const resources = { Helvetica: createHelvetica(), Demo: prepared };
    const options = { resources, text: createTextService({ runtime, defaultFont: 'Helvetica' }), providers: [fontProvider(runtime)] };
    const document = (font, text) => ({version: 1, pages: [{width: 200, height: 100, children: [{type: 'text', x: 10, y: 10, width: 180, height: 40, text, font, fontSize: 10, lineHeight: 12, align: 'left'}]}]});
    const helvetica = Buffer.from(render(document('Helvetica', 'Hello'), options)).toString('latin1');
    assert.ok(helvetica.includes('/BaseFont /Helvetica'));
    const unicode = Buffer.from(render(document('Demo', 'Москва'), options)).toString('latin1');
    assert.ok(unicode.includes('/Subtype /Type0'));
    assert.ok(unicode.includes('/ToUnicode'));
    assert.ok(!unicode.includes('/BaseFont /Helvetica'));
    const drawing = Buffer.from(render({version: 1, pages: [{width: 100, height: 100, children: []}]}, options)).toString('latin1');
    assert.ok(!drawing.includes('/Type /Font'));
  `,
  );
}
