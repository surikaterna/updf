# Fontkite: bounded static TrueType feasibility prototype

YOLO implementation and self-validation, not independent audit. Ad-hoc request;
tracker N/A. Worktree `/home/sprawl/projects/updf/trees/fontkite`, branch
`feature/fontkite`, base/HEAD `aade3cb6bf487fac13ea7fef4f45bf2cdfba896b`.
All delivery changes are uncommitted. No staging, commits, push, PR or publication.

## Scope and decision

Add private `@updf/fontkite` with `prepareFont` at the default entry and `loadFont`
at `/load`. Both return the existing fonts-owned `PreparedFont`. Consumers select
this package or the unchanged `@updf/fontkit` adapter explicitly. Existing apps,
core, fonts and text runtime implementations were not changed.

This is a fresh small reader, not a trimmed fork or general Fontkit-compatible API.
It reads Unicode mappings, names/metrics, simple quadratic outlines and bounded
XY composite outlines. It derives ink from curves rather than stored glyph
rectangles. Empty outlines remain empty (including the fixtures' space glyph).
See [package contract](../../packages/fontkite/README.md) for exact supported
formats, exclusions, selection rules and budgets.

The prototype supports a **narrower** profile than the existing adapter: Unicode
cmap 4/12, OS/2 v2–5, Unicode names in name format 0, and unscaled XY component
offsets. Point attachment and explicit scaled offsets reject when reached.
No hint execution, checksums, comprehensive unused-glyph/table sanitization, or
malicious-font sandbox. Font programs are embedded whole; rights are checked but
not granted. No full Fontkit compatibility or general-font corpus claim.

Subpath exports, not separate feature packages, remain the expansion model.
Only `/load` is implemented. `/subset`, `/woff2`, shaping and other capabilities
are future work, not placeholder public APIs. The default bundle excludes asset
loading although `@updf/assets` remains an installed dependency of the package.

## Measured consumer costs

Reproduction after `npm run typecheck`:

```sh
npx tsx scripts/consumer/fontkite-cost.ts
```

The script uses identical application source except the selected adapter import,
esbuild browser conditions, ES2022, minified ESM, and gzip level 9. Preparation-only
profiles include their actual transitive shared dependencies, not just parser
source bytes. Font assets are excluded from JS sizes in both profiles.

| Profile | Minified JS bytes | Gzip bytes |
| --- | ---: | ---: |
| Fontkit application | 435,717 | 174,391 |
| Fontkite application | 71,566 | 25,022 |
| Fontkit prepare-only | 383,326 | 156,059 |
| Fontkite prepare-only | 19,461 | 7,328 |
| Fontkite `/load` | 25,719 | 9,269 |

Equivalent application gzip drops by **149,369 bytes (85.7%)**. This is a fresh
within-worktree comparison, not reuse of historical adapter measurements.
Emitted graphs assert no Fontkit, Brotli, restructure or Unicode-data dependency
in Fontkite, no source aliases or Node/CJS facades in browser bundles, and no
asset-loading code in its default entry. A negative source-edge test rejects
Fontkit/Brotli imports; drawing has neither parser.

Sequential warmed Node preparation medians (3 warmups, 10 samples per face):

| Face | Fontkit ms | Fontkite ms | Comparison PDF bytes |
| --- | ---: | ---: | ---: |
| Liberation Sans Regular | 35.925 | 12.163 | 412,637 |
| Liberation Sans Bold | 33.573 | 11.859 | 416,419 |

Timings are illustrative local measurements, not guaranteed improvements. An
earlier run concurrent with tests was slower for both; only the sequential run
is tabulated. Machine load, allocations/GC and fixed backend ordering can affect
these small samples. Memory use was not benchmarked.

Ignored `artifacts/fontkite/` retains emitted bundles, complete module lists and
Node version in `report.json`, comparison PDFs and Poppler raster smoke outputs.
Both PDFs are byte-identical between the two generated browser ESM application
bundles executed in Node. PDF sizes do not improve: no subsetting is performed.

## Correctness and quality evidence

- Both bundled Regular/Bold faces: **all 1,472 prepared mappings per face**, all
  descriptor fields and resource metadata exactly match Fontkit. Sample PDFs
  with Latin, accented Latin and Cyrillic match byte-for-byte.
- Synthetic tests independently cover quadratic extrema/control-box differences,
  off-curve starts and implied points, fractional outward rounding, short/repeated
  point flags, empty outlines, affine composites, invalid references, cycles,
  component depth and expanded-point budgets, cmap 4/12 and non-BMP mapping.
- Malformed table-local reads, directory overlap, loca/cmap/name corruption,
  unsupported formats, embedding restrictions and 80 deterministic table
  mutations/truncations produce structured errors rather than raw parser errors.
  This small mutation regression is not a sustained fuzzing campaign.
- Byte ownership, frozen metadata, URI capability requirements, cancellation,
  loader error mapping and shared Node ESM/CJS resource ownership are covered.
- Clean tarball installation needs neither Fontkit nor its parser dependencies;
  declaration consumers compile in NodeNext and Bundler without DOM/Node ambient
  types. Real Chromium root and `/load` preparation matches Node Fontkit metadata
  for both faces, with neither `Buffer` nor `process` in the page.

| Exact command | Final outcome |
| --- | --- |
| `npm run format:check` | pass |
| `npm run lint` | pass, including 400-line / 49-line / depth-3 AST gates |
| `npm run typecheck` | pass, full package builds plus workspace tests/scripts types |
| `npm test` | **1,048 pass**, zero failures/skips/cancellations |
| `npx tsx --test packages/fontkite/test/*.test.ts tests/consumer/fontkite-*.test.ts tests/browser/browser-fontkite.test.ts` | **24 pass**, final focused rerun |
| `npx tsx --test tests/browser/browser-fontkite.test.ts` | **1 pass**, actual default Chromium, no rendering override |
| `npx tsx scripts/consumer/fontkite-cost.ts` | pass, graph/byte parity plus qpdf, extraction and raster smoke checks |
| `npm run check:licenses` | pass, all 14 tarballs including Fontkite, no bundled font fixtures |
| `git diff --check` | pass |

The cost script executes `qpdf --check artifacts/fontkite/{Regular,Bold}.pdf`,
`pdftotext artifacts/fontkite/{Regular,Bold}.pdf -` (asserting Москва), and
`pdftoppm -singlefile -scale-to 256 -png artifacts/fontkite/{Regular,Bold}.pdf`.
Raster checks assert successful PNG production, not a new visual-quality oracle.
Byte-identical PDFs provide the rendering-preservation evidence against Fontkit.

Initial local checks caught test callback/import lint, an intentionally malformed
options fixture needing an explicit type cast, and a VM test passing a foreign-realm
typed array to the same-realm prepared-font API. Tests were corrected, not parser
contracts relaxed. Final gates were run sequentially after builds; no failing
check was waived. The existing arithmetic negative-control test intentionally
prints an esbuild syntax diagnostic within an otherwise passing test run.

Full showcase/browser suites and the separate legacy-wide packed-consumer runner
were not rerun; no app/runtime changes were made. The new tarball proof and emitted
browser graph proof are part of `npm test`; the new Chromium test was run directly.
No claim is made about unrelated historical browser/GPU issues.

## Principles and next step

Self-check: cohesive production files, bounded functions/nesting, intent comments,
risk-based tests, no new suppressions or principles exceptions. Binary offsets,
counts, quotas, flag checks and derivative-root domains use exact validation.
Curve extrema are derived binary64 geometry rounded outward with floor/ceil for
the existing font-unit metadata contract; no layout-fit comparisons or tolerances
were changed. General bitwise curve parity across other fonts is not promised.
No Changesets setup exists; this package remains private and unpublished.

**Feasibility result: worth continuing, not ready to replace the default adapter.**
Next step is a broader licensed static-font corpus and a deliberate decision on
which currently rejected name/cmap/composite variants to support. Keep opt-in until
that compatibility evidence and parser hardening justify production adoption.
