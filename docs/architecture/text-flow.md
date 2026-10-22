# Optional exclusion-based text flow

**BROADER PROPOSAL — NOT IMPLEMENTED.** Exclusions/contours and later phases below
remain a design, not available authoring APIs. A separately assigned rectangular,
no-exclusion runtime slice is now implemented, pending independent audit; see
[runtime evidence](../evidence/text-flow-runtime.md) and the
[actual phased API](../../packages/text-flow/README.md). Observations and unresolved
transport discussion below describe the original source baseline, not that new
runtime contract. No full contour feature or independent verification is claimed.
Source baseline: `244c0932c733accace68b7d8fb85cdc8f851d4e8` on `develop`.
Issue: N/A; implementation and delivery require separate assignments.

## Goal and boundaries

Compose text around manually described reserved regions in one local frame.
A region may accompany a raster image, vector painting, chart, badge, other
visual, or no visual at all. Exclusion geometry must not depend on resource type,
decoded pixels, PNG alpha, SVG parsing, or a particular producer.

The first shippable feature is an **atomic text-plus-optional-visual block**.
It is not an arbitrary-object float engine: no sibling displacement, page-relative
floats, global float queues, image splitting, CSS shape-outside parity, shaping,
bidi, or automatic contour extraction. Initial text uses explicit fixed numeric
line-height, left alignment and the existing supported simple LTR repertoire.
Unsupported modes must fail explicitly rather than silently approximate them.

A frog silhouette needs widths that vary by vertical band. A bird with spread
wings can leave several usable intervals on the **same baseline**. A bounding
rectangle is a useful first exclusion but does not satisfy either contour case;
one width per line cannot satisfy the bird case.

## Current capabilities and missing seams

These observations describe this source baseline, not historical PR status.

| Owner / source | Available now | Limit for this proposal |
| --- | --- | --- |
| Layout [adapter types](../../packages/layout/src/extension-types.ts), [adapter factory](../../packages/layout/src/extensions.ts) | `defineBlockAdapter`, local extensions, operation-owned `MeasureContext`, atomic or splittable `MeasuredBlock` | `next({ offset, extent, width })` queries source units at a width; it receives no page-relative origin or sibling exclusions. It can host self-contained atomic composition, not arbitrary floats. |
| Text [wrapper](../../packages/text/src/wrap.ts) | Font-derived atoms, run-local source offsets, whitespace and long-word policies, bounded wrapping | One scalar width for the whole wrap; no resumable variable-band/multi-interval composition operation. |
| Text [inline measurement](../../packages/text/src/inline.ts), [line construction](../../packages/text/src/lines.ts) | Atomic inline metrics, baseline/ink reports and native fragment geometry | Inline participation is not an external exclusion contour. Reuse these metric/painting owners, not repeated substring measurement with guessed coordinates. |
| Core [text contract](../../packages/core/src/core/text-service.ts), text [service implementation](../../packages/text/src/service.ts) | Explicitly enumerated callbacks, captured and validated by core | Extra methods cannot simply be attached to `options.text`; `ownTextService` validates the allowed keys and captures only known callbacks. |
| Layout [content roles](layout-content-roles.md), [admission evidence](../evidence/uniform-body-admission.md), [preparation evidence](../evidence/fragment-paint-preparation.md) | Width-only provider ABI, mandatory top-level native admission and selected-graph preparation | New composition must use these owners; no special eligibility branch, parallel admission session, or late unprepared child painter. Evidence status is not upgraded here. |
| Geometry [exports](../../packages/geometry/src/index.ts), [shapes](../../packages/geometry/src/shapes.ts), [manifest](../../packages/geometry/package.json) | Path/color normalization, polygon-to-path and ellipse helpers; dependency on core, not SVG | No exported polygon exclusion, band projection, interval subtraction or contour-flow engine. Path parsing is not an exclusion solver. |
| [Package architecture](packages.md), [graph checks](../../scripts/graph-check.ts), [size tooling](../../scripts/sizes.ts) | Optional package boundaries and measurement infrastructure | No text-flow package or measured isolation evidence yet. Existing checks will need explicit new cases. |

## Proposed ownership and dependencies

Introduce optional `@updf/text-flow` as the composition owner, depending one-way
on `@updf/layout` and explicitly selected opt-in text machinery. Core and layout
must not import text-flow. Text-flow must not import JPEG, PNG, SVG, a decoder,
font parser, or application resource-loading code. Applications supply prepared
visuals and the existing matching resources/providers separately.

- **Text owner (`@updf/text`):** retain font selection/metrics, atomization, token
  policy, runs, whitespace, source offsets, baseline and native text geometry.
  Add a narrow operation-owned composition capability only after a rectangular
  parity proof. Do not duplicate font measurement in text-flow.
- **Composition owner (`@updf/text-flow`):** validate local exclusion inputs,
  request free intervals, advance text in source order, combine prepared text and
  optional visuals, and expose an atomic layout adapter.
