# S5a.2 prepared-resource Image — implemented, ready for independent audit

Issue: N/A. Integration owner: this Engineer assignment. **Not independently
verified. S5 is not complete.** URL loading/automatic binding/provider selection
(S5b), later showcase migration (S5c), caching (S6), and alpha exclusion (S7)
remain deferred. The earlier S5a.1 evidence is historical chronology; its pending
audit wording is not a new claim about the caller-reported independent approval.

## Delivery and preservation

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`.
- Base/HEAD: `fbf2f78fd59635c6b965f2a707f35508dc1e4392` (unchanged).
- Inherited: 74 tracked dirty + 37 untracked paths, S2/S3/S5a.1; 1,636 baseline
  source hashes from `artifacts/text-flow/image-visual-seam-final/preservation.json`.
- This slice changes 11 existing paths and adds 27 paths (including this document).
  See `artifacts/text-flow/prepared-images/preservation.json` for the complete
  hashes, changed/added lists and actual Git status. No stage/commit/push/PR,
  tracker mutation, discard, delegation or delivery occurred.
- Existing changes are limited to root build/lock/Biome inventories, the private
  layout geometry transport and boundary/license inventories. New code is in
  `packages/images`, the private height leaf/test, and focused consumer/browser/
  evidence fixtures. No core, kernel, paginator, text/font, codec/provider,
  geometry parser, painter, Source builder or app source was changed.
- All 5,288 original historical artifacts and 80 served showcase files match
  their retained hashes. Both protected HTTP URLs remain 200 with the original
  SHA-256; PID 665048 remains the same preview command. No served build/restart.
  Package runtime outputs were refreshed; app builds/tests ran in a disposable
  source copy with an isolated showcase output.

## Actual API and owners

The private workspace `@updf/images` exports only runtime `Image` and `images`.
It depends directly on core/layout, not PNG/JPEG/assets/fonts/text-flow; its
prepared metadata type is structural and compatible with existing PNG/JPEG
resources without importing their declarations. MIT attribution is the repository's
`Copyright (c) 2026 Surikat AB`; browser ESM, Node ESM/CJS and declarations use
the existing packaging script/conditional exports. The root build places images
after layout, before downstream packages/apps. There is no new image service,
decoder, factory handler seam, source loader or parallel native pipeline.

```tsx
import { Image, images } from '@updf/images';
import { preparePng, pngProvider } from '@updf/png';
import { Document, Flow } from '@updf/layout';
import { render } from '@updf/layout/render';

