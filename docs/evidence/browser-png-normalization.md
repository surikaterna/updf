# S5c2 — selected browser PNG normalization

Issue: N/A. **Implemented, ready for independent audit; not verified.** Caller
reports S5c1/S5c1a independently verified by `ses_e92114d0` and `ses_e92018ae`;
their evidence is preserved, not rewritten as verification of this handler.

## Delivery and ownership

- Worktree/cwd: `/home/sprawl/projects/updf/trees/image-preparation`.
- Branch: `feature/image-preparation`; base and unchanged HEAD:
  `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- All pre-existing dirty work is inherited/caller-owned. Incremental delivery is
  four new private/leaf production files under `packages/images/src/browser-png*`,
  the images export map and README, one shared PNG source-limit constant and its
  normalization-only re-export, narrow source-boundary inventory updates, tests,
  the browser proof input and this document. The existing normalization packed
  consumer expectation now includes the authorized constant export.
- No core/layout, loader/session/transport, portable PNG/JPEG implementation,
  application/showcase, root manifest/lock or dependency changes. No arbitrary
  preprocessing protocol, codec, painting backend or compatibility API added.
- No staging, commits, push, PR, tracker mutation or delegation. Existing changes
  remain unstaged/untracked. No Changeset: private unpublished packages, no
  Changesets workflow.

Fresh pre-edit receipt: `/tmp/opencode/png-s5c2-before.json`, complete source
aggregate SHA-256
`5b9487e4a37c02bbf8630595987a2239df5a24a2d904625e42007b29bdeb68e5`.
It includes all tracked/nonignored untracked files, full dirty manifest, diff
digest, branch/HEAD, tool versions and PNG/images source/emitted inventories.
Fresh existing consumer costs: `/tmp/opencode/png-s5c2-costs-before.json`.
No S5c1/S5c1a receipt was overwritten. Reproduction collectors and final receipts
use `/tmp/opencode/png-s5c2-*`; do not rerun `state.mjs before` after edits.
`state.mjs final` and `compare.mjs` produce final ownership/emitted comparisons.

## Exact selected contract

`@updf/images/browser-png` exports only zero-argument `browserPngImages()`.
Construction and import are Node-safe. Its owned `kind: 'png'`, signature matcher
and native provider come from `selectedFormat(pngImages())`: no duplicated
signature/publishing registry, provider or session is introduced. Selecting both
portable and browser PNG handlers fails the existing duplicate-kind validator
before transport. README shows explicit `/load` plus `/browser-png` selection and
`renderAsync(..., ..., { signal })`.

The header byte only chooses a validator, never certifies eligibility. An
intrinsic typed-array byte-length accessor avoids caller-overridden lengths;
non-views, short headers and every non-16 depth go through native preparation.
Eight-bit input works without browser capabilities, retaining native rejections
(including unsupported eight-bit gamma/chromaticity). There is no `PNG_PROFILE`
catch/retry. Strict full normalization validation, bounded inflation and filter
checks precede any browser allocation for 16-bit input. Only its private copied
bytes and frozen metadata are consumed after awaiting; caller mutation cannot
change the source, color declarations or browser decision.

Native `Blob`/`createImageBitmap` decode the snapshot, including gAMA/cHRM/sRGB.
Actual bitmap dimensions must be positive safe integers exactly equal to source
metadata before canvas allocation. Prefer PNG-encoding OffscreenCanvas, otherwise
DOM canvas/toBlob; use original dimensions and `{alpha:true,colorSpace:'srgb'}`.
No resizing, custom gamma engine, background fill or alpha flattening. This is
browser-rendered **lossy eight-bit output**, not bit-exact samples/metadata/bytes
or cross-engine color/host identity. Opaque grayscale/RGB may acquire an opaque
RGBA mask. ICC/APNG/interlace and all other unsupported profiles remain rejected.

The encoded Blob's PNG MIME and finite positive safe-integer size are checked
before `arrayBuffer()`. The maximum is the native owner's shared 8 MiB constant,
exported only via `/normalization`; materialized byte length must equal that size.
All output is revalidated by ordinary native `preparePng`, including CRC, order,
profile and budgets. Resource metadata dimensions must exactly equal the original.
Only the existing native PNG provider paints the resulting resource/soft mask.
All new numerical operations are exact integer/byte/dimension domains, not
approximate fit arithmetic; no epsilon or authored geometry contract changes.

Browser capabilities are read only during preparation, with own-global presence
checks and the required global receiver retained for `createImageBitmap`.
Missing/incompatible hosts report sourced `PNG_PLATFORM`; malformed data retains
`PNG_DATA`/`PNG_PROFILE`/`LIMIT`, and cancellation retains `PNG_ABORT`. Browser
exceptions are not coerced or echoed; diagnostics do not reveal asset URLs.
Platform capabilities are trusted, not an adversarial host sandbox.

Abort is checked before host work and after every awaited boundary. The private
host-promise race removes listeners on success/failure/abort, consumes late
rejections and closes late decoded bitmaps exactly once. Every acquired bitmap
closes and canvas dimensions are reset in `finally`, before native output
preparation. A late encoded Blob is ignored without reading bytes. Host CPU/work
cannot be forcibly preempted; a never-settled native promise may keep unpublished
host work alive. This is bounded logical ownership, not hard peak-memory control.

The original 8 MiB/pixel/64 MiB two-byte scanline restrictions remain mandatory;
RGBA16 hits the scanline limit before the nominal pixel ceiling. The host may
allocate bitmap/canvas/encoded Blob before output size checking. These transient
allocations are not retained `resourceBytes`. There are **three decompression-
related stages**: strict original scanline inflation, browser decoding, and native
normalized-output inflation; only one browser decode/encode per session key.

## Offline proof and risk-based tests

New Node tests cover safe factory/import and zero-argument rejection, native
eight-bit behavior without browser globals, invalid original CRC/forbidden
metadata/pre-abort with zero host calls, snapshot mutation, dimension mismatch,
draw/decode/context/null-Blob failures, output MIME/size before materialization,
length mismatch, malformed native output, duplicate kind, pending decode/encode/
buffer abort, late acquisition cleanup and listener removal/late rejection.
Structural fake hosts test lifecycle only, not successful pixel conversion.
Existing PNG eligibility tests retain source/chunk/pixel/scanline boundary proof.

`tests/browser/browser-png.test.ts` always runs original synthetic gray/RGB/GA/
RGBA16, tRNS gray/RGB, gAMA+cHRM+consistent sRGB, and real DOM/OffscreenCanvas
conversion. Known red/green/blue, zero/full/32768 alpha and white/black samples
are exercised. Source ImageBitmap/canvas reference pixels are compared with an
independent **PDF.js raster of the native PDF**, composited over white, within
one channel level. Poppler independently extracts RGB/soft-mask pixels (also ±1,
ignoring invisible RGB where alpha is zero); qpdf and page rasterization run.
An initial direct 2×2 Poppler page-raster comparison was unsuitable because that
renderer interpolates tiny images; no production tolerance was widened.

Actual `Image` URL occurrences, one ordinary and one `floatable(Image)`, have
different authored dimensions and share one fetch/decode/encode and native
image/SMask per operation. Paragraph/Span text uses explicit real font/text
services. PDFs equal the pre-normalized native control byte-for-byte; another
render starts a fresh session. Portable selection still fails `PNG_PROFILE`.
The browser test blocks every ambient request and injects an exact fake Response;
there is no asset download. Graph tests prove only the selected leaf retains
normalization/color/browser code. Fresh packed consumers prove PNG-only selected
installation, ESM/CJS identity and NodeNext/Bundler types with ES2022/no DOM types.
Unshaken CJS module inventories likewise exclude optional modules when unrequested.

Optional manual reference is enabled only by `BROWSER_PNG_REFERENCE`; ordinary CI
synthetics never skip. Cached local reference:
`/tmp/opencode/text-flow-showcase-eevee.png`, 113,021 bytes, 512×512 RGBA16, SHA-256
`7a201582d435201a92a092bd3aef7150029da0bc9b2e86d89e692ab9278b474a`.
Attribution retained from the showcase: IconScout Eevee referenced by theosoti on
CodePen (`ogjjged`); license unknown. No external pixels are committed, packaged
or redistributed and no license claim is made. Only the local cache is read.
Proof PDFs/rasters are temporary manual receipts, not npm assets.

## Checks and evidence

Commands run from the delivery worktree with Node 24.22.0/npm 11.19.1,
TypeScript 5.9.3, Biome 2.4.13, tsx 4.23.15 and esbuild 0.28.2:

- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass; typecheck
  includes the complete ordered workspace build. Initial formatting, lint,
  function/depth, test metadata narrowing and return diagnostics were fixed.
- `npm_config_offline=true npm test`: **1,758/1,758 pass** (14 added over 1,744).
  Initial two source-boundary failures required the explicit selected-leaf
  inventory update, not a broad codec exception.
- `npm run build:browser`, `npm run check:graphs`: pass, all 12 browser configs.
  Existing browser-fonts large-chunk advisory remains a warning.
- Final browser command:
  `NODE_OPTIONS='--require=/tmp/opencode/png-s5c2-test-tmp.cjs --require=/tmp/opencode/png-s5c2-offline.cjs'
  TMPDIR=/tmp
  TEXT_FLOW_SHOWCASE_PNG=/tmp/opencode/text-flow-showcase-eevee.png
  BROWSER_PNG_REFERENCE=/tmp/opencode/text-flow-showcase-eevee.png
  npm_config_offline=true npm run test:browser`: **27/27 pass**, including
  the additional PDF.js assertion, DOM/OffscreenCanvas and cached reference.
  The preload rejects external Node fetches and browser context routes; cached
  page interception satisfies inherited showcase references. Offline npm alone
  is explicitly not the browser network guard. No live original-server request.
- Focused command: same `NODE_OPTIONS` and `BROWSER_PNG_REFERENCE`, followed by
  `node_modules/.bin/tsx --test tests/browser/browser-png.test.ts`: pass, including
  the cached asset, original pixel/native PDF/PDF.js proof and zero ambient requests.
- `node /tmp/opencode/png-s5c2-original.mjs`: pass. Original worktree's **1,663
  sources/status, 5,288 history files and 80 dist files** retain hashes. PID
  **665048** still serves the original preview on tailnet port 5182; no write,
  build, restart or server asset request targeted it.

Initial host-property hardening exposed a real receiver error in full browser
validation. Calling the captured native function with `globalThis` fixed it;
both real host paths subsequently passed. No exception is claimed for that failure.

## Paired retained costs and distribution

Fresh same-source/flags browser ESM ES2022 raw/minified, gzip level 9; full inputs
are in `png-s5c2-{before,after}.json`, `png-s5c2-costs-{before,after}.json` and
`png-s5c2-summary.json`. Existing source cohort is unchanged, not an old HEAD
reconstruction. Costs include real selected runtime validation, not just imports.

| Existing profile | Raw before → after | Minified before → after | Min gzip before → after |
| --- | ---: | ---: | ---: |
| PNG root | 25,033 → 25,074 | 13,371 → 13,377 | 5,161 → 5,166 |
| Native PNG-to-PDF | 90,728 → 90,769 | 48,268 → 48,274 | 16,602 → 16,607 |
| images/png | 25,562 → 25,603 | 13,582 → 13,588 | 5,247 → 5,252 |
| normalization | 16,875 → 16,916 | 9,215 → 9,221 | 3,801 → 3,804 |
| ordinary PNG | 401,023 → 401,064 | 204,198 → 204,204 | 66,135 → 66,141 |
| float PNG | 499,461 → 499,502 | 253,823 → 253,829 | 82,785 → 82,791 |
| ordinary JPEG | 396,035 → same | 201,318 → same | 65,190 → same |
| float JPEG | 494,497 → same | 250,941 → same | 81,795 → same |
| URL PNG | 440,299 → 440,340 | 224,771 → 224,777 | 72,611 → 72,614 |
| URL JPEG | 438,129 → same | 224,048 → same | 72,604 → same |
| URL mixed | 532,482 → 532,523 | 272,201 → 272,207 | 88,377 → 88,387 |

Existing parsed module counts are unchanged. Native +41 raw/+6 minified is the
single shared source-limit constant, not browser/color logic. All prior images
emitted files (root/load/png/jpeg included) remain hash-identical. The PNG emitted
delta is confined to source/normalization implementation, declarations/maps and
normalization facade; native root declarations/facade remain unchanged.

New **absolute**, different-cohort browser-normalizing URL consumer: 447,153 raw /
228,595 minified / 73,679 min gzip, 261 parsed modules. It retains real preparation
and embeds a small original synthetic compressed16 fixture, not the licensed-
unknown cache or proof UI/PDF.js/font machinery. It is not a delta versus the
eight-bit prepared cohort. Exact input/hash, graph and installed closure are in
`/tmp/opencode/png-s5c2-absolute.json`; reproduction `absolute.ts`.

| Package emitted payload | JS all formats before → after | Declarations before → after | Full dist before → after |
| --- | ---: | ---: | ---: |
| PNG | 49,212 → 49,673 | 11,148 → 11,338 | 92,658 → 93,473 |
| Images | 31,737 → 48,029 | 11,790 → 15,894 | 63,713 → 93,564 |

Compressed npm packs: PNG **23,924 → 24,081** bytes; images **17,204 → 23,821**.
These include README/export/declaration/map payload, not additive retained cost.
Actual selected clean installed closure: **3,224,287 bytes**, assets/kernel/core/
text/layout/PNG/images, with JPEG/fonts/SVG and external PNG engines absent.
Native CJS parsed-byte/count inventory: core 124,308/54; layout 605,749/207;
images root 575,877/199; load 651,060/220; portable PNG 203,256/87; explicitly
selected browser PNG 216,525/93. Unrequested normalizer modules are absent.

## Principles and next owner

Checklist: cohesive files ≤400 lines; functions ≤49; nesting ≤3; intent/invariant
comments; exact domain/ownership/lifecycle/quota checks; proportional regression,
boundary, cancellation, real browser and independent PDF tests. No approved
code-principles exception. Audit the incremental manifest, not all inherited dirty
work as this slice's delivery. Auditor should inspect routing/error order,
snapshot/color/alpha fidelity, late ownership, optional graph/installed closure,
source-limit micro-cost, and offline cache provenance. No application migration,
  metadata broadening, generic callback stage or further slice is authorized here.

### Final environment reruns and receipts

The final source passed format/lint/full typecheck-build again. A repeated plain
full test run then hit `/tmp`'s **32 GiB per-user hard quota**, producing EDQUOT
(`errno -122`) in unrelated temporary installs, fixtures and PDFs. This is recorded
as a failed run, not waived. No inherited/shared temporary files were deleted.
Final successful full-suite command:

```sh
NODE_OPTIONS='--require=/tmp/opencode/png-s5c2-test-tmp.cjs' \
TMPDIR=/home/sprawl/projects/updf/trees/image-preparation/artifacts/browser-png-test-tmp \
npm_config_offline=true npm test
```

Result: **1,758/1,758 pass**, no skips. The test-process-only preload redirects
`mkdtemp` to fresh target-owned ignored artifacts, without changing tests or
assertions. Two small `updf-biome-*` fixture families stay in `/tmp` because
placing them below the ignored artifacts ancestor changes Biome's path policy;
an initial relocated run exposed precisely those two failures before this fix.
The final browser command above uses `TMPDIR=/tmp` for Chromium's short Unix
socket paths, while Node's large temporary directories remain redirected. A run
with the long artifact path as Chromium's TMPDIR failed startup and timed out;
it is not counted as browser coverage. No leftover processes from that attempt
were found before the final **27/27 passing** browser run.

Final browser proof directory:
`artifacts/browser-png-test-tmp/browser-png-proof-QUp4M1/`, including synthetic and
cached-reference native PDFs, Poppler rasters and extracted images/masks.
Full passing test output: `tool_16e1d9b2c001t1ypLi0vkxg9cj` under the local
opencode tool-output directory. Earlier receipts remain available. Main filesystem
has ample space; `/tmp` quota remains an environment concern for the next owner.
