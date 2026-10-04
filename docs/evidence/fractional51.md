# GH#51 — public fractional reservation repair

Status: **implemented under parent-approved restricted acceptance**, ready for
independent audit, not verified. GitHub issue [51](https://github.com/surikaterna/updf/issues/51)
remains **OPEN**; tracker mutations were expressly prohibited.

## Manifest and ownership

- Worktree/cwd: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Base/HEAD: `e9e6261ff662f42601c04bd9631801c28d288944`, unchanged.
- Incoming dirty state: `scripts/boundaries.ts` (+1 inventory entry), plus five
  untracked files: this document, `fractional51-slice1.md`, layout
  `generated-interval.ts`, `generated-interval.test.ts`, and
  `fractional-reservation.test.ts`. The inventory entry was preserved unchanged;
  parent authorized integration of the incoming GH#51 helper/tests/evidence.
- Current production edits: layout `content-producer.ts`, `container-paint.ts`,
  `stack.ts`, and `protocol.ts`, with the private untracked helper above.
- Documentation: layout README and both GH#51 evidence documents.
- Tests: both layout tests above, new integration
  `tests/integration/fractional-reservation.test.ts`, and the existing browser
  numerical-proof fixture `apps/browser-fonts/flow-numerical-proof.ts`.
- All tracked edits are **unstaged** and new files **untracked**. No staged or
  newly committed changes, pushes, nested delegation, tracker writes or delivery
  actions. No example theme/font-choice changes. No Changesets setup exists here.

## Actual runtime path and arithmetic

The repaired regression uses public `h(Block, { style: { padding: 6 }, children:
paragraph(...) })` in public `flow`/`document`, not the legacy `block` factory.
Both `pt(12.6)` and ratio `1.4` measure two 12.6pt lines at width 25, totaling
25.2pt. The 37 × 37.2pt zero-margin page lays out and renders successfully.

`contentProducer` captures line endpoints from one private `MetricSum` sequence
during fragment selection. Stack selection likewise captures piece endpoints
from one sequence, including positive spaces/gaps. Private identity bindings
associate certificates with their specific fragment/piece. Container painting
authenticates these bindings, checks exact source offset/semantic extent, admits
source endpoints strictly, then materializes a native-fitting **comparison
allocation**. Public callbacks cannot supply certificates. Uncertified start
calls retain the previous strict comparison; hidden-overflow behavior is unchanged.
Kept fragments receive their final offset before certification, avoiding loss of
ownership through a copied fragment.

The unchanged second line starts at 18.6. Its shared reservation endpoint is
31.2; native semantic addition is `18.6 + 12.6 = 31.200000000000003`. Only the
comparison allocation is `12.599999999999998`, whose native sum fits 31.2.
The existing exact-dyadic derived-axis midpoint/parity policy certifies capacity;
the semantic/allocation residual must be at most **32 local ULPs**. This is a
conditioning rejection ceiling, never source-overflow tolerance. Strict source
admission and native allocation endpoint fit are separate requirements.

No paint math changed: actual line groups retain starts `[6, 18.6]`, clip height
12.6, and nested richText height 9 with local y values
`[1.7999999999999998, 1.799999999999999]`. Glyph baselines, transforms, source
reservation sizes and byte association remain unchanged. The padded document
and PDF exactly match a control built by translating the existing unpadded
paragraph's native line groups. Independent qpdf, Poppler bbox, extracted text
and raster comparisons pass.

## Acceptance coverage and approved native constraint

- Both public forms: successful measurement/layout/render; real group/subnode
  geometry asserted without casts or treating native text height as line height.
- Ordinary invoice: temporarily mocked application theme ratio 1.4, restored in
  `finally`; full real invoice lays out/renders twice with deterministic bytes.
  No invoice/theme source edits. Stack certification covers its ordinary nested
  Block/Column content reservations rather than adding a homogeneous fast path.
- Nested origins 0.1, 43.1 and 55.2, fractional padding, gaps and borders render.
  Existing exact-fit, border, Row, fixed-coordinate and negative geometry tests
  continue passing.
- Direct tests reject one-ULP source overflow even when translation hides it,
  dishonest fragment height, one-ULP semantic extent mismatch, foreign fragment
  certificates, copied/forged records, invalid coordinates, collapsed intervals
  and ill-conditioning. Existing callback/resource/output-budget/context tests
  and fixed CMR byte fixtures pass in the full suite.
- Browser proof compares Node/Chromium data and native/component PDF bytes for
  both public forms, plus diagnostics for the page-edge negative control.

**Parent-approved restricted acceptance:** a 37 × 31.2pt page with top/side
padding 6 and bottom padding 0 is a semantic exact fit, but its unchanged second
transformed clip ends at 31.200000000000003. Layout must still reject with core
`BOUNDS` on `/clip` (strict-bounds policy). Both Node and browser tests retain
this rejection. This is a **native-materialization constraint**, not a claim
that all mathematical fits render. Core bounds, comparisons, clips, page size
and source reservations were not relaxed, shrunk or inflated. Legacy
`paragraphProducer` and features #52–56 are intentionally untouched.

## Validation on final runtime scope

Node v24.21.0; Chromium 152.0.7977.82 Arch Linux; qpdf 12.4.1; Poppler 26.08.0.

| Exact command | Result |
| --- | --- |
| `npx tsx --test packages/layout/test/fractional-reservation.test.ts packages/layout/test/generated-interval.test.ts packages/layout/test/axis.test.ts packages/layout/test/cancellation.test.ts` | PASS 28/28 |
| `npx tsx --test packages/layout/test/*.test.ts` | PASS 250/250 |
| `npx tsx --test tests/integration/fractional-reservation.test.ts` | PASS 1/1; qpdf and Poppler control comparisons |
| `npm test` | PASS 575/575, zero skips; existing CMR, invoice/PDF, callbacks/resources/budgets included |
| `npm run typecheck` | PASS; includes all workspace builds and root `tsc --noEmit` |
| `npm run format:check` | PASS |
| `npm run lint` | PASS Biome error gate + code-principles ESLint |
| `npm run test:consumer` | PASS seven clean external tarball closures, NodeNext/Bundler types and runtime ownership |
| `npm run build:browser` | PASS all 12 Vite graphs |
| `npm run build:showcase` | PASS |
| `npm run check:graphs` | PASS after final builds, including internal seam inventory |
| `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:browser` | PASS 10/10, zero skips; GH#51 numerical proof included |
| `SHOWCASE_CHROMIUM=/usr/bin/chromium npm run test:showcase` | PASS 54/54, zero skips |
| `git diff --check` | PASS |

Final full gate logs are `/tmp/opencode/updf51-complete-{test,layout,typecheck,consumer,browser-build,showcase-build,browser-test,showcase-test}.log`.
Chromium 154/#50 SVG and prior #48 qualifications remain unchanged; this slice
used Chromium 152 and did not blindly retry or claim those issues resolved.
Early iterations had the corrected import/assertion/contextual-type/style gate
failures; the results above supersede them. No failing final check is waived.

## Code-principles and audit handoff

Checklist: correctness validated; explicit private ownership and strict source
admission; cohesive production files below 400 lines; functions below 50 lines
and nesting within the configured limit; intent-only comments; proportional
public/helper/PDF/browser negative tests; format/lint/typecheck/tests pass.
No code-principles exception or suppression. The approved native page-edge
limitation is an acceptance restriction, not a lint/quality waiver. Existing
non-gating Biome cognitive-complexity warnings in the container/stack generators
remain; authoritative error-level lint and ESLint pass.

Auditor should inspect the actual unstaged/untracked manifest, certificate
identity/source containment versus allocation conditioning, preservation of
kept/split fragment ownership, unchanged native paint/PDF control, and the
explicit retained page-edge limitation. No remaining implementation acceptance
item under the restricted scope; independent audit and authorized delivery are
still pending.
