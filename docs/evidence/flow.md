# #27 bounded flow/templates/TSX/showcase — local implementation evidence

Status: **implemented, ready for independent audit; not verified or released**.
Auditor requested R1 for translated fractional template cancellation. The approved
remediation below is now implemented, awaiting independent re-audit; its counts,
numerical contract and validation supersede the initial implementation evidence.
Integration owner: Engineer, no nested delegation. #26 was independently verified
according to the supplied assignment. #26/#27 remain OPEN; no tracker mutation.
#28 tables remain planned and must wait for independent #27 audit. No staging,
commit, push, PR, merge, publication, deployment, workflow dispatch or repository
setting changes were authorized or performed.

## Delivery identity and preservation

- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
- Branch: `feature/measured-flow-tables`.
- Base and unchanged HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`.
- `pwd`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD`
  confirmed the supplied **32 modified / 26 new** #26 delivery before editing.
  `git worktree list` confirms this existing isolated worktree; no other tree edited.
- Initial #27 complete delivery: **42 unstaged tracked modifications / 56 untracked files**,
  including this evidence file. Index empty; no task commits. This is not a HEAD-only
  delivery. `git rev-list --count ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD` = 0;
  `git diff --cached --stat` empty; `git diff --check` passes.
- Reproduce the complete manifest with `git status --porcelain=v1 -uall`,
  `git diff --name-only`, `git ls-files --others --exclude-standard`; review tracked
  contents with `git diff` and **read every untracked source/test/config** too.
- The complete scope is exactly the preserved 32/26 manifest in
  [measurement evidence](measurement.md), plus the 10 newly dirty tracked paths
  and 30 new #27 files below. Task-specific edits to prior #26 files are also
  explicitly listed below; no preexisting changes were staged or discarded.
- Measurement engine, fixed helper, rich demo and #26 tests remain unchanged.
  `docs/measurement.md` and `docs/evidence/measurement.md` were not rewritten;
  their historical pending-audit wording remains intentionally preserved. Current
  assignment/status is recorded here and in `docs/roadmap/current.md`, not archived
  planning or historical evidence.
- Final preserved-document SHA256 (`sha256sum docs/measurement.md docs/evidence/measurement.md`):
  `23025e3b41dc4eadb55ce1047a907819d6443f2732397ff24bd27278b083ecd6`;
  `fc70df9c656051cc8647fa9a37e96c05dcd135409a4d666f962645414b2ed395`.

## Exact #27 task delta

