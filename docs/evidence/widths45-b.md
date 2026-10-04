# #45-B native table width integration

Engineer implementation evidence, ready for independent audit; not independently
verified. #45 remains OPEN. Parent owns integration and tracker/delivery mutations.

## Delivery state and manifest

- Worktree/cwd: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Clean incoming base and unchanged HEAD:
  `71d37a7518d2cfb97732b88eca259e3198629e30`.
- All changes below are Engineer-owned, unstaged modifications or untracked new
  files. No staged/committed delivery, delegation, dependencies, tracker changes,
  Git discard or delivery operations. No Changesets workflow is present.
- No shared resolver algorithm changes, core/legacy/historical evidence changes,
  intrinsic scans, spans, row splitting, #44 implementation or #50 test changes.

Exact repository manifest (19 modified files, four new files including this one):

```text
M apps/browser-fonts/deferred-table-proof.tsx
M apps/showcase/src/tables.tsx
M docs/authoring-migration.md
M docs/tables.md
M packages/layout/src/data.ts
M packages/layout/src/extension-producer.ts
M packages/layout/src/extension-types.ts
M packages/tables/README.md
M packages/tables/src/adapter.ts
M packages/tables/src/checks.ts
M packages/tables/src/decorations.ts
M packages/tables/src/edge-report.ts
M packages/tables/src/measure.ts
M packages/tables/src/types.ts
M packages/tables/src/validate.ts
M tests/consumer/types/composable-tables-template.tsx
M tests/fixtures/composable-inventory.ts
M tests/integration/composable-tables.test.ts
M tests/showcase/tables.test.ts
A packages/tables/src/widths.ts
A packages/tables/test/widths.test.ts
A packages/tables/test/width-allocation.test.ts
A docs/evidence/widths45-b.md
```

Temporary baseline replay only: `/tmp/opencode/updf45-baseline.ts` (not repository
delivery). It loads the incoming revision's table adapter using `git show`,
transpiles its unchanged scalar measurement path against current public layout
and table helpers, and compares native PDF bytes with the delivered adapter.

## Contract / acceptance mapping

The [shared A contract](widths45-a.md) supplies exact dyadic fixed/min/max weighted
distribution and fair positive rounding. `TableColumn.width` now shares its
`WidthTrack` type. Native table validation accepts positive finite fixed numbers
or plain `{ weight, min?, max? }` data, rejects every invalid/unknown part even
when unused, and names `/columns/<index>/width/<part>` (JSON-pointer escaping
included). Resolution errors translate resolver track paths to public columns;
infeasible fixed/minimum sums name the current occurrence's `/props/columns`.

The adapter resolves columns once per occurrence before JSX part expansion or
any cell measurement. Its frozen scalar column array drives body, head, foot,
border reports and all fragments. Deferred sections receive the certified frozen
allocation through a private operation-owned capability retained across immutable
adapter-props snapshots. Internal occurrences reuse it without running the exact
resolver again against the rounded native summed extent. No weighted redistribution
occurs during page finalization. Distinct public occurrences measure against their
local available width and current providers/resources; no module-global width
cache or retained caller tracks is introduced.

Geometry decision: actual table extent is the existing native left-to-right sum
of resolved scalar widths, not full available width. Fixed tables therefore stay
narrow and preserve placement/output association. Saturated maxima and rounding
slack leave trailing space. A native materialized total beyond available capacity
rejects, rather than silently clipping or expanding. Existing layout translated
coordinate, edge-region, content and final ink certification remains unchanged.
Column content width subtracts local borders and effective padding via the
existing cell content engine; deferred section probe tests confirm the same
certified content capacity on every page.

Resource seam: adapter props are source-preflighted before validation (and the
validated result still preflights). This bounds column arrays before scanning
their entries. New public `MeasureContext.chargeSourceWork(count, sourcePath)`
charges actual column count cumulatively against operation source-node policy,
before mapping tracks or running the resolver; aliased objects cannot evade this
charge. It rejects invalid counts and closes with the measurement context.
`maxTracks` receives the already-budgeted actual count, not a new hidden ceiling.
The existing generic preflight scan still charges source objects independently.

