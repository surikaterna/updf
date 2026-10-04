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
