# Canonical native visuals: S1 + S2 integration

## Provenance and bounded scope

Issue **N/A**. Worktree `/home/sprawl/projects/updf/trees/native-visuals`, branch
`feature/native-visuals`, unchanged HEAD/base
`c61d0dd4c724fe4442c0a2251f34c232f969954d`. Stack target is
`feature/layout-native-admission` (PR86), not develop `c48b5a3d`.
These are uncommitted integrated changes, **implemented, independent audit pending**;
no staging, commits, delivery or tracker mutations are part of this assignment.

S1 supplied thirteen owned dirty files: canonical `fixed`, exact optional width,
and `nativeInline` using the existing owned inline registry/cache/capture owner.
S2 preserves every S1 byte, including all four new layout test files and the packed
native TSX fixture. The entry manifest SHA256 is
`0fc93175bec4acc2d1938c5a3d9e48b6b8e6990ecab53e6afa52e455f131aa1f`;
all 41 entries (including original PR86 tests and baseline evidence) matched.
Local `artifacts/native-visuals-s2/manifest.json` records final delivery hashes.

S2 replaces `svgBlock`'s adapter with canonical `fixed({ width, height, children })`
and `svgInline`'s adapter with `nativeInline({ advance: width, ascent: height, nodes })`.
Both return explicit public types. Both SVG adapters, their props validator and
`svgAdapters` are deleted: no retained tuple, alias, compatibility scaffold, global
registry, dependency or package. Prepared handle authentication, size inference,
compiler, explicit clipping, warnings/XML diagnostic spans and source limits are
unchanged. Scalar/native validation and quotas remain layout-owned.

Showcase table/Row and browser inline consumers no longer install SVG, but retain
table/chart/badge adapters and font/PNG/barcode features. Packed tests exercise
real block **and** inline construction/layout/render across ESM/CJS in both import
orders and both layout loaders, plus missing optional peer and strict type modes.
Current usage/API/ownership docs are updated. Historical evidence and frozen SVG
cost fixtures remain immutable; their old observations are not current results.

## Correctness and numerical boundaries

- Direct nonempty SVG `[4.9, 0.1]` / 5 and `[1.2, 1.1]` / 2.3 now certify one page.
- `[0.1, 0.2]` / 0.3 and three 10.3 / 30.9 at origin zero require two pages,
  **not** a geometry error. At translated origins 10 and 700 these certify one page.
- Tests assert every authored height, explicit visual width, non-overlapping native
  endpoints, and measured nonempty native ink bounds—not page count alone.
- Comfortable Block/Row/Column and styled table compositions pass; legitimate
  capacity defer remains. Explicit meet/slice/none clips remain byte-identical.
- Shared nonempty XML/TSX fixtures compare complete native documents and PDF bytes
  in Node and Chromium, for both corrected one-page and legitimate two-page cases,
  plus inline. qpdf checks/counts each PDF; Poppler Cairo raster at 720 DPI is
  nonempty on every page without resizing. Fractional page pixel height permits
  Poppler's ceil rounding (0.3pt can become four rows), not geometry relaxation.

No shared arithmetic, comparison, admission certificate, parent framework or CPU
algorithm is changed. Direct built-in fixed identity is still the only PR86
admission owner. Nested numerical-edge parent certificates can still fail
`GEOMETRY`; there is no all-nested-fit promise, clipping/shift/resize workaround,
generic adapter deletion, or duplication of PR86/other PR work.

## Paired net costs (bytes)

Node v24.21.0, esbuild 0.28.2, TypeScript 5.9.3. Same browser/ESM/ES2022 options,
raw and minified bundles, Node default gzip. `artifacts/native-visuals-s1/base.json`
and metafiles were captured physically **before** S1; S1 reports are not overwritten.
The new `artifacts/native-visuals-s2/evidence.mjs` phase validates pinned Git source
hashes, reconstructs base modules read-only through a TypeScript/esbuild source
overlay, and requires **all five** old profiles' raw/minified byte hashes to
reproduce the physical baseline exactly before using that overlay for a new paired
equivalent-operation profile. Reports/metafiles are stored in the new S2 namespace.

