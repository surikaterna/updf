# Browser bundle comparison — 2026-10-12

Measured against uPDF native source revision `679eda9` (private/unreleased
`2.0.0-poc.0`, including optional PNG). This is an application bundle experiment,
not npm download size, runtime memory, speed, a feature-equivalence claim, or a
completed bundle-regression budget. The separate uncommitted showcase code-view
worktree does not change the measured library packages.

## Reproduce

From the worktree root, with Node 24+, Chromium, qpdf and Poppler installed:

```sh
npm ci --ignore-scripts
npm run build
npm ci --prefix scripts/bundle-comparison --ignore-scripts --no-audit --no-fund
SHOWCASE_CHROMIUM=/usr/bin/chromium npx tsx scripts/compare-bundles.ts
```

Competitors and their transitive dependencies are pinned in a separate fixture
manifest/lock; none is added to uPDF runtime dependencies or the main workspace
install. Benchmark entry sources are maintained in
[`updf.ts`](../scripts/bundle-comparison/updf.ts) and
[`competitors.ts`](../scripts/bundle-comparison/competitors.ts).

Output under `artifacts/bundle-comparison/` includes each emitted entry/chunk,
input source, esbuild metafile, generated PDF, and a JSON report containing exact
byte counts, dependency graphs, actual browser requests, validation results,
asset sizes, versions, options and lock hash. Do not publish the generated
third-party bundles as website assets without reviewing their distribution notices.

## Method

- Node **24.21.0**, esbuild **0.28.2**, ES2022 browser ESM, production mode,
  minification and tree-shaking, code splitting enabled, license comments retained
  at EOF. No aliases to private uPDF source or Node implementations.
- **KiB = 1,024 bytes**. Gzip level 9 and Brotli quality 11; each emitted file is
  compressed separately, then summed. Real HTTP compression settings can differ.
- **Initial** includes the entry plus its static import closure. **All emitted**
  additionally includes dynamic chunks. jsPDF emits optional HTML dependencies
  that are not fetched by these PDF-generation workloads; they are not charged
  to its initial transfer but are reported separately.
- All runtimes are bundled, including React for React-PDF. No React credit is
  assumed for an app that already ships React; incremental cost in such an app
  can be lower. React-PDF's bundled Yoga/WebAssembly code is included.
- Payloads are runtime inputs so the bundler cannot precompute away rendering.
  All **30 profiles pass in actual Chromium**. The 28 PDF profiles additionally
  pass `qpdf --check`; supplied text is checked by `pdftotext`, and image profiles
  by `pdfimages -list`, including soft masks for alpha. Two measurement-only
  profiles execute measurement rather than producing PDFs. This is smoke
  validation, not a comprehensive visual, shaping, throughput or hostile-input test.
- No PDF.js viewer, showcase UI, input data, external font files or images are
  included in JS sizes. The explicitly labeled pdfmake Roboto VFS profile is the
  exception: its bundled font data is included. Assets are listed separately.
- The pinned competitor fixture lock SHA-256 is
  `f2d497c8e2167ef550ea5d60823d08438a832f1bec55c78915a020bdb1c846b6`.

## uPDF combinations

These are complete measured combinations, **not additive package sizes**.
Shared code and compression make adding row values incorrect.

| Combination | Minified KiB | Gzip KiB | Brotli KiB |
| --- | ---: | ---: | ---: |
| Drawing only | 34.9 | 12.1 | 10.9 |
| Text + Helvetica | 56.8 | 19.6 | 17.6 |
| Text + Helvetica + native TSX | 75.3 | 25.2 | 22.4 |
| Measurement only, caller-supplied metrics | 21.1 | 7.3 | 6.6 |
| Measurement only, Helvetica | 24.6 | 8.7 | 7.8 |
| Text + preprocessed font descriptor | 61.0 | 20.9 | 18.6 |
| Text + client-side Fontkit parser | 425.5 | 170.3 | 150.4 |
| JPEG only | 41.3 | 14.5 | 13.0 |
| PNG/alpha only | 50.6 | 19.1 | 17.2 |
| JPEG + PNG/alpha | 56.8 | 21.0 | 18.9 |
| Text + JPEG | 63.0 | 22.0 | 19.7 |
| Text + PNG/alpha | 72.3 | 26.8 | 23.8 |
| Text + JPEG + PNG/alpha | 78.5 | 28.9 | 25.5 |
| Drawing + SVG adapter | 61.2 | 21.0 | 18.9 |
| Layout + Paragraph/Span + Helvetica | 186.7 | 60.5 | 52.2 |
| Layout + tables + Helvetica | 202.0 | 65.3 | 56.0 |
| Layout + tables + SVG + JPEG + PNG + Helvetica | 250.2 | 83.4 | 71.8 |
| Same combination + client-side Fontkit | 619.3 | 233.9 | 204.4 |