const prepared = await preparePng(bytes);
const output = render(
  <Document>
    <Flow pageSize={{ width: 400, height: 500 }} margins={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <Image src={prepared} style={{ width: 120, height: 80 }} />
    </Flow>
  </Document>,
  { resources: { logo: prepared }, providers: [pngProvider()], extensions: [images()] },
);
```

JPEG callers select `prepareJpeg`/`jpegProvider` from `@updf/jpeg` instead. Callers
still prebind the exact handle in `resources` and explicitly install the real
codec provider. Ordinary images require neither text-flow nor fonts/text services.
`src` strings, URLs, `Source.url`, font handles and unowned lookalikes are rejected.
Only own data fields are captured; handle identity is preserved, not JSON cloned.
Owned metadata requires kind png/jpeg and positive safe-integer pixel dimensions;
it does not authenticate private codec storage. A genuinely owned fake PNG handle
still fails the existing native provider check before serialization.

`images()` selects the existing operation capability mechanism using a private
feature identity and contributes the paired owned visual adapters. Missing and
duplicate installation fail explicitly. The operation-owned reverse binding map
is lazy, built once, and chooses the first binding name in existing iteration
order. Every lookup and binding visit charges the existing bounded source-node
counter through the actual adapter context before map insertion. Failed scans
never publish partial maps; consumed charges remain consumed on retry. Bound
methods check the operation lifetime on every invocation. New operations scan
their own binding map, including when the same handle has different names.

Image reuses `defineVisual`: one canonical Block, one atomic child, existing
native `xObject` nodes with the bound resource name, existing native admission,
preparation and painting. Repeated boxes/pages preserve the exact resource
identity and embed it once; separately prepared equal bytes remain distinct.

## Resolved geometry and numerical policy

Image requires finite positive authored point width/height, no authored children,
and `fit?: 'contain' | 'fill'`, defaulting only on omission. Null/undefined and
unsupported modes are not defaults. Common Block min/max, asymmetric padding,
border, background and hidden/error overflow retain their existing owner. Ordinary
Image rejects float/shapeOutside and auto margins rather than ignoring them.

The S5a.1 seam did not expose the actual definite content height before child
measurement. The authorized narrow addition transports it privately from the
existing Block compiler/container owner into a lazy WeakMap keyed by the real
frozen adapter context. Public `MeasureContext` and width-only unit requests are
unchanged. Only direct children receive that Block's own definite content height;
nested ordinary measurements do not inherit an ambient capacity. The existing
clamp/content-axis owner computes it; there is no Image box-arithmetic copy.
Measurement cache identity includes the metric height when present. Copies/foreign
contexts and retained closed contexts cannot read the metadata.

Pixel dimensions, point domains, request/cache identity and quotas are exact.
Aspect fit is new derived arithmetic: ratio-first axis selection avoids overflowing
pixel products, fill uses the actual content width/height, contain centers one
immutable placement rectangle. Each output dimension is checked positive/finite;
the final native containment certificate remains exact. No blanket epsilon,
unit-sized allowance, fixed-point rewrite or relaxed native certificate was added.
Underflow to zero fails GEOMETRY instead of painting an invisible image. After R1,
the private channel transports the metric dimension, not the native axis capacity.
Those values may differ in either direction; preparation retains its exact check.

`const FloatingImage = floatable(Image)` preserves src/fit/required dimensions and
adds float/shapeOutside types through the existing generic ownership seam. Install
`extensions: [images(), textFlow()]`, plus the normal existing text service, font
resources and font provider for rich Paragraph/Span content. Left/right painting
and text match the equivalent manual native Block fixture. Default exclusion is
the **outer Block rectangle**, not image alpha or the contain-painted rectangle.
Manual `Source.path`/`Source.polygon` uses the existing explicit `pathShapes()`
handler; bounded string syntax additionally needs `shapeSyntax()`.

## Validation

Commands below ran serially from the worktree unless another cwd is named.

- `npm install --ignore-scripts`: one new workspace link; the lock diff adds only
  images workspace/link records, no registry dependency changes.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass. Typecheck runs
  the complete ordered build and root no-emit check. The principles AST gate
  includes untracked production/tests/evidence sources.
- `npm test`: **1,650 passed, zero failed**. Initial implementation/type errors
  were corrected, not waived. Negative-control esbuild error text in the full
  suite is expected by its historical arithmetic-certificate test.
- `npx tsx --test packages/images/test/*.test.ts packages/layout/test/visual-content-height.test.ts packages/text-flow/test/*.test.ts`:
  **136/136** passed at the focused checkpoint, including all S4/Path tests.
- `npx tsx --test tests/integration/prepared-images-graphs.test.ts tests/browser/prepared-images.test.ts`:
  **3/3** pass. Real system Chromium PNG/JPEG ordinary/floated output passes qpdf,
  full-text extraction, image/mask counts and exact first-page Poppler pixel parity
  against Node. No compressed-PNG-stream byte-parity claim is made.
- `npm run test:consumer`: all fifteen existing clean external tarball closures
  pass. `npx tsx scripts/prepared-images-consumer.ts`: three additional clean
  installations (no codecs, PNG only, JPEG only) pass NodeNext/Bundler types and
  mixed import/require ownership; codec installs render actual prepared resources.
  Receipt: `/tmp/opencode/updf-s5a2-packs-g3Akwo/report.json`.
- `npm run check:licenses`: pass, including actual images tarball license/notices.
- `npx tsx scripts/prepared-images-clean-build.ts`: copies all 1,662 then-current
  tracked/untracked source paths, not HEAD alone, to
  `/tmp/opencode/updf-s5a2-clean-a3vOEa`, initially without dist/node_modules.
  `npm ci --ignore-scripts --no-audit --no-fund`, `npm run typecheck`,
  `npm run build:browser`, `npm run check:graphs`, and
  `npx vite build --config apps/showcase/vite.config.ts --outDir /tmp/opencode/updf-s5a2-clean-a3vOEa-showcase`
  all pass. Logs are in `validation-0.log` through `validation-4.log`; receipt is
  `artifacts/text-flow/prepared-images/clean-build.json`.
- The initial clean-copy browser invocation substituted a synthetic 2x2 PNG for
  the old Eevee showcase and failed its source-specific status assertion (22/23).
  That mistaken test setup was removed, not the assertion. In that same clean cwd,
  `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s5a2-clean-a3vOEa-showcase npm run test:browser`
  then the same environment with `npm run test:showcase` pass **23/23** and
  **105/105**, using the unchanged existing external asset path. The failed receipt
  is retained honestly; the corrected script no longer substitutes that fixture.
  These tests do not migrate the old showcase to Image.

Risk-based additions cover metadata/ownership/default/prop rejection; real providers
and forged owned resources; alias order, handle/page reuse and separate identities;
bounded reverse scans, retry exhaustion, operation isolation and closed methods;
resolved min/max width/height with asymmetric padding/border; contain/fill, extreme
aspect/huge/subnormal geometry; height/cache/context lifetime; rich left/right
floats, outer-rectangle exclusion and explicit manual shapes; package types,
conditional exports, selected-provider graphs and real browser/native output.

Code-principles checklist: correctness/unsafe-pattern review completed; defaults
followed; cohesive files under 400 lines; functions under 50 lines and control-flow
nesting at most three; comments explain intent/invariants/tradeoffs; risk-based
coverage added; lint/typecheck/tests pass. **No approved exception or gate waiver.**
No Changesets infrastructure is in use; none was introduced.

## Costs: paired shared seam, absolute new feature

The numbers in this section are the preserved **pre-R1** S5a.2 checkpoint. The
current fixed costs and fix-only deltas are recorded below; old artifacts remain
unchanged.

`npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/prepared-images-shared --compare artifacts/text-flow/image-visual-seam-final/report.json`
rebuilds before measuring with the unchanged inherited harness. All **302** S5a.1
metrics remain available; the new package adds ten absolute emitted/pack metrics,
for **312** comparison entries. Flags, tool versions and all old consumer source
inputs match. Lock identity differs only for the intentional workspace addition;
it is not falsely called a same-lock comparison. The earlier original/checkpoint/
historical evidence, source hashes and authentic harness receipts remain untouched.

`npx tsx scripts/prepared-images-evidence.ts` records new real Image profiles,
browser/Node raw/minified and level-9 gzip output/metafiles, source hashes, complete
shared comparison, installed package payload and unshaken CJS load inventories.
New feature baselines are **N/A**, not fabricated old Image costs. Package numbers
are package payload only, **not dependency closure**. Node facades retain their
canonical CJS implementation and are not described as globally tree-shakable.

| Shared metric (bytes) | S5a.1 | S5a.2 | Delta |
| --- | ---: | ---: | ---: |
| Core compressed/unpacked | 139,097 / 813,949 | 139,097 / 813,949 | 0 / 0 |
| Layout compressed/unpacked | 204,646 / 1,242,770 | 205,933 / 1,250,409 | +1,287 / +7,639 |
| All packages compressed/unpacked | 734,894 / 4,058,018 | 744,258 / 4,094,914 | +9,364 / +36,896 |
| Ordinary layout browser min/gzip | 186,112 / 60,281 | 186,526 / 60,382 | +414 / +101 |
| Rectangle siblings browser min/gzip | 236,989 / 76,984 | 237,403 / 77,094 | +414 / +110 |

Images alone is **8,077 compressed / 29,257 unpacked** (new; baseline N/A), not the
old text-flow package size or the sum of dependency packages. Core emitted/pack,
drawing, ordinary text, prepared-font and preexisting JPEG consumer metrics are
exactly unchanged. Unshaken layout/text-flow/path loads add **1,884 bytes / one
module** for the private height channel; drawing and ordinary-text loads add zero.
The nonzero shared cost is explicit and necessary for actual constrained geometry,
not an optimization claim or a budget waiver. No default Image/codec/asset import
was added to text-flow or layout.

| New profile | Browser min/gzip | Node min/gzip |
| --- | ---: | ---: |
| Ordinary prepared PNG | 200,956 / 65,026 | 325,676 / 99,072 |
| Ordinary prepared JPEG | 198,342 / 64,121 | 323,145 / 98,202 |
| Floated prepared PNG + rich text | 250,380 / 81,632 | 371,800 / 113,914 |
| Floated prepared JPEG + rich text | 247,764 / 80,743 | 369,269 / 113,081 |

Positive graphs retain the actual selected provider; PNG/JPEG profiles exclude the
other codec and assets, and ordinary profiles exclude text-flow/fonts. Bare Image
root loads exclude both codecs, transport, fonts and text-flow. Rectangle-only
text-flow loads exclude images/codecs/assets. Output/preparation budgets, lifecycle
and native admission remain production guarantees, never build-mode bypasses.

## Independent audit next

Audit the actual staged/unstaged/untracked delivery against the S5a.1 hash baseline,
not just HEAD. Focus on private definite-height/cache ownership, exact native
placement certificates, binding iteration/alias/budget/lifetime behavior, real
provider refusal and identity reuse, generic float props/manual exclusion, retained
optional graphs, and the nonzero shared costs. Confirm all preservation hashes
and the corrected isolated browser/showcase results. Do not mark URL loading,
cache, alpha exclusion or the old Eevee showcase migration complete.

## S5a2R1 — metric/native height separation

Issue N/A; implemented, ready for independent re-audit, **not verified**. Same
worktree/branch/HEAD as above. Inherited 81 tracked dirty and 64 untracked status
entries were preserved. No new source files, staging, commits, tracker mutations,
delegation, app source changes or live preview rebuild/restart. R1 owns exactly
the ten paths in `prepared-images-fixed/preservation.json`'s `fixChanged` list
(paths below are relative to `artifacts/text-flow` where applicable).

The former `definiteContentHeight` returned the native axis's greatest fitting
capacity. For authored height 80, top padding 1.1 and bottom 0.1 this is
78.80000000000001, whereas the metric content height is **78.8**. Re-adding the
insets to the capacity falsely produced natural height 80.00000000000001 and
strict authored-height overflow. `container-producer.ts` now transports
`height - box.vertical`, the same metric operation already used by that owner for
content alignment, after its existing clamp and reservation validation. Image's
unchanged placement consumes that metric height. No second subtraction algorithm,
new context field, public API, core change, epsilon, clamp repair, quota refund,
width/aspect rewrite or relaxed authored/native comparison was introduced.

The existing exact cache key now receives the actual metric dimension. The same
adapter/source under padding `(0.1,16.5)` and `(0.2,16.4)` must measure separately:
native capacity is 63.4 in both, but metric heights are 63.4 and
63.400000000000006. The latter cannot fit the exact native content region and
still fails in the existing preparation owner, including a trailing blank with
a zero-height child. This is deliberately not repaired or called safe placement.
Copies and closed contexts remain rejected. Zero-content generic Blocks remain
supported; erased padding reservations reject before child measurement. Images
still require positive finite content geometry and reject collapsed content.

Risk-based regressions use the real prepared PNG fixture/provider, independently
specified canonical Block/native geometry (78.8, not the production helper),
default contain and fill, asymmetric fractional padding/border, authored min/max
clamps, small fractions, rich left/right floats, exact placements and single image
painting. Browser coverage adds six fractional/clamped PNG profiles to the four
existing PNG/JPEG profiles, checking actual Chromium/Node PDFs with qpdf, full text,
image/mask inventories and exact Poppler first-page pixels. No network fixture or
weakened threshold was introduced.

### Current validation

- `npx tsx --test packages/images/test/*.test.ts packages/layout/test/visual-content-height.test.ts packages/text-flow/test/*.test.ts`:
  **141/141 pass**.
- `npm run format:check`, `npm run lint`, `npm run typecheck` (ordered build and
  no-emit check), `npm test`: pass; **1,655/1,655** root tests, zero failures.
- `npx tsx --test packages/layout/test/visual-content-height.test.ts packages/images/test/*.test.ts tests/browser/prepared-images.test.ts tests/integration/prepared-images-graphs.test.ts`:
  **18/18** at the browser checkpoint, before the last two boundary tests were
  added. Those two pass in the final focused/root gates.
- `npm run test:consumer`: fifteen clean closures pass.
  `npx tsx scripts/prepared-images-consumer.ts`: all three pass; receipt
  `/tmp/opencode/updf-s5a2-packs-JDvBe3/report.json`. `npm run check:licenses`: pass.
- `PREPARED_IMAGES_OUT=artifacts/text-flow/prepared-images-fixed npx tsx scripts/prepared-images-clean-build.ts`:
  isolated copy `/tmp/opencode/updf-s5a2-clean-SwCTIt`, 1,663 source paths,
  fresh install/typecheck/build:browser/check:graphs/showcase build all pass;
  `npm run test:browser` passes **23/23**. Receipt `prepared-images-fixed/clean-build.json`.
  The outer 240-second invocation interrupted showcase, not a passing suite.
- In that isolated cwd,
  `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s5a2-clean-SwCTIt-showcase npm run test:showcase`:
  first direct invocation also hit the 240-second tool timeout (81 pass, eight
  cancelled files). A 600-second allowance completes **105/105**, zero failures
  or cancellations, in 290 seconds. The clean-build receipt intentionally retains
  only its completed checks, not a fabricated showcase completion.
- Initial formatting and new-test expectation failures were corrected, not waived.
  The cache fixture's first success expectation was wrong: the exact native owner
  rejects its smaller capacity even for trailing blank placement. Final assertions
  explicitly preserve that refusal. Root CI is not described as historically green.

The isolated app copy predates only final boundary tests, evidence changes and the
private helper's documentation comment; its R1 executable production fix matches.
`prepared-images-fixed/summary.json` records exact `cleanCopyDelta` source hashes;
the final preservation receipt records all current source hashes. Installed consumer
receipts likewise predate that comment-only production change, not the R1 fix.
No claim is made that every final source byte was freshly copied into that receipt.

### Current paired costs and preservation

Fresh commands (the collectors now accept output configuration):

```sh
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/prepared-images-shared-fixed --compare artifacts/text-flow/image-visual-seam-final/report.json
PREPARED_IMAGES_OUT=artifacts/text-flow/prepared-images-fixed PREPARED_IMAGES_SHARED=artifacts/text-flow/prepared-images-shared-fixed/report.json PREPARED_IMAGES_PRE_FIX=artifacts/text-flow/prepared-images-shared/report.json PREPARED_IMAGES_CLEAN_COPY=/tmp/opencode/updf-s5a2-clean-SwCTIt npx tsx scripts/prepared-images-evidence.ts
PREPARED_IMAGES_OUT=artifacts/text-flow/prepared-images-fixed npx tsx scripts/prepared-images-preservation.ts
```

The summary preserves all **312** comparisons against original S5a.1 and adds
`fixOnlyComparison` against pre-fix S5a.2. Same flags/tool versions/consumer inputs;
R1 lock unchanged. No speed/performance claim. Current shared layout browser min/gzip
is **186,529 / 60,383**: S5a.1 delta **+417 / +102**, fix-only **+3 / +1**.
Rectangle siblings are **237,406 / 77,091**: total **+417 / +107**, fix-only
**+3 / -3**. Layout pack is **205,945 / 1,250,392**, fix-only **+12 / -17**.
All-package pack is **744,270 / 4,094,897**, fix-only **+12 / -17**.
Core emitted/pack and drawing/ordinary-text/prepared-font/preexisting JPEG consumer
metrics remain exactly unchanged. Unshaken layout/text-flow/path loads add
**1,877 bytes / one module** versus S5a.1 (fix-only -7 bytes, no module change).

Images itself is unchanged: **8,077 compressed / 29,257 unpacked**, absolute new
feature baseline N/A, package payload not dependency closure. Current browser
min/gzip profiles: ordinary PNG **200,959 / 65,021**, JPEG **198,345 / 64,119**;
floated PNG **250,383 / 81,617**, JPEG **247,767 / 80,732**. Current Node numbers
and raw/metafile evidence are in the fresh summary. Unrequested codecs/assets/fonts/
text-flow stay absent according to each existing optional graph contract.

Preservation checks compare both original S5a.1 source hashes and the pre-fix S5a.2
source receipt with explicit R1 ownership. All **5,288** original historical files,
**80** served files, both tailnet HTTP hashes and preview PID **665048** match.
Original and pre-fix report directories were not used as output destinations.

Code-principles checklist: correctness and exact numerical-domain review complete;
cohesive files under 400 lines; functions under 50 lines; nesting at most three;
intent/invariant comments; risk-based tests; format/lint/typecheck/tests pass.
**No approved exception or gate waiver.** No Changesets infrastructure applies.
Auditor should recheck the metric/native distinction, exact cache collision,
smaller-capacity refusal, real fractional/clamped native placement and fresh paired
cost/preservation receipts. S5b URL loading and later S5 work remain pending.