Risk-based additions: eleven native width tests cover mixed weights, simultaneous
min/max clamps, fractional rounding, max-saturated narrow tables, exact infeasible
fixed/minimum ULP controls, invalid/escaped width fields, infeasibility before JSX
callbacks, caller mutation, deferred PageContext head/foot/body capacities,
repeated providers/local width, cumulative aliased-column budgets, and actual
cell PDF parity at `2**500` / `2**-500` scales. Scalar regression is pinned to
incoming-adapter byte parity: **2751 bytes**, SHA-256
`5e04a982dc89771b99b942a61925d7256a03049a086bfead7e0b83ee43b7f7e6`.

Weighted inventory output is byte/placement-identical to the existing scalar
three-page fixture, so the existing qpdf/Poppler 63-edge raster oracle and missing
grid negative control apply to both without weakened thresholds. Existing table
PDF/shared-edge/clipping negatives also pass. The deferred browser proof now
uses a min/max weighted track with prepared fonts and captured final contexts.
The typed showcase uses real weighted columns, and Chrome asserts that the actual
displayed raw module contains the weighted configuration. Packed consumer TSX
exercises fixed plus weighted/min/max types under NodeNext and Bundler.

## Original implementation validation (superseded by auditfix below)

Commands from the exact delivery cwd, unless an absolute temporary script is named:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome errors and code-principles ESLint |
| `npm run typecheck` | Pass, including full workspace build |
| `npm test` | **518/518 pass**, zero skipped (incoming 507 + 11 width tests) |
| `npm run test:consumer` | Pass: seven clean tarball closures, NodeNext/Bundler types/runtime |
| `npm run build:browser` | Pass, all 12 build inventories regenerated |
| `npm run build:showcase` | Pass |
| `npm run check:graphs` | Pass: source seams and all 12 inventories; optional capabilities stay separated |
| `npx tsx /tmp/opencode/updf45-baseline.ts` | Pass: incoming scalar adapter/current byte parity, pinned hash above |
| `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase` | **49/49 pass**, zero skipped; final rerun after source assertion |
| `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | **9/10 pass**, zero skipped; only existing user-deferred #50 SVG signature failure |
| `git diff --check` | Pass |

Browser/showcase commands used tool timeout **600000 ms**, completed normally.
#50's registered SVG signature fails at inkMassDeltaRatio
`0.030079044159627057`, with bboxDelta/interior/foreground mismatches zero. Root
cause is not confirmed. No skips, thresholds, registration, renderer or SVG
behavior were changed; no all-browser-green claim is made. Existing Vite >500kB
browser-font chunk warning is nonfatal; dependency graphs pass.

Development failures were corrected: scalar edge-report typing, test-only margins
and certified content-capacity expectations, a TSX component return type, and
function-length lint findings. Final authoritative commands above pass except
the explicitly retained #50 deferral. Full gate output is retained by the tool at
`/home/sprawl/.local/share/opencode/tool-output/tool_105182d20001UqaJbt0cCKZOkt`.

## Code principles and next owner

Universal checklist: correctness checked; no avoidable unsafe patterns; defaults
followed; cohesive production files below 400 lines; functions below 50 lines,
nesting at most three; intent-only comments; risk-proportional tests; lint and
tests pass. No code-principles exceptions. The only approved gate exception is
the user's existing #50 browser deferral, disclosed above. No Changeset added
because this repository does not use Changesets.

Status: #45-B **implemented**, ready for Auditor; #45 remains OPEN because parent
tracker integration is explicitly reserved. Acceptance implemented across A+B;
independent verification and delivery remain parent-owned. Auditor should review
the actual unstaged/untracked manifest, fixed-byte parity, actual-count budget
seam, source-path translation, native summed extent and frozen deferred scalar
reuse, and confirm #50 remains registered. Then parent may assign #44 Row as a
fresh slice: consume `resolveWidths` with its gap/count budget and existing
materialized coordinate certification, without duplicating distribution math.

## auditfix45-B: fractional deferred allocation

Objective: fix deferred head **and** foot re-resolution for fixed `[20.1, 30.2]`
and weighted tracks saturated at those maxima. Their exact dyadic sum exceeds the
native left-to-right extent `50.3`; the original allocation fits width 100, but
re-resolving against that narrower native extent correctly rejects. The shared
resolver and materialized geometry certification are unchanged.

This bounded remediation changed only `packages/tables/src/{adapter,decorations,
widths}.ts`, `packages/tables/test/widths.test.ts`, this evidence, and the new
`packages/tables/test/width-allocation.test.ts`. All other incoming files are
preserved. The separate capability test keeps the existing width test file below
the enforced 400-line limit. No new layout seam, public table flag/type, dependency,
tracker, stage, commit, or delivery mutation was needed.

Transport: a private WeakMap associates the certified frozen columns with an empty
`ScopedContent` capture minted by the current `MeasureContext.readParts`. Existing
snapshot rules preserve that owned capability. Only the internal decoration
descriptor carries it; ordinary table validation still rejects an `allocation`
boolean, serialized object, or copied token. Adapter validation first validates
all normal columns/style/sections. Reuse opens the empty capture to enforce the
owning operation and active context, charges actual column count cumulatively,
then uses the original columns. Native table summation, local cell bounds, shared
edges, callbacks, captured providers, final page counts and source paths retain
their existing paths. No module-global caller-track or width cache is introduced;
the private weak association is keyed only by operation-owned capability identity.

Risk tests added (three tests, bringing full suite from 518 to 521):

- Two-page JSX fixture: fixed and max-saturated weighted columns, both repeated
  deferred edges, exact per-column capacities, captured provider and final page
  counts, placement/PDF parity, plus direct public infeasibility negative.
- Data-section fractional deferred head/foot: static/deferred placement parity,
  fixed/weighted deferred PDF byte parity, and invalid caller allocation claims.
- Capability negatives: copied token, cross-operation reuse, closed context and
  cumulative reuse charge exhaustion at `/props/columns`.

Incoming baseline replay: `node /tmp/opencode/updf45-fractional-baseline.ts`
transpiles **both** adapter and decorations from unchanged HEAD
`71d37a7518d2cfb97732b88eca259e3198629e30`, keeping their mutual adapter association,
against current built helpers. It uses the same two-page regression fixture and
asserts exact placements, callback samples and PDF bytes. Pass: **2,922 bytes**,
SHA-256 `279b9a6d06e175aa1989bb46ac0540c7f0bd853c9a4701a9626ad4a0f480d34e`.
That incoming hash is pinned in the repository regression. This temporary replay
script is outside the delivery manifest.

### Remediation final gates

All commands ran from `/home/sprawl/projects/updf/trees/authoring-api` on unchanged
HEAD above; no checks remain running.

| Command | Outcome |
| --- | --- |
| `npx tsx --test packages/tables/test/widths.test.ts packages/tables/test/width-allocation.test.ts packages/tables/test/deferred-cells.test.ts` | **22/22 pass**, zero skipped |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome and code-principles ESLint |
| `npm run typecheck` | Pass: full workspace build plus root TypeScript |
| `npm test` | **521/521 pass**, zero skipped |
| `npm run test:consumer` | Pass: seven packed closures, NodeNext/Bundler types/runtime |
| `npm run build:browser` | Pass: all 12 inventories rebuilt |
| `npm run check:graphs` | Pass: source seams and all 12 inventories |
| `npm run build:showcase` | Pass |
| `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase` | **49/49 pass**, zero skipped |
| `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | **9/10 pass**; only unchanged, approved #50 SVG signature deferral |
| `node /tmp/opencode/updf45-fractional-baseline.ts` | Pass: two-page incoming parity above |
| `git diff --check` | Pass |

