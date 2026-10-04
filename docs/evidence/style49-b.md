# #49-B implementation handoff

Engineer evidence, 2026-10-04; **implemented, not independently verified**.
Issue #49 remains open; no tracker mutation was authorized.

## Delivery state and scope

- Worktree/cwd: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Clean incoming A base and current HEAD:
  `a8c96d7d55934378ff603951dc1db31e1158edb7`.
- Parent is integration owner. All B delivery is unstaged modifications/new files;
  no commit, staging, push, delegation or tracker mutation. Incoming tree was clean.
- Public native Paragraph/Span role styles, frozen `pt()` and types, raw per-run
  inheritance into A's `InlineLineHeights`, normal/empty-line strut, and painting
  via A's `paintInlineText` are implemented. Source-order visuals/text are retained.
- Fixed reconstruction uses a line-plus-ink envelope to bound nominal overhang,
  never a tight line-only clip. Actual page/region/adapter bounds remain strict.
- Necessary table text-default plumbing, all affected apps/consumer templates,
  current docs and regression tests migrated. Displayed showcase source is the
  actual migrated raw module (covered by the 49-test showcase suite).
- Core's only source change is exporting A's validator from its inventoried
  internal seam; fixed core text/ParagraphDefinition behavior is unchanged.
  Legacy, historical records, dependency manifests and CMR/resource contracts
  were not changed. No React/CSS dependency or old 2.0 prop aliases were added.

Primary implementation files: `packages/layout/src/text-style.ts`,
`content-types.ts`, `content-data.ts`, `content-normalize.ts`,
`content-paragraph.ts`, `adapter-content.ts`, `index.ts`; table text-default
types/validation/measurement/font validation; `packages/core/src/internal.ts`
and `scripts/boundaries.ts` for the inventoried validator seam. See actual
`git status --short` / `git diff` for the complete delivered consumer scope.

## Scoped clean-A consumer baseline and B comparison

Captured **before production edits**, after clean A core/layout builds:

```sh
npm run build -w @updf/core && npm run build -w @updf/layout
npx tsx scripts/style-consumer-cost.ts before
node --version
npm ls esbuild vite
```

Node `24.21.0`, esbuild `0.28.2`, Vite `7.3.6`. The script uses bundle/minify,
ES2022, browser platform, ESM output, no writes of generated JS, and metafiles.
Both named consumers export a function of dynamic text, with identical inputs
before/after. These are #49-scoped fresh A measurements, not the older issue
numbers and not #32's whole feature-cost matrix.

Exact inputs (also recorded in every artifact):

```js
import { render } from '@updf/core';
export const pdf = (text) => render({pages:[{width:200,height:200,children:[{type:'text',x:10,y:10,width:180,height:20,text,font:'Helvetica',fontSize:12,lineHeight:16}]}]});
```

```js
import { render } from '@updf/core';
import { document, flow, paragraph, layout, pageSize } from '@updf/layout';
export const pdf = (text) => render(layout(document({children:flow({pageSize:pageSize(200,200),children:paragraph({children:text})})})).document);
```

Important resolution detail: this scoped workspace esbuild command honors the
existing root tsconfig alias for **layout source**, while core resolves emitted
package JS. This is identical on both sides, not a claim that these two bundles
are fully external packed consumers. Separate packed tests and Vite graph gates
below prove emitted-package resolution and portable closures. A repeat must
preserve this resolution method; do not compare it to an alias-disabled build.

| Scope | A raw / gzip / retained | B raw / gzip / retained | Delta |
| --- | --- | --- | --- |
| Named text-only | 39,498 / 13,973 / 38 | 39,498 / 13,973 / 38 | 0 / 0 / 0 |
| Document → Flow → Paragraph | 124,258 / 40,669 / 109 | 124,740 / 40,816 / 110 | +482 / +147 / +1 |

Comparison command: `npx tsx scripts/style-consumer-cost.ts after`.
It checks identical inputs/options/toolchain, writes both delta reports and
rejects retained Fontkit/PDF.js/SVG/tables/React/selector closures. Actual retained
graph delta is only `packages/core/dist/measurement/inline-paint.js`, now used by
B. `text-style.ts` is an analyzed module but **not retained** by these no-opt-in
inputs. The delta is validation/normalization/paint wiring, not a CSS engine or
optional-feature dependency. No arbitrary cost cap or sideEffects annotation.
Gzip does not measure execution/heap; JS size is not PDF/font asset size.

