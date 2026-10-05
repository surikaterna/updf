export const coreRuntime = `
import assert from 'node:assert/strict';
import { render, DocumentError } from '@updf/core';
import { point, identity } from '@updf/core/painting';
import { lower } from '@updf/core/vdom';
import { jsx } from '@updf/core/jsx-runtime';
import { jsxDEV } from '@updf/core/jsx-dev-runtime';
const page = jsx('page', { width: 100, height: 100 });
const tree = jsxDEV('document', { version: 1, children: page });
assert.ok(render(lower(tree)) instanceof Uint8Array);
assert.deepEqual(point(identity, 2, 3), [2, 3]);
assert.ok(!Buffer.from(render(lower(tree))).toString('latin1').includes('/Type /Font'));
assert.throws(() => render({version: 2, pages: []}), DocumentError);
for (const entry of ['@updf/core/fonts', '@updf/core/measurement'])
  await assert.rejects(import(entry), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
`;

export const geometryRuntime = `
import assert from 'node:assert/strict';
import { DocumentError } from '@updf/core';
import { parsePathData } from '@updf/geometry';
assert.equal(parsePathData('M0 0L1 1').length, 2);
assert.throws(() => parsePathData('???'), DocumentError);
`;

export const svgRuntime = `
import assert from 'node:assert/strict';
import { render, DocumentError } from '@updf/core';
import { h, lower } from '@updf/core/vdom';
import { renderSVG, SVGError } from '@updf/svg';
import { Svg } from '@updf/svg/tree';
const source = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const node = renderSVG(source, {x: 0, y: 0, w: 10, h: 10});
const tree = h('document', {version: 1, children: h('page', {width: 100, height: 100, children: h(Svg, {source, x: 0, y: 0, w: 10, h: 10})})});
assert.deepEqual(render(lower(tree)), render({version: 1, pages: [{width: 100, height: 100, children: [node]}]}));
assert.throws(() => renderSVG('???', {x: 0, y: 0, w: 10, h: 10}), DocumentError);
assert.ok(new SVGError('SVG_XML', '', 'proof', {start: 0, end: 1}) instanceof DocumentError);
`;

export const fontkitRuntime = `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render, DocumentError } from '@updf/core';
import { prepareFont } from '@updf/fontkit';
import { fontProvider, fontRuntime } from '@updf/fonts';
import { createTextService } from '@updf/text';
import { h, lower } from '@updf/core/vdom';
const font = prepareFont(new Uint8Array(readFileSync('fixture.ttf')));
const runtime = fontRuntime();
const options = { resources: {Demo: font}, text: createTextService({runtime, defaultFont: 'Demo'}), providers: [fontProvider(runtime)] };
const bytes = render({version: 1, pages: [{width: 100, height: 100, children: [{type: 'text', x: 10, y: 10, width: 80, height: 20, text: 'Привет', font: 'Demo', fontSize: 10, lineHeight: 12, align: 'left'}]}]}, options);
assert.ok(bytes.length > 400000);
const tree = h('document', {version: 1, children: h('page', {width: 100, height: 100, children: h('text', {x: 10, y: 10, width: 80, height: 20, text: 'Привет', font: 'Demo', fontSize: 10, lineHeight: 12, align: 'left'})})});
assert.deepEqual(render(lower(tree, options), options), bytes);
assert.throws(() => prepareFont(new Uint8Array()), DocumentError);
`;