The #50 failure remains exactly `inkMassDeltaRatio: 0.030079044159627057`, with
interior/bbox/foreground mismatch metrics zero. No skip/threshold/renderer change.
The existing >500kB font-browser Vite warning remains nonfatal. Development-only
failures were corrected: stale build invocation, a component return type, static
versus deferred wrapper byte expectations, replay source/dist identity mismatch,
and test-file size lint. Final full gates/baseline output:
`/home/sprawl/.local/share/opencode/tool-output/tool_1052bd88f001V2xl5mv7o86rAx`.

Code-principles checklist: correctness and strict caller rejection checked;
defaults followed; cohesive files below 400 lines; functions below 50 lines and
nesting at most three; intent-only comments; three risk-proportional regression
tests; format/lint/typecheck/tests pass. No code-principles exceptions. Only the
already approved #50 browser gate exception remains. No Changesets workflow.

Status: **implemented, ready for re-audit**, not verified. #45 remains OPEN per
incoming evidence; no tracker mutation performed. Auditor should inspect the full
19-modified/four-new manifest, specifically capability snapshot identity,
operation/lifetime checks, cumulative column work, both fractional deferred edges,
the incoming pinned baseline, and unchanged source paths/materialized bounds.
Independent re-audit and any delivery action remain caller-owned.