| Profile | Raw base → S2 | Minified base → S2 | Gzip base → S2 (delta) |
| --- | ---: | ---: | ---: |
| Core render | 67136 → 67136 | 35558 → 35558 | 12272 → 12272 (0) |
| Full layout exports, no SVG | 316433 → 318569 | 162552 → 163772 | 51882 → 52224 (+342) |
| SVG XML exports | 58603 → 58603 | 32853 → 32853 | 11815 → 11815 (0) |
| SVG TSX + runtime exports | 66084 → 66084 | 36200 → 36200 | 12670 → 12670 (0) |
| SVG/layout whole exports | 249380 → 248623 | 127512 → 127002 | 41135 → 41018 (−117) |
| Equivalent dynamic block + inline construction/layout/render | 371439 → 370191 | 189597 → 188852 | 60872 → 60708 (−164) |

Core/XML/TSX are byte-identical, not merely equal in size. Whole SVG/layout exports
are a **narrower public surface** after tuple deletion, not the same operation.
The equivalent profile takes a dynamic prepared handle/width/height, supplies the
same explicit no-font text service and resources, and performs both placements and
rendering; only the base installs the SVG adapters it requires. An additional
same-closure preparation proof yields identical 812-byte PDFs (SHA256
`a5d94e61849dcebef31b76d16172f82613fdb4c302ad568be6e2c86823fbb17b`).

Graphs retain no XML/JSX/structured parser in SVG/layout or equivalent usage.
SVG/layout parsed/retained modules: 219/126 → 220/127; equivalent: 219/183 →
220/184. The extra cohesive module is `fixed-data`, not a new registry/framework.
Physical production source lines: layout 8064 → 8146 (+82 including factories,
types and shared source branch), SVG 1640 → 1605 (−35 removing adapters/validation),
net **+47**; migrated app production files save another 12 lines (integrated +35).
These are net physical lines including blanks/comments, not a claim of LOC savings.
The full-layout +342 gzip overhead buys canonical factories and exact width;
SVG consumers recover modest net savings. No timing/speed/CPU claim is made.

`npm run sizes -- . current artifacts/native-visuals-s2/sizes` also passes its
standard graphs and package/asset measurements (not these paired profiles).
Its drawing/Helvetica/prepared/measurement-host/JPEG/JPEG-mixed gzip sizes are
12334/20065/21367/7469/14811/23840; fonts/barcode/PNG functionality remains covered
by the integrated suites and showcase.

## Gates and self-check

All checks are serial where they mutate dist. Temp-sensitive commands use:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/native-visuals-s2/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/native-visuals-s2/cache" && COMMAND'
```

This binds only private disk-backed scratch in an ephemeral mount namespace; no
host mounts/config, unrelated tmp files or other worktrees are changed.

| Command | Result |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS Biome + AST principles |
| `npm run typecheck` | PASS full serial build + root TypeScript |
| `npm test` | PASS 1191/1191, no skips |
| `npm run test:consumer` | PASS all fourteen clean tarball closures, NodeNext/Bundler |
| `npm run build:browser && npm run check:graphs` | PASS all browser builds and graph checks |
| `npm run test:browser` | PASS 17/17, including Node/Chromium/qpdf/raster SVG layout |
| `npm run build:showcase && npm run test:showcase` | PASS build + 101/101 tests |
| `npm run sizes -- . current artifacts/native-visuals-s2/sizes` | PASS |
| `node artifacts/native-visuals-s2/evidence.mjs` | PASS paired costs, base/current hashes, graphs, equivalent PDF, preserved S1 |
| `git diff --check` | PASS |

Earlier failed attempts are retained in local logs, not waived: new tests initially
assumed small inline baseline ignored font metrics and a normal Block could not
split; one active Row consumer still spread the removed field; mock text services
rejected legitimate empty-string measurement; raster height ignored DPI ceil
rounding. Missing SVG title, explicit opaque mock `TextRun` typing and test/helper
function-length errors were fixed.
One showcase attempt hit the 200s tool timeout; a complete longer rerun passes.

Risk-based tests cover migration ownership/width/ink/sizing, direct numerical edges,
normal nested composition/defer, actual cross-loader usage and shared nonempty
XML/TSX PDF parity. Existing authentic-handle, resource/output quota, warning/source
provenance, surrogate, packed diagnostics and canonical S1 tests are retained.
Universal/project checklist: correctness checked; cohesive production files ≤400,
functions ≤49, nesting ≤3, intent-only comments; proportional tests and gates pass.
No approved principle exceptions. No Changesets setup exists or was added.
Auditor must independently inspect the complete unstaged + untracked S1/S2 scope,
ownership/lifecycles, exact widths/native certificates, quota accounting, graph/cost
provenance, and the supported nested limitation before calling it verified.