Full artifacts remain in this worktree's ignored `artifacts/style49/`, including
exact inputs/options/toolchain, analyzed and retained module lists and metafiles.
Preserve these clean-A artifacts for the independent audit and C comparison;
rerunning `before` on B would destroy their meaning. SHA-256 fingerprints:

```text
438fb8d73dd8c03fe4487c3d3cd173d07da3e2977d989165378e5962600f94d8 before-textOnly.json
29585b5ef777f7ad551cedab6309ae41b5ca212bc7d6dda7bdce7ac313f3427f before-paragraphFlow.json
f86165333c76e7e3924b5818daf84b0b80b64d787ad743f6ed0dfdb124249cf7 after-textOnly.json
4a232a11a00c846316e0f8935924ef80b14c897c2da39c2dd96833b0c7058700 after-paragraphFlow.json
d90ff901860072b7e2d44a0b6886b92e1f8da47955744f88c43e8b3b38aa6820 delta-textOnly.json
2315fa937bc075ab758850750a5cc938d345356937f4f7a19d59f789f8f6c780 delta-paragraphFlow.json
```

## Commands and final outcomes

All commands ran in the exact worktree above, on HEAD plus the unstaged B scope.

| Command | Final result |
| --- | --- |
| `npm run format` | Pass; formatted only affected files |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome error gate + ESLint code principles |
| `npm run typecheck` | Pass, including full workspace build and legacy compile |
| `npm test` | **395/395 pass**, zero skipped/cancelled |
| `npm run test:consumer` | Pass: seven clean tarball closures, NodeNext/Bundler/runtime, new pt/types/old-prop rejection |
| `npm run build:browser` | Pass; existing optional Fontkit size warning only |
| `npm run check:graphs` | Pass: emitted package JS, portable/optional dependency boundaries |
| `npm run build:showcase` | Pass |
| `npm run test:showcase` with Chrome env below | **49/49 pass**, zero skipped |
| `npm run test:browser` with Chrome env below | **9/10 pass**; only authorized known SVG #50 failure |
| `npx tsx --test packages/tables/test/text-style.test.ts` | 2/2 pass |
| `npx tsx scripts/style-consumer-cost.ts after` | Pass; matched inputs/toolchain, reviewed retained deltas above |
| `git diff --check` | Pass |

Both full browser commands used timeout `600000` and:

```sh
BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome \
SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome \
npm run test:browser
# Same environment for npm run test:showcase
```

Known #50 failure: SVG `signature` inkMassDeltaRatio
`0.030079044159627057`; interiorMismatchRatio, foregroundMismatchRatio and
bboxDelta were zero. The reference test ran unchanged, was not skipped/weakened,
and its failure is deferred only under the caller's explicit exception.

Earlier migration runs failed on stale caller/default assertions and an example
ratio `15 / 11` producing a nonexact reservation. The mixed example now explicitly
uses `pt(15)` to preserve its intended absolute geometry; no numerical policy
change. The final full showcase rerun passed all 49 tests. No asynchronous checks
remain. Packed tests' finally cleanup removed their own temporary installs/packs;
pre-existing `/tmp/opencode` contents, including spindle, were untouched.

## Code-principles and next owner

Checklist: correctness validated; cohesive production files under 400 lines;
functions under 50 lines and nesting at most three per authoritative ESLint;
comments explain invariants/intent; risk-proportional tests added; format/lint/
typecheck/full tests pass. No new code-principles exception. The only approved
gate exception is the unchanged #50 browser raster failure. No Changesets system
exists here, so no Changeset was introduced.

Risk tests cover 12pt×1.2, inherited 20pt×1.2, absolute16 inheritance and combined
above/below growth, normal prepared/Helvetica fonts, empty struts, mixed visuals,
source-order composition, sibling/explicit theme scope, strict source-aware invalid
values/old props, reusable descriptors through table defaults, tight overflow
ink and page bounds. Independent Poppler compares public tight/normal glyph
rasters at a shared baseline and extracts overlapping lines; existing CMR hashes,
context attributes, prepared resources, exact-height/negative-bearing raster
oracles and Node/Chromium parity pass.

Auditor should review actual unstaged plus untracked scope and retained graphs,
especially raw inheritance, strict role/value checks, line-plus-ink reconstruction
and bounded table plumbing. B is ready for that independent audit, not verified.
Parent decides integration/delivery and any tracker updates.

Remaining #49 acceptance belongs to **C**: backgroundColor/per-edge padding and
row-cell schemas/final merge contract, cross-role box/table examples and related
tests/docs. #42 borders, #43 Span backgrounds, flex, legacy/historical changes and
#32's broader cost matrix remain non-goals. The whole issue is not complete.