Layout rows exercise text/Span layout, the table row adds a real table, and the
combined row includes real native image and SVG content in atomic flow blocks.
They are not empty imports. All uPDF profiles currently emit one JS chunk in
this configuration, so initial and all-emitted sizes are equal.

## Competitors

Published browser entry points; pinned npm versions available on the measurement
date. “Text + images” means supplied text plus one JPEG and one PNG with alpha.
The workloads overlap, but these libraries retain different broader capabilities.

| Library / workload | Minified KiB | Initial gzip KiB | Initial Brotli KiB | All emitted gzip KiB |
| --- | ---: | ---: | ---: | ---: |
| pdf-lib **1.17.1**, Helvetica text | 426.2 | 176.0 | 161.4 | 176.0 |
| pdf-lib, text + images | 426.3 | 176.0 | 161.3 | 176.0 |
| pdf-lib + **@pdf-lib/fontkit 1.1.1**, custom TTF text | 1343.5 | 537.2 | 416.3 | 537.2 |
| jsPDF **4.2.1**, Helvetica text | 409.5 | 133.3 | 112.9 | 243.8 |
| jsPDF, text + images | 409.6 | 133.4 | 112.6 | 243.8 |
| PDFKit **0.20.2**, Helvetica text | 527.7 | 211.8 | 183.4 | 211.8 |
| PDFKit, text + images | 527.8 | 211.8 | 183.4 | 211.8 |
| pdfmake **0.3.11**, Helvetica family + text | 1286.8 | 410.4 | 317.1 | 410.4 |
| pdfmake, Helvetica family + text + images | 1287.0 | 410.6 | 317.1 | 410.6 |
| pdfmake, text + bundled Roboto VFS | 1840.2 | 811.5 | 604.3 | 811.5 |
| React-PDF **4.9.0** + React **19.3.0**, text | 1215.1 | 446.4 | 372.1 | 446.4 |
| React-PDF + React, text + images | 1215.4 | 446.5 | 372.1 | 446.5 |

PDFKit uses its public browser ESM export and explicitly registers only Helvetica,
not an obsolete standalone bundle. The fixture uses the npm alias `pdfkit-current`
to avoid replacing React-PDF's exact PDFKit **0.20.1** dependency with **0.20.2**.
Its locked dependency graph is deduplicated so React-PDF's renderer and font store
share the same PDFKit instance. No bundler resolution override patches a competitor.

pdfmake's supplied Helvetica family container contains four standard faces and
their required AFM data. Omitting that data produced a smaller but broken browser
bundle; it is not reported as a valid result. Roboto is separately measured as
the common batteries-included alternative. The dependency-lock correction above
likewise removed a broken duplicate-PDFKit React-PDF configuration before recording
these successful results.

## Assets and practical interpretation

| External input asset | Raw KiB | Gzip KiB | Brotli KiB |
| --- | ---: | ---: | ---: |
| Liberation Sans Regular TTF | 401.1 | 208.3 | 165.1 |
| Preprocessed descriptor JSON | 364.9 | 30.1 | 19.9 |

Both the descriptor **and** the TTF are needed by the preprocessed-font profile.
The Fontkit profile needs the TTF but not the descriptor. Thus preprocessed
custom-font text is roughly **259.3 KiB gzip including these assets**, not merely
20.9 KiB; client-parsed custom-font text is roughly **378.6 KiB including this TTF**.
This fixture includes full font bytes; it is not a claim about optimized web fonts,
subsetting, caching, or the assets needed by every real document.

The original JPEG fixture is 821 bytes; the original RGBA PNG is 117 bytes.
These tiny synthetic assets demonstrate feature retention, not typical photograph
download cost. Real image payloads often dominate the generator runtime.

The useful uPDF story is **pay for the features you use**, not “always tiny”:

- Fixed Helvetica text is about **6.8× smaller than jsPDF** and **9.0× smaller
  than pdf-lib** in initial gzip for these workloads.
- Text plus both image formats remains about **28.9 KiB gzip**.
- The broader layout/table/SVG/image combination is about **83.4 KiB gzip**.
- Native TSX adds about **5.6 KiB gzip** over fixed JSON text in these fixtures.
- Client-side font parsing adds about **150 KiB gzip**. Keep it optional, use
  prepared descriptors when suitable, and show the real font asset cost.
- uPDF's supported JPEG/PNG/SVG/font/text profiles are deliberately bounded.
  Competitors offer different features, including PDF editing, broader font and
  language handling, HTML conversion or React layout. These numbers do not show
  that uPDF replaces all those capabilities, nor that it is faster or safer.

This harness is self-validated, not independently audited. It changes benchmark
tooling/documentation only; no package runtime, publishing or deployment is changed.