- **Layout owner:** keep operation lifetime, source/output/page budgets, selected
  graph preparation and paginator admission. Composition is block participation
  with atomic fragmentation, not a new Row/Column mode.
- **Geometry owner:** assess reuse of `@updf/geometry` for shared representation,
  validation and diagnostic overlays. Its current polygon helper produces paint
  commands; it does not solve exclusion. Reusable pure band geometry can live
  there through a narrow export if that responsibility and retained cost are
  justified. Do not add an SVG dependency just to obtain paths, nor duplicate
  generic geometry in an image-specific helper. Exact placement is a phase gate.

### Capability transport: unresolved decision, proof required

Prefer an explicitly selected narrow text-composition capability over adding
required methods to every core `TextService` or a global plugin registry. The
current `MeasureContext` exposes `measureText`, not a variable-band session;
neither the text-service object nor adapter props provide a solved transport ABI.

The first runtime slice must prove how the capability receives the **current**
operation's bindings, cumulative ledger and source path, how outputs are validated
and captured, and how use after return or across operations is rejected. Evaluate
an opt-in operation-scoped bridge with the layout/text owners. Do not pass a raw
font runtime or independent ledger in props, cast an extra core service method,
use a side-channel registry keyed by service identity, or bypass ownership by
closing over standalone measurement. If the narrow bridge cannot preserve these
invariants, stop for a contract decision before implementing contours.

## Provisional author model (not executable)

The following is conceptual data notation, **not TypeScript exports, an install
recipe or code that can run in this checkout**. Names, units transport and owned
handles still need the parity/transport proof.

```text
TextFlow proposal
  text: existing rich paragraph runs and explicit supported text policies
  frame: local point width; bounded height or bounded natural selection
  exclusions:
    - shape: rectangle | simple closed polygon
      localToFrame: shared placement transform
      clearance: finite nonnegative point distance
  visuals: optional separately supplied native content
    - content: prepared visual with existing resource/provider bindings
      localToFrame: the same placement transform used for its exclusion
  fragmentation: atomic (first release)
```

Exclusions and visuals are independent lists, not a `png` field or an implicit
pixel-to-point conversion. One reserved region may have no visual; one visual
may have several exclusion polygons. The host declares a common local coordinate
space and supplies the same transform to both. Geometry must never be inferred
from decoded content or silently fitted differently from the visual. Start with
translation and positive axis-aligned scale; reject unsupported transforms.
Constrain polygon inputs to bounded, finite, simple closed rings initially;
reject self-intersections/unsupported holes rather than inventing a fill rule.
The exact validity, clearance and boundary-contact rules must be specified and
tested before polygon implementation.

## Band composition and painting contract

1. Resolve and validate text/resources once within the owning operation. Preserve
   exact authored width/cache identity and existing text-policy semantics.
2. Establish the occupied vertical band of a candidate line from the fixed line
   height, actual font envelopes, ink and native paint boxes. Reject incompatible
   metrics as existing text validation requires; line-height alone is not proof
   that ink fits. Query exclusions across the **whole occupied band**, not only
   at the baseline or at one horizontal slice.
3. Transform exclusions into frame points, apply declared clearance, project all
   intersections across that band, union blocked x ranges and subtract them from
   the frame. Return sorted disjoint free intervals. A conservative projection
   may reserve more space, but must never miss an intersection between samples.
4. Consume tokens across intervals left-to-right on the same baseline, then
   advance vertically. Preserve hard breaks, whitespace, long-word policy and
   source offsets across interval boundaries; an exclusion gap is not inserted
   source whitespace. Specify whether an unfit token proceeds to a later interval
   or later band before applying overflow; never split it merely to fill a gap.
5. If no interval can progress, advance to a bounded next band/event or fail at
   the frame limit. Charge every attempted band, polygon edge visit, interval,
   token visit and retained output to declared cumulative limits; retries cannot
   reset budgets. No zero-progress loop or unlimited natural-height search.
6. Build one prepared result containing text reports and native nodes with the
   same coordinates. Never rewrap fragments independently during painting.
   Preserve existing native text certificates and prepare the selected visual
   child graph before any painter or late callback. Admit the actual atomic
   height at its margin-adjusted origin through the existing paginator.

Occupied height includes reserved geometry and visual bounds as well as text;
paint outside the returned frame must be rejected under existing constraints,
not hidden by clipping. All text must be consumed or produce an explicit overflow
diagnostic; an atomic block that cannot fit an empty page fails, not loops.
Repeated `next` queries/lookahead must be deterministic and bounded, not consume
an unrepeatable cursor. Own/cache results within the operation using exact input
identity; release state on success and failure.

Numerics follow the [numerical policy](numerical-policy.md): validate finite
domains, nonnegative clearance, source offsets, quotas, handle ownership and
authored identity exactly. Derived intersection/containment arithmetic may use
`@updf/layout-boxes/arithmetic` with justified local scales, never a unit epsilon
or tolerance on native certificates. Edge/vertex tangency, tiny intervals,
overhangs and cancellation require boundary tests before choosing comparisons.