---

## #49-C final integration handoff (2026-10-04)

This section supersedes B's remaining-work statement above, not its historical
measurements. **Implemented, ready for independent audit; not verified.** Issue
#49 is still OPEN: no tracker mutation was authorized. Parent owns integration.

### Revision, ownership and exact delivery manifest

- Cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Clean incoming base/current HEAD: `a84ecfc6c7ea1566875f1c7403e7e34961d43c11`.
- A/B were audited and committed before C. This C delivery is solely unstaged
  modifications plus the two untracked test files below; no staged files, commits,
  push, nested delegation or tracker changes. Engineer owns this listed C scope.
- No changes to fixed core, separate legacy package, retired internal layout table
  implementation/fixtures, historical records (except this requested appended
  evidence), dependency manifests, numerical policy or service budgets.
- Implemented canonical backgroundColor without an alias, scalar point padding
  and explicit edges, role-named table/row/cell schemas, row defaults, per-layer
  shorthand expansion and per-property text inheritance. B's raw line heights and
  operation-bound measurement callbacks are unchanged. Existing uniform Block
  border and Table grid are unchanged; #42/#43 remain planned, not duplicated.

Exact modified paths, grouped only for readability:

```text
apps/browser-fonts/table-proof.ts
apps/showcase/src/blocks.tsx
apps/showcase/src/flow.tsx
apps/showcase/src/mixed.tsx
apps/showcase/src/tables.tsx
apps/showcase/src/template.tsx
docs/authoring-migration.md
docs/blocks.md
docs/evidence/style49-b.md
docs/inline.md
docs/text-styles.md
packages/layout/src/container-budget.ts
packages/layout/src/container-paint.ts
packages/layout/src/container-types.ts
packages/layout/src/index.ts
packages/layout/src/sizing.ts
packages/layout/test/adapter-content.test.ts
packages/layout/test/containers.test.ts
packages/layout/test/content.test.ts
packages/layout/test/d-audit-r1.test.ts
packages/layout/test/text-style.test.ts
packages/tables/README.md
packages/tables/src/font-validation.ts
packages/tables/src/index.ts
packages/tables/src/measure.ts
packages/tables/src/parts.ts
packages/tables/src/types.ts
packages/tables/src/validate.ts
tests/consumer/types/composable-tables-template.tsx
tests/consumer/types/flow-template.tsx
tests/consumer/types/text-style-template.tsx
tests/fixtures/composable-inventory.ts
tests/integration/block-background.test.ts
tests/integration/block-clipping.test.ts
tests/integration/inline-audit-r1.test.ts
```

New/untracked:
`packages/layout/test/box-style.test.ts`,
`packages/tables/test/box-style.test.ts`.
Generated PDFs, browser graphs/builds and cost JSON are ignored evidence, not staged
delivery. Actual showcase source is imported raw, so migration changes displayed
source too; the source/download parity tests pass.

### Final matching cost scopes

Same Node `24.21.0`, esbuild `0.28.2`, Vite `7.3.6`, inputs, root-tsconfig resolution
and ES2022/browser/minified ESM options documented above. **Do not rerun before.**

```sh
npm run build -w @updf/core && npm run build -w @updf/layout
npx tsx scripts/style-consumer-cost.ts after
sha256sum artifacts/style49/*.json
node --version
npm ls esbuild vite
```

| Consumer | Clean A raw / gzip / retained | B | Final A+B+C | A→final delta | B→C marginal |
| --- | --- | --- | --- | --- | --- |
| Named dynamic text | 39,498 / 13,973 / 38 | same | same | 0 / 0 / 0 | 0 / 0 / 0 |
| Document → Flow → Paragraph | 124,258 / 40,669 / 109 | 124,740 / 40,816 / 110 | 124,864 / 40,852 / 110 | +606 / +183 / +1 | +124 / +36 / 0 |

The retained graph difference from A remains exactly
`packages/core/dist/measurement/inline-paint.js` (B). C adds no retained modules;
its marginal bytes are renamed background keys and scalar/edge padding schema and
sizing in the already-retained generic Block closure. Neither scope retains tables,
SVG, Fontkit, PDF.js, React or selector closures. Public style-using packed examples
compile against emitted declarations; emitted layout graphs remain optional-feature
free, while the deliberate table consumer retains its table adapter without the
retired layout-table implementation. These are scoped ownership/cost proofs, not
#32's full feature matrix or parse/CPU/heap measurements. No arbitrary caps,
validation weakening or sideEffects annotation was introduced.

