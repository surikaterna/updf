# Microkernel playground — optional Slice D

Private MIT workspace `@updf/layout-playground`. Plain DOM + SVG, Vite and TypeScript;
no React, editor framework, runtime compiler, evaluation, PDF.js, font assets, or new
external dependencies. This is a bounded inspector, not an arbitrary document editor.

From the workspace root:

```sh
npm run build -w @updf/layout-kernel
npm run build -w @updf/core
npm run test -w @updf/layout-playground
npm run build -w @updf/layout-playground
npm run test:browser -w @updf/layout-playground
# Optional interactive session, only after confirming port 4318 is available:
npm run dev -w @updf/layout-playground -- --host 127.0.0.1 --port 4318 --strictPort
```

No development server is left running by the implementation. Browser tests use an
ephemeral loopback preview port, never 4317, and close browser/server in `finally`.
They use `BROWSER_CHROMIUM` or `/usr/bin/chromium`, matching existing project tests.
Node PDF tests require `qpdf`, `pdftotext`, and `pdftoppm` on PATH. Allow up to 600000ms
for the full test commands. Generated evidence is under this app's ignored `artifacts/`;
the built site and module/chunk evidence are under this app's ignored `dist/`.
The static build includes the complete project MIT notice in `dist/notices/LICENSE`.

## Contract and controls

- Boxes use public `@updf/layout-kernel/boxes` `layoutBoxes` with a typed readonly
  indexed view borrowing the actual source records; there is no input-tree clone.
  Width, gap, padding and row cross alignment are real kernel inputs. Height is the
  minimum canvas height or the finite page region height, not a CSS geometry trick.
  Column alignment is start only; its alignment control is disabled and explained.
- The PDF preset lazily loads `src/pdf.ts`, which alone imports public core
  measurement/render APIs. It measures ASCII printable + LF text once per computation
  at its selected width: Helvetica 14pt, line height 18pt, left aligned. Measurement
  lines/fragments/baselines and original UTF-16 spans remain available in read-only JSON.
  No row labels are painted in PDF (therefore no unmeasured text is invented).
- Canvas mode uses B to place the full paragraph and actual B row in a normal natural
  column. Its height grows to fit all content. It does not import C.
- Only finite-pages selection imports `src/pagination.ts` and public
  `createFragmentOperation`. One enclosing operation consumes prepared line-index
  units, each charged with `work.consume(1)`; the row is one extent-1 atomic unit with
  the actual B height, not fragmentable children. Fresh unique regions have constant
  width, finite height, used height zero. Every operation closes in `finally`.
- Page cap defaults to 8, hard maximum 20. The cumulative limits are attempts 21,
  sourceReads 40, sourceVisits 200, measurements/unitsExamined/providerUnits 1000,
  outputFragments 2000; they never reset between pages. Cap/blocked results show the
  accepted **INCOMPLETE** prefix and disable download. Blocked metadata reports the
  next known indivisible unit's actual size, not a speculative global diagnosis.
- Width 120–800, height 18–1200, gap 0–40, padding 0–30 and cap 1–20 must be integers;
  fractional/empty/invalid inputs are rejected, never rounded. Paragraph input is
  limited to 8000 UTF-16 units. Unsupported text/control characters reject with
  structured code/path errors. All user/source text uses `textContent`, never HTML.

## One accepted projection, three consumers

`projection.ts` projects B offsets from each parent's **content** origin, preserving
explicit padding insets. SVG, metadata and PDF consume this same accepted projection.
The outer margin is 20 PDF points per side; each PDF page's physical size is selected
region width/height plus 40, **not A4** and not the user-declared page cap. Blank lines
retain geometry but emit no text node. Allocated rectangles are painted; dashed content
and dotted line guides are SVG inspection aids, not claims of kernel border painting.

PDF download lowers only accepted nonempty measured lines to native fixed text at
the selected width/font/line height and accepted region position. It validates line
reconstruction through public `measureText`; public `render` also validates and
remeasures native text. This is **not zero-remeasurement**. The whole paragraph,
flow/paginator, B/C placement, and private serializers are never rerun for export.
Snapshots and projection records are readonly/frozen and export does not mutate them.
Placement `start`/`end` ranges count prepared line indices or atomic units; fragment
`source.start`/`source.end` are separate original-string UTF-16 offsets. Hard LF breaks
and empty paragraphs remain represented; whitespace is not reconstructed by splitting
words. No automatic headers or final page contexts are provided (#55).

Source/fragment buttons and SVG selection highlight actual IDs/paths. Keyboard users
can Tab to a source button and use Enter/Space. Controls have labels and status is
aria-live. At 320px, only the labeled geometry pan container intentionally scrolls
horizontally. Invalid inputs retain the last accepted geometry with an explicit error;
download is disabled. Debounce plus a generation token prevents late imports/results
from replacing newer selections.

## Validation scope and non-goals

App tests are separate from root's 687-test A–C regression suite. They exercise public
PDF reconstruction, whitespace/LF/UTF-16 coverage, one-operation bounded selection,
atomic row positions, native qpdf/Poppler bbox/raw extraction and raster checks,
actual negative PDFs, mobile controls/keyboard, download-byte parity, lazy request
boundaries, and stale-import supersession. SVG fonts are illustrative; native PDF
bbox/raster evidence is the font/geometry proof. See
`../../docs/evidence/layout-kernel-d.md` for the real execution manifest.

Kernel/core/layout production code is unchanged. No public Box TSX API is implemented
or claimed, no arbitrary code editor is included, and no deployment is authorized.
No Changeset is needed for this private app. The only local lint exception is Vite's
required default config export, matching existing workspace config conventions.