## Bounded implementation phases

Each phase is a fresh assignment with independent audit; this document authorizes
none of them. Phase owners denote responsibility, not delegated agents.

| Phase / owner | Acceptance evidence | Safe stopping point |
| --- | --- | --- |
| 1. Rectangular text parity and capability proof — text + layout owners, one integrating engineer | No contour engine yet. One full-width rectangle with no exclusion reproduces existing measurement and native render baselines, runs, ink, whitespace, source offsets and overflow behavior. Prove operation-scoped transport, cumulative budgets, repeated queries, exception cleanup, cross-operation/use-after-return rejection, and native admission. Exercise Helvetica and supported prepared fonts, mixed styles and ink overhangs. Record paired non-user size/runtime costs. | Stop with the narrow parity proof and recorded ABI decision; do not present a text-flow feature or proceed if ownership/budgets/render parity are unresolved. |
| 2. Rectangle exclusion, atomic composition — text-flow integration owner with text/layout owners | One side reservation plus separately supplied visual or empty region; deterministic skipping of blocked bands, complete text or controlled overflow, measurement/render parity, actual-height admission and oversize-page rejection. Same geometry works with vector, raster and no visual; no decoder imports. | Audit a bounded atomic rectangular feature before polygon work. |
| 3. Polygon bands and multiple intervals — geometry + text-flow owners | Decide geometry reuse/export; specify ring, clearance and boundary semantics. Frog variable-width and bird same-baseline multi-interval fixtures pass source-order/extraction, nonintersection and raster checks. Cover tangencies, narrow gaps, overlapping exclusions, transformed geometry, blocked bands, long tokens and exhausted work limits. | Audit manual rectangle/polygon atomic composition; no pagination promises. |
| 4. Safe-cut pagination — layout + text-flow owners | Separately design continuation state, legal source cuts, local coordinates and visual ownership. Prove no lost/duplicated text, bounded retries and admission on every page. Cut only where unsplit visuals and their exclusion regions permit; no image splitting. | Keep atomic-only support if legal cut semantics are unresolved; do not widen `next` into page-relative floats incidentally. |
| 5. Optional contour preprocessing — separate preprocessing owner | Only if requested: bounded alpha tracing or other geometry producers yielding the same manual geometry model, with transform/error/complexity evidence. Decoder dependencies stay outside text-flow. | Deliver independent preprocessing, never a required PNG/SVG path for layout. |

Every runtime phase must run relevant format/lint/typecheck/tests and affected
package/host gates. Add emitted Node/browser import-graph assertions so core,
layout and drawing-only/non-user consumers cannot reach text-flow or its opt-in
machinery; check used-feature graphs too. Pair before/after retained bundle sizes
and runtime measurements for the same non-user and feature fixtures, builds,
fonts, environment and repetitions. Set/approve regression thresholds from that
evidence, not from a claim that tree-shaking will remove optional code.

## Documentation reconciliation at this baseline

These are findings, **not unrelated edits or newly verified delivery states**.

- [Root readme](../../readme.md), “What is available here?” (lines 15–18), still
  calls the checkout a JPEG worktree based on `bb8395b`, names draft PR #66 and
  says “this documentation slice awaits independent audit.” That is stale
  branch/slice provenance at the source baseline above, not evidence of current
  PR or audit state. Its licensing/delivery section also says “This pull request”
  without current scope. Reconcile separately against actual delivery records;
  do not infer that all later changes have been audited.
- [Agent map](../agents/README.md) and [workflow](../agents/pdf-authoring.md) are
  substantive, with a real [notice template](../../examples/agents/notice.ts)
  and [integration assertions](../../tests/integration/agent-authoring.test.ts)
  for repeatability, wrapping, input rejection, PDF validity, extraction and page
  bounds. These are existing test definitions, not tests rerun for this design.
  They do not establish aesthetic/visual readiness: the workflow explicitly asks
  for manual PNG inspection, and the integration test has no raster comparison.
- The agent map links only JPEG for “Logo / image resource.” The workflow's JPEG
  paragraph says “no PNG, alpha ... is promised,” which is accurate for that JPEG
  adapter but can read as a project-wide limit. Optional PNG/alpha exists in the
  [PNG package](../../packages/png/README.md) and is listed in the root readme.
  A future docs-only reconciliation can disambiguate that scope; it is not a
  missing generic image API or a reason to couple exclusions to PNG.
- The previously stale root checkout was fast-forwarded before this assignment;
  this proposal was checked against the updated revision. Checkout lag is not
  an API mismatch. No live PR, release, deployment or tracker status was queried.

## Readiness decision

The existing agent docs support a source-driven authoring/validation loop, not
autonomous visual sign-off. The current adapters are sufficient as an eventual
atomic composition host, but variable-band text composition and safe capability
transport are implementation blockers. Geometry semantics, paired isolation
evidence and independent audits remain phase gates. There is no callable
text-flow API in this revision; rectangular parity is the next bounded runtime
slice, not a PNG-specific contour implementation.