`after-*`/`delta-*` now describe final C, replacing B's after artifacts. Clean-A
`before-*` are untouched and their hashes still match the original B record:

```text
438fb8d73dd8c03fe4487c3d3cd173d07da3e2977d989165378e5962600f94d8 before-textOnly.json
29585b5ef777f7ad551cedab6309ae41b5ca212bc7d6dda7bdce7ac313f3427f before-paragraphFlow.json
f86165333c76e7e3924b5818daf84b0b80b64d787ad743f6ed0dfdb124249cf7 after-textOnly.json
b6697f076eef9cfa51100c239a5687fe7f143e0a3c6d62e202fb68ef5237b6ba after-paragraphFlow.json
d90ff901860072b7e2d44a0b6886b92e1f8da47955744f88c43e8b3b38aa6820 delta-textOnly.json
9255a50d4d9e3e7b2115ca322a379f64b9e97b9e2501bf32f8309fba9dd6e8c8 delta-paragraphFlow.json
```

### Gates and risk evidence

All ran in the exact worktree/HEAD above plus this C delivery:

| Exact command | Final outcome |
| --- | --- |
| `npm run format` | Pass; only affected files formatted |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, Biome and authoritative ESLint principles |
| `npm run typecheck` | Pass, full builds + legacy compile + noEmit |
| `npm test` | **403/403 pass**, zero skipped/cancelled |
| `npm run test:consumer` | Pass, seven clean tarball closures; NodeNext/Bundler positive/negative examples |
| `npm run build:browser` | Pass; existing optional Fontkit chunk-size warning |
| `npm run check:graphs` | Pass, emitted-package dependency boundaries |
| `npm run build:showcase` | Pass |
| `npm run test:showcase` with Chrome env above, timeout 600000 | **49/49 pass**, zero skipped |
| `npm run test:browser` with Chrome env above, timeout 600000 | **9/10 pass**, unchanged authorized #50 SVG failure |
| `npx tsx --test packages/layout/test/box-style.test.ts packages/tables/test/box-style.test.ts` | Final **8/8 pass**, also covered in full 403-test run |
| `npx tsx scripts/style-consumer-cost.ts after` | Pass, matching scopes and fingerprints above |
| `git diff --check` | Pass |

Early lint rejected empty interface declarations; role schemas now intentionally
share the same supported field set through named types rather than empty interfaces.
Early typecheck found remaining Insets test helpers, and the added JSX parity test
initially used the wrong h signature; both were corrected, with final gates passing.
There are no pending checks. Browser/build gates ran on final production/consumer
code; only the additional source-order test and docs followed, then format/lint/
typecheck/full tests/packed consumers were rerun.

Eight new risk tests cover edge-vs-shorthand enumeration, cross-layer expansion,
table/column/row/cell/Paragraph/Span per-key defaults, inherited raw ratio with larger
font, implicit row text, source-order spreads, JSX/data exact PDF parity, owner-only
box properties, and unknown/obsolete/undefined/invalid defaults including overridden
row resources. Existing migrated Poppler/qpdf tests still check background beneath
ink, clipping/extractable hidden text, contained borders, 63 table edges, header
background pixels, prepared-font bbox/raster/line-height, context scope and fixed
CMR hashes. No new raster oracle was needed for the rename/point-inset arithmetic:
new geometry/PDF-command tests plus unchanged independent spatial oracles cover it.

### Full #49 acceptance mapping and safe stopping point

| Issue acceptance | Implemented evidence |
| --- | --- |
| 2.0 migration, no shims, all controlled consumers/docs/tests | A/B text migration plus C background/padding/row schemas; packed negative examples and showcase actual-source parity; legacy/fixed core preserved |
| Ratio, nested larger Span, absolute inheritance, normal/invalid/mixed visuals and ink policy | Audited A/B tests rerun unchanged in 403 full tests; public Poppler tight-line oracle passes |
| Written contract and compile-checked cross-role examples | docs/text-styles.md, blocks/inline/migration docs and table README; packed text-style and composable-table templates cover all five roles |
| Composition and shorthand/longhand, background/padding/border consistency | C geometry/source-order/layer tests; uniform Block border/Table grid only; #42 edge borders and #43 highlights explicitly coordinated/planned |
| Points vs ratios, font scaling, whitespace/LF, non-inheritance, measurement/PDF, contexts/CMR | New C tests plus existing A/B/layout/table/PDF/context/resource and fixed-output tests pass |
| Before/after retained consumer graphs without optional leakage | Preserved clean-A hashes and final matching scope artifacts above; packed/build graph gates pass; no whole-#32 claim |
| Honest non-CSS boundaries and explicit Theme | Final contract specifies roles/defaults/units/unknown/undefined/invalid/merge, scalar shorthand only, explicit context application and separate future adapter boundary |