Newly dirty tracked files (10; clean in the supplied #26 delivery):

```text
.github/workflows/pages.yml
apps/browser-fonts/package.json
apps/showcase/package.json
docs/architecture/packages.md
package-lock.json
packages/core/src/internal.ts
scripts/boundaries.ts
scripts/check-licenses.ts
tests/integration/boundaries.test.ts
tests/showcase/graph.test.ts
```

Previously modified tracked #26 files additionally edited for integration (14):

```text
apps/browser-fonts/app.ts
apps/showcase/index.html
apps/showcase/src/demos.ts
apps/showcase/src/main.ts
biome.json
docs/native-api.md
package.json
packages/core/src/core/validate.ts
packages/core/src/types.ts
readme.md
scripts/graph-check.ts
scripts/packed-consumer.ts
scripts/sizes.ts
tests/consumer/declarations.test.ts
```

Previously untracked #26 files additionally edited (2):

```text
docs/roadmap/current.md
packages/core/src/vdom/measurement.ts
```

New #27 files (30; all still untracked, including this evidence):

```text
apps/browser-fonts/flow-proof.ts
apps/browser-react/vite.flow.config.ts
apps/showcase/src/flow-controls.ts
apps/showcase/src/flow.ts
apps/showcase/src/optional-flow.ts
docs/evidence/flow.md
packages/core/src/core/layout-operation.ts
packages/layout/LICENSE
packages/layout/README.md
packages/layout/package.json
packages/layout/src/blocks.ts
packages/layout/src/budget.ts
packages/layout/src/data.ts
packages/layout/src/fragments.ts
packages/layout/src/index.ts
packages/layout/src/layout.ts
packages/layout/src/paginator.ts
packages/layout/src/template.ts
packages/layout/src/types.ts
packages/layout/src/vdom.ts
packages/layout/test/budgets.test.ts
packages/layout/test/fixtures.ts
packages/layout/test/flow.test.ts
packages/layout/test/resources.test.ts
packages/layout/test/roundoff.test.ts
packages/layout/tsconfig.json
tests/browser/browser-flow.test.ts
tests/consumer/types/flow-template.tsx
tests/integration/flow.test.ts
tests/showcase/flow.test.ts
```

The other 18 previously modified tracked and 24 previously untracked #26 files
are untouched by #27. Legacy sources, archived roadmaps, font fixtures, golden
CMR/reference expectations and all existing SVG tolerances remain unchanged.
The lock delta adds only the local layout workspace/link and two exact example
dependencies; no external dependency version changed.

## Implemented contract and narrowly required core integration

[Layout README](../../packages/layout/README.md) defines the full bounded contract.
Optional private `@updf/layout` exports root flow/functions/types and `/vdom` ordinary
`Flow.Document`; no tables/registry/second JSX runtime. It depends only on the exact
core version. Core never imports layout. Pure ES modules/declarations have ES2022,
strict NodeNext and `types: []`; no React/DOM/Node/Fontkit/SVG/geometry dependency.

Explicit templates reserve local validated header/footer heights and applicable
gaps. Ordered paragraphs split on internally measured complete lines; fixed/spacer
blocks are atomic; kept paragraphs move once or fail on a fresh page. Explicit
leading/trailing/consecutive breaks intentionally retain blanks. Empty body gives
one page and exact fits do not add pages. Results, fixed AST, placements and line
ranges are deeply frozen. Serialization is an explicit `render(result.document,
options)` call to the unchanged single core serializer.

Source descriptor/prototype/dense-array/cycle/depth/text/work checks precede heavy
measurement and copies; explicit page-21 input fails before measurement. Repeated
regions reserve generated node/text/work/command counts before copying. Implicit
page 21 fails before construction. Existing caps remain hard policies, not #25.
The 10 MiB serialized-output cap remains enforced by the explicit core render call.

The inventoried internal operation seam supplies only resource-bound measurement,
local fixed validation and final validation. A WeakMap binds real component
contexts to owned font snapshots/shared lowering budgets; retained contexts close
on success/failure, with no font bytes or serializer plans exposed. Fixed region
validation uses a local identity painting group, so default primitive stroke ink
uses conservative native painting bounds rather than legacy endpoint-only checks.
This does not change historical core fixed-node validation behavior.

One essential core numerical integration was found by an exact-fit probe: three
10.3-point lines fit measurement's 30.9-point bound, but a generated line box's
bottom is representationally `30.900000000000002`. Only **rich-node right/bottom box
validation** now uses the existing narrow two-relative-epsilon `exceeds` helper.
Left/top checks, all fixed/plain/painting checks, rich wrapping/envelopes/glyph ink,
font ownership and serializer stay unchanged. Regression proves exact fit through
layout/render/lower and rejects genuine >roundoff overflow. No geometry is clamped,
shrunk or quantized. The private paginator uses the same compensated metric sums.

The optional showcase module/source are dynamically imported. Controls bound count
1–20, page preset, repeated regions and keepTogether; intentional overflow remains
a valid template with either region toggle and fails `LAYOUT_OVERSIZED`. Existing
rich/old demos, mobile fallback, safe source display, Blob replacement and async
cancellation are retained. Manual-only pinned Pages workflow builds layout before
site through `build:showcase`; only its build step name changed, never dispatched.

## Risk-based additions

15 new native/integration cases (115 → **130**) cover dimensions, empty/exact/just-over
fit, implicit advances, explicit blank pages, line splitting/keepTogether/oversize,
fixed/region own bounds including stroke ink, reservation geometry, 20/21 pages and
20 full-page paragraph input, text/work/repeated output caps, unknown/getter/forged
node/plan rejection, source independence/frozen output, deterministic bytes, source
paths/component diagnostic prefixes, prepared aliases/ownership/snapshots/late use,
normalized whitespace/mixed fonts/colors/common baseline, and real overflow.

Multi-page qpdf/Poppler evidence checks ordered header/body/footer extraction,
paragraph line consumption, contained colored/fixed raster ink and identical repeated
header/footer raster bands on every page. Node/Chromium use identical prepared font
bytes and compare complete flow result JSON/PDF bytes; the proof also checks native
versus component bytes. Consumer fixtures run actual good/negative native TSX in
isolated NodeNext/Bundler `types: []`, including forbidden fixed JSX children and
no tables/core layout export. Graph negative controls cover package direction and
optional/Node/React/external leakage. Three added showcase cases (9 → **12**) cover
downloaded Node bytes/source/page counts, controls, keyboard/mobile, overflow/URL
cleanup, dynamic load failure and cancellation; original nine cases still pass.

## Exact validation commands and outcomes

All ran in the worktree above with Node `v24.21.0`.

| Command | Outcome |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | pass, local workspace lock integration only |
| `npm install --ignore-scripts --no-audit --no-fund` | pass, one new local workspace link |
| `npm ci --ignore-scripts` | pass, clean 485-package install; inherited deprecation notices retained |
| `npm run build -w @updf/core && npm run build -w @updf/layout` | pass |
| `npx tsx --test packages/layout/test/flow.test.ts` | initial 6/7; diagnostic expectation corrected to ordinary `/tree` prefix; superseded by full pass |
| `npx biome check --write --diagnostic-level=error packages/layout packages/core/src/core/layout-operation.ts` | pass, scoped safe formatting; no unsafe fixes |
| `npm run format:check` | pass, 249 files, no fixes |
| `npm run lint` | pass, Biome 252 files and unchanged ESLint size/depth gates |
| `npm run typecheck` | pass, strict ordered workspace builds, legacy compile and root typecheck; repeated after clean install |
| `npx tsc --noEmit` | pass after final showcase-only overflow fixture update |
| `npm test` | pass, **130/130**; all original 115 retained, PDF/hash/preservation included |
| `npm run build:showcase` | pass, strict site build, 103 modules |
| `npm run test:showcase` | pass, **12/12** |
| `npm run build:browser` | pass, **10 bundles** |
| `npm run check:graphs` | pass, **10 graphs**; flow 34 modules, no optional parser/React/Node/SVG/geometry/tables |
| `npm run test:browser` | pass, **5/5**, including identical prepared-font flow and all **11 unchanged SVG references** |
| `npm run test:consumer` | pass, all **6 clean tarball closures**, portable strict NodeNext/Bundler/types[] |
| `npm run check:licenses` | pass, all **6 packed project MIT licenses**; no production font/test assets |
| `npm run sizes` | pass, actual measurements below, not #32 completion |
| `node apps/node/dist/cli.js artifacts/cmr.pdf` | pass, regenerated fixed CMR |
| `node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf` | pass, regenerated Unicode CMR |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | exact required digests unchanged |
| `qpdf --check artifacts/flow/flow.pdf` | pass |
| `qpdf --check artifacts/showcase/updf-flow.pdf` | pass |
| `npm run test:legacy:comparison` | equivalence pass; raw/full remain exit 1, **18 pass / 1 pending / 6 fail** |
| `npm audit --omit=dev --ignore-scripts` | pass, **0 production vulnerabilities** |
| `npx tsx scripts/audit-report.ts` | reports inherited npm audit exit 1, **45 findings** (8 moderate / 10 high / 27 critical), not fixed/waived |
| `git diff --check` | pass |

Intermediate failures were corrected, never waived: diagnostic `/tree` expectation;
Vite required default-export allowance for the exact new config; formatting/function
length/depth and one TS narrowing/expect-error fixture; the existing showcase graph
expected one dynamic chunk before flow added the second; a new positive stroke fixture
initially reserved too little space for native conservative miter padding. Final gates
pass unchanged rules. An exploratory `tsx -e` used CJS resolution and correctly failed
the ESM-only package import; the equivalent `node --input-type=module -e` probe exposed
the genuine decimal rich-box integration issue subsequently fixed/tested above.

**Known SVG intermittency is not waived:** prior #26 evidence records a first failing
reference run with all-black/full-canvas foreground, then unchanged reruns passing.
No SVG implementation, reference, threshold or tolerance was changed here. Both full
#27 browser runs passed; that history remains a disclosed risk. Auditor should rerun
the SVG raster gate rather than treating this evidence as a diagnosis of the flake.

CMR SHA256:

- `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`
- `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`

Final actual bundle bytes/gzip: flow **45,612 / 13,322**; core **44,693 / 13,716**;
measurement **21,643 / 6,894** (unchanged #26 measurement cost). Initial showcase JS
Vite **62.31 kB / 20.94 kB**, optional flow **11.08 / 4.04 kB**, SVG **28.44 / 10.31 kB**.
Initial site closure excludes layout/SVG/geometry/Fontkit/React/Node. Native core-only
installed closure excludes layout. Generated artifacts are ignored, not delivery files.

## Code-principles self-check and handoff

- Correctness validated with proportional regression, owned-resource, packed-browser
  and independent PDF-tool checks; no unsafe `any`, trusted external plan or node forgery.
- Cohesive production files ≤400 lines; functions ≤49; nesting ≤3, enforced without
  broad waivers. Comments explain normalization, reservation or resource invariants.
- All relevant native lint/typecheck/tests/builds pass. Inherited raw legacy/audit
  failures remain explicit and are not declared passing native gates.
- Approved exception: only the exact new `vite.flow.config.ts` joins the existing
  Vite-required default-export allowance. Existing exceptions retain their intent;
  no other new principle/lint exception. No Changesets system exists; private packages
  remain unpublished, with no changeset added.
- Scope deliberately excludes tables/#28, general CSS/layout features, configurable
  budgets, editors, unrelated legacy/security fixes and delivery/tracker actions.

Initial handoff: Auditor should review the full 42-modified/56-new delivery plus this task's
delta, independently challenge paragraph normalization/glyph positions/roundoff,
local region stroke/font ink, cumulative source/generated caps and page-21 liveness,
component identity/resources/lifetime and diagnostic prefixes. Check actual multi-page
PDF/raster/extraction, both fixed CMR hashes, clean packed declarations/closures,
dynamic showcase failure/cancel safety and manual-only Pages settings. Only independent
verification should unblock #28; implementation is not verification.

## Auditor R1 — approved inverse translation, implemented pending re-audit

Builder approved Architect's specific numerical policy, not a global epsilon change.
The unmodified engine reproduced data/component failures: top margin 700, height
730.9 yielded two pages (kept paragraph failed); left margin 700, width 760.03
rejected nine Helvetica As. Compensated subtraction alone cannot recover an intended
decimal from exact binary64 operands. R1 now uses private operation-owned capacity.

Boundary coordinates are established once from compensated source reservations,
including each applicable header/footer gap. `DerivedAxis` retains start/end,
nominal rounded difference and capacity. Constant-sized bit-decomposed BigInt
dyadics compute the exact midpoint of end/nextUp(end), subtract start exactly and
floor to the greatest finite binary64 extent. Equality at that midpoint is allowed
only for an even endpoint significand. No decimal strings/quantization or numerical
nudge search, and no certificate or allowance is accepted from unknown user data.
Both half the upward endpoint spacing and absolute capacity-minus-nominal must be
≤32 **local nominal-extent ULPs**, compared exactly even for subnormals. Reversed,
empty, nonfinite or unavailable finite cells reject. Ill-conditioned axes reject
unconditionally before body work, including empty bodies, with the approved exact
`GEOMETRY` message/path. Full contract: [layout README](../../packages/layout/README.md).

The owned capacity supplies body measurement, pagination, generated rich boxes and
placements. Each actual `y = regionStart + cursor`, then `y + height`, is checked
against the intended boundary; body reservations cannot overlap, and repeated-region
actual endpoints must fit their shared reservations. Failure is `GEOMETRY`, not a
baseline shift, clip or shrink. Explicit block/region heights, font sizes/advances,
core measurement values/tolerances, font ink checks and final core validation are
unchanged. The original local #27 three-line test is translated to origin 700; a
separate regression explicitly proves that origin-zero 30.9 flow now rejects its
materialized rounding tail while public #26 `measureText` still accepts those lines.
This distinction is required by the approved exact materialization rule, not hidden.

### Exact remediation delta and delivery

Same cwd `/home/sprawl/projects/updf/trees/measured-flow-tables`, branch
`feature/measured-flow-tables`, base/HEAD
`ac60f80675a2042f2f6043bae51b541b85e7251f`. Supplied starting scope was 42 modified /
56 new; final complete scope is **42 unstaged tracked modifications / 61 untracked
files (103 total)**. It is exactly the initial scope above plus the five new files
below, with the fourteen existing paths below additionally edited. Committed delta
0, index empty, no tracker/Git/delivery actions or other worktree edits.

```text
New (5):
apps/browser-fonts/flow-numerical-proof.ts
packages/layout/src/axis.ts
packages/layout/src/binary64.ts
packages/layout/test/axis.test.ts
packages/layout/test/cancellation.test.ts

Additionally edited (14):
apps/browser-fonts/app.ts
docs/architecture/packages.md
docs/evidence/flow.md
docs/native-api.md
docs/roadmap/current.md
packages/layout/README.md
packages/layout/src/paginator.ts
packages/layout/src/template.ts
packages/layout/test/resources.test.ts
packages/layout/test/roundoff.test.ts
scripts/boundaries.ts
tests/browser/browser-flow.test.ts
tests/consumer/types/flow-template.tsx
tests/integration/flow.test.ts
```

`git status --porcelain=v1 -uall`, `git diff --cached --stat`, branch/HEAD checks and
`git rev-list --count ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD` confirm this
actual delivery; `git diff --check` passes. The protected measurement document
SHA256 values above are unchanged, as are all core/measurement sources and tests.
Only exact `layout/src/axis.ts` joins the internal importer inventory; no export,
dependency manifest/lock, compiler config, lint rule or SVG tolerance was changed.

### Risk-based evidence and exact gates

Fifteen added native/integration cases bring **130 → 145**: original height kept/
split and separate blocks, nine-As/all-alignments/generated remeasurement, nextDown/
nextUp endpoints, fractional header/footer/gaps/right/bottom, midpoint tie parity,
subnormal/unavailable cells, maximal capacity across ≥160 bounded exponent/binade
samples, exactly-at/above conditioning threshold, large-page/small-body empty/3-item
rejection, zero/negative/reserved overlap, actual association/overlap, explicit fixed
height preservation, forged certificate rejection and prepared left-overhang `FONT_INK`. Existing #26 tests remain
unchanged and pass. Packed native TSX now checks both fractional kept/split byte parity.
Node/Chromium compare fractional/rejection diagnostics plus complete PDF bytes/result
JSON with identical prepared fonts. Fractional PDF qpdf, ordered header/three complete
nine-As lines/footer extraction and contained colored raster ink pass independently.

| Exact command (same cwd, Node v24.21.0) | R1 outcome |
| --- | --- |
| `npm run build -w @updf/layout` | pass |
| `npx tsx --test packages/layout/test/*.test.ts` | pass; initial old zero-origin test failed the newly required endpoint check, then explicitly updated/tested as above |
| `npm run format:check` | pass, 254 files, no fixes |
| `npm run lint` | pass, Biome 257 files and unchanged ESLint thresholds |
| `npm run typecheck` | pass, all strict workspace builds/root types |
| `npm test` | pass, **145/145**, including retained #26/CMR/preservation and fractional qpdf/extraction/raster |
| `npm run build:showcase && npm run test:showcase` | pass, **12/12**, 105-module build |
| `npm run build:browser && npm run check:graphs` | pass, **10 bundles/graphs**, flow closure 36 modules; portable/no optional leakage |
| `npm run test:browser` | final **5/5 pass**, all 11 unchanged SVG references; intermediate proof-display crash fixed below |
| `npm run test:consumer` | pass, **6 isolated packed closures**, strict NodeNext/Bundler/types[] fractional TSX |
| `npm run check:licenses` | pass, **6 tarballs**, MIT notices/font-asset exclusions unchanged |
| `npm run sizes` | pass, flow **48,272 / 14,239 gzip**, core/measurement/VDOM unchanged from initial #27 |
| `node apps/node/dist/cli.js artifacts/cmr.pdf` | pass, regenerated |
| `node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf` | pass, regenerated |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf docs/measurement.md docs/evidence/measurement.md` | all four required hashes above unchanged |
| `qpdf --check artifacts/flow/flow.pdf`, `qpdf --check artifacts/flow/fractional.pdf`, `qpdf --check artifacts/showcase/updf-flow.pdf` | all pass |

One intermediate full browser run was 4/5: the new full-byte JSON proof was displayed
as a huge unwrapped `<pre>`, and the existing full-page screenshot triggered Chromium
SkBitmap allocation failure at width 9,436,692 pixels. This was a real proof-display
defect, not waived or called a flake: the byte payload is now hidden test data, still
compared in full, while visible proof/download UI is unchanged. Rebuilt full browser
suite passes. No SVG failure recurred, but the earlier all-black intermittency remains
disclosed above; no raster reference/tolerance was changed. Prior legacy 18/1/6 and
audit 45/production 0 results are retained, not claimed rerun by this remediation.

Final site initial JS remains **62.31 / 20.94 kB gzip**; optional flow is now
**13.15 / 4.90 kB**, SVG unchanged **28.44 / 10.31 kB**. Code-principles checklist
repeated: sound bounded certificates, cohesive ≤400-line production files, functions
≤49, depth ≤3, intent-only comments, no unsafe any/broad waiver, proportional tests,
passing relevant lint/typecheck/tests. No new principle exception; 32-local-ULP policy
is the approved contract, not a waiver. No Changesets system/publishing/delivery work.
R1 is **implemented, not independently verified**; no other unresolved code finding is known from these checks.
Auditor must independently verify the exact certificate,
conditioning boundary, actual association semantics and complete 42/61 delivery; rerun browser/raster gates and confirm hashes. #28 remains blocked pending #27 audit.