All assigned C acceptance is implemented; no implementation remains in #49's
bounded A+B+C scope. Independent audit and parent integration/delivery remain.
Approved exception: unchanged #50 browser SVG signature failure, exact metrics in
B's section above and reproduced by C; no skips or weakened thresholds. No new
code-principles exception, dependency or Changeset (no Changesets system).
Universal checklist self-check passes: correctness/ownership, cohesive production
files ≤400 lines, functions <50 lines, nesting ≤3 per ESLint, intent-only comments,
risk-proportional tests, lint/typecheck/full tests passing. Auditor should inspect
the actual unstaged + untracked manifest, especially per-layer shorthand expansion,
row defaults/resource prevalidation, owner-only box styling and retained graphs.
Caller decides integration and tracker/delivery; this handoff closes C execution.

### #49-C bounded auditfix: authored row font origins (2026-10-04)

Implemented, ready for re-audit; no independent verification claim. Issue #49
remains OPEN without tracker mutation. Same cwd, branch and base/HEAD
`a84ecfc6c7ea1566875f1c7403e7e34961d43c11` as C above. Incoming 35 modified
tracked files and two untracked tests were preserved. This fix adds one modified
tracked path to the delivery manifest: `packages/tables/test/section-origins.test.ts`.
All delivery remains unstaged; no commits, staging, delegation or delivery mutations.

Fix-owned changes only:
- `packages/tables/src/parts.ts`: capture authored row paths in a WeakMap, following
  the existing cell-origin mechanism and resolving relative to the current owner.
- `packages/tables/src/font-validation.ts`: use that row origin for prevalidation,
  with the unchanged body/head/foot data-path fallback. Validation still precedes
  decorations and cell content measurement; resource ownership is unchanged.
- `packages/tables/test/section-origins.test.ts`: three regressions cover second JSX
  rows in body/head/foot with missing fonts overridden by valid cell fonts, zero
  inline callbacks before rejection, exact data paths, and a shared JSX descriptor
  reused under distinct provider snapshots reporting the second authored occurrence.
- This evidence append; no other C implementation or acceptance was changed.

| Exact command | Final outcome |
| --- | --- |
| `npm run build -w @updf/tables` | Pass |
| `npx biome format --write packages/tables/src/parts.ts packages/tables/src/font-validation.ts packages/tables/test/section-origins.test.ts` | Pass; one test assertion formatted |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, Biome + ESLint principles |
| `npm run typecheck` | Pass, workspace build + legacy compile + noEmit |
| `npx tsx --test packages/tables/test/section-origins.test.ts packages/tables/test/box-style.test.ts packages/layout/test/box-style.test.ts` | **13/13 pass**, zero skipped/cancelled |
| `npm test` | **406/406 pass**, zero skipped/cancelled |
| `npm run test:consumer` | Pass, seven clean external tarball closures |
| `git diff --check` | Pass |

Initial targeted probes used stale emitted tables JS and reproduced the original
synthetic paths; rebuilding tables exercised the fix. The provider regression's
initial expected path omitted the existing `/provider` and `/expanded` segments;
its final assertion names the exact authored second occurrence. No pending checks.

No cost remeasurement or hash replacement: this table-only origin fix does not
enter either named text-only or Document→Flow→Paragraph retained consumer graph.
The matching final C measurements and artifact fingerprints above remain applicable.
Showcase/browser gates were not rerun for this bounded diagnostic-only fix; prior
C showcase **49/49** and authorized unchanged #50 SVG deferral remain historical
evidence, not newly claimed results.

Universal checklist self-check: correctness and ownership validated; cohesive
production files remain ≤400 lines, functions <50 and nesting ≤3 (ESLint passes);
no new comments or unsafe patterns; three risk-proportional regressions added;
format/lint/typecheck/tests pass. No new code-principles exception or Changeset
(project does not use Changesets). The existing authorized #50 browser exception
is unchanged. Auditor should recheck authored row diagnostics across sections,
data fallbacks, callback prevalidation order and current-occurrence snapshots;
parent owns integration and any tracker/delivery updates.
