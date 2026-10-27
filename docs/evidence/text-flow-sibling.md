# Sibling rectangle float: prerequisite delivery, not integrated

**Latest state:** the bounded original-paragraph validation auditfix is implemented,
audit pending, ready for independent re-audit. The final section below supersedes
the earlier prerequisite cost/check snapshot; historical artifacts are retained.

## Scope and actual state

Objective: a real decorated rectangle Block followed by ordinary top-level rich
Paragraph siblings, using a positive-height composite fragment and the existing
Paginator admission owner. **That feature is not implemented by this delivery.**
This is a partial delivery of its generic rich-inline continuation prerequisite,
ready for independent audit of that prerequisite only. Issue: N/A.

Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`; branch
`feature/text-flow-design`; base and unchanged HEAD:
`882d6d38f432edcac97e962fbf446062c1483c3d`. The Engineer is integration owner.
There are no staged changes or new commits. Inherited rectangle, wrapper
optimization and edge-profile work is preserved, not claimed as this delivery.

Before runtime edits, `artifacts/text-flow/sibling-before/manifest.json` captured
1,502 tracked/nonignored-untracked source hashes, exact cwd/branch/HEAD, dirty
state, tooling versions, fixtures, manifests, scripts and lock identity. All
inherited source hashes matched `edge-profile-vs-before/evidence.json`.
Historical report SHA-256:
`ebf9a4daf5c4ba672c63d6401bfaac714adb2c56e35b56273c07891a2a6310fb`.
The fresh `sibling-before/report.json` matched **all 222 metrics** of that report.
Historical artifacts were not overwritten. Node v24.22.0; npm 11.19.1;
TypeScript 5.9.3; tsx 4.23.15. Full versions/flags are captured in the artifacts.

## Implemented API and owners

`createTextComposition` retains one existing text service and one optional
operation capability. In addition to existing compose/paint methods, selecting
that capability with `useOperationCapability` exposes generic methods:

```ts
const source = selectedCapability.prepareInline(
  paragraphDefinition, visualMetricsCallback, preparationWidth, lineHeights, path,
);
const handle = selectedCapability.selectInline(source, { width, maxHeight }, path);
const result = handle && selectedCapability.selectedInline(handle, path);
// result: { measured: InlineLine, width, continuation: InlineContinuation | undefined }
```

This is generic text selection, **not a new Paragraph authoring requirement**.
The layout proof starts from its existing normalized `AuthorParagraph`, retaining
style origins, UTF-16 source spans, inline visual descriptors and background maps.
It does not convert authored Span content into prepared Paragraph definitions.
The private `paragraphContinuation` bridge prepares visuals at the containing
preparation width once per prepared source. Calling the preparation API again
creates another source; automatic per-author preparation caching is not added.

- `prepareInlineAtoms` extracts the existing inline preparation owner without
  changing uniform measurement's validation/callback/order. Uniform measurement
  still uses its existing `wrap` owner. Visual metrics are snapshotted and
  validated before retention; source/style/height data are snapshotted too.
- The existing `LineSelector.fork` copies scalar source cursor/cache bindings and
  shares immutable source units. Its position is a token/scalar source position,
  not a line index; each selection can offer a different exact width.
- Selection creates one actual rich line using existing `inlineEnvelope`, `line`
  and `nativeLine`. It returns existing native metrics and line/ink geometry.
  Line geometry is local to top zero; the eventual fragment owner must position
  and prepare the full selected graph. This API is not native admission.
- `maxHeight` fits the actual nominal line height using shared `exceeds`; it is
  not a certificate for all glyph ink or surrounding decorations. Those retain
  the ordinary selected-graph preparation/native-admission responsibilities.
- Each query forks the source cursor. Height rejection, blocked width, failed
  output capture and repeated lookahead do not consume the supplied continuation.
  Successful selection also does not mutate it; the caller chooses whether to
  retain the returned continuation. Work charges are cumulative and not refunded.
- Continuation and selection handles are frozen, opaque, operation-owned WeakMap
  identities. Cross-operation, clones, forged handles and use after close reject.
  The layout bridge additionally rejects continuations from another rich source.
- `content-paragraph-output.ts` owns the extracted, existing reporting,
  source-diagnostic mapping, emission counts, background and painting closure.
  Uniform measurement and the continuation bridge both call it. No second
  `paintInlineText`, paragraph painter, measurement engine or font service exists.

Scalar domains, source indices and width identity are exact. Derived height fit
uses existing shared arithmetic; no EPS floor or native certificate is added or
changed. Core, Paginator, layout-boxes, fonts, geometry and image providers are
unchanged from the frozen baseline. Optional selection modules do not enter any
ordinary retained consumer graph; no default core/ordinary feature state is added.

## Concrete remaining integration boundary

`protocol.ts` requires numeric `offset`/`nextOffset` and finite `extent` progress.
`FragmentState` currently stores only bigint spacer state. The prerequisite
returns opaque source continuations, not native producer extents. No adapter
between these contracts has been implemented or proved. Treating the continuation
as a line index, claiming a fake line-count extent, or mutating a retained cursor
during a query would be incorrect. This is an unfinished integration boundary,
not evidence that the design is impossible or that Paginator must change.

The next bounded assignment must connect real source progress and candidate-local
continuation state, with adoption only after placement, before implementing the
addon's sibling/rectangle policy and declared positive-height composite graph.
No Flow/container rewrite, atomic whole-flow fallback, Row complete-column route,
cursor rewind, zero-height float or special native admission branch was added.

Not implemented/tested: the addon Block façade or participation handle; Flow
property plumbing; left/right sibling float layout; paragraph grouping/termination;
float validation/rejections; initial composite selection through float bottom;
page-defer/full-width continuation; float-once painting; composite descendant
failure-before-any-paint; oversize float behavior. There is no new sibling-float
consumer input or fixture because there is no truthful runnable sibling API yet.

## Actual costs (prerequisite only)

`sibling-vs-before` attributes changes to this prerequisite. The directory name
does not imply the sibling feature exists. `sibling-vs-library` also includes the
inherited composition/rectangle/profile changes; it is not incremental attribution.
Both final metric sets are identical, with all old consumer strings unchanged.

| Existing consumer | Browser min bytes / gzip delta | Node min bytes / gzip delta |
| --- | ---: | ---: |
| Ordinary text | +115 / +23 | +156 / +43 |
| Prepared font | +115 / +24 | +156 / +50 |
| Layout | +163 / +25 | +375 / +119 |
| TextFlow | +2,931 / +930 | +3,970 / +1,246 |
| Rectangle TextFlow | +2,931 / +930 | +3,970 / +1,248 |
| Profile TextFlow | +2,931 / +930 | +3,970 / +1,257 |
| Drawing and JPEG | 0 / 0 | 0 / 0 |

Ordinary text gzip is now 21,043 browser / 39,561 Node, not the before values
21,020 / 39,518. These small shared-owner costs are not portrayed as zero tax.
No runtime speed improvement is claimed; wrapper timing samples are nonpaired
observations only. Ordinary measurement gains an extraction call and the generic
selector class retains its fork method; it does not allocate a continuation owner.

Shared core runtime/pack delta: **zero** (browser JS 153,636; pack 134,653).
Layout shared-output extraction and optional private bridge: emitted ESM/CJS JS
**+2,463/+2,861**, declarations **+1,663** per format, pack **+1,785** compressed /
**+12,434** unpacked. Text generic selection/preparation/capability plumbing:
ESM/CJS JS **+6,926/+7,677**, declarations **+3,952** per format, pack
**+5,087/+34,199**. Addon feature-policy delta: **zero**, since not implemented.
Raw/minified/full inventories are in the reports; pack payload is not installed
dependency closure. No dependency, export map or lock changes were required.

## Validation and handoff

Commands ran sequentially from the worktree above:

| Command | Final outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome and AST principles |
| `npm run typecheck` | PASS, all package builds plus TypeScript |
| `npm test` | PASS, 1,462 tests, zero failures/skips |
| `npm run build:browser` | PASS, 12 builds; nonfatal chunk-size warning |
| `npm run check:graphs` | PASS, 12 inventories |
| `npm run test:consumer` | PASS, 15 external closures and declarations |
| `npm run test:browser` | PASS, 18 tests, zero failures/skips |
| `git diff --check` | PASS |

Focused risk-based coverage is in text/layout `test/inline-selection.test.ts`
(seven tests included in the full suite). It covers rich style/background/source
and visual retention, a real green visual painted once, reduced/full-width source
continuation, repeat/rejected queries, exact uniform output/paint parity, source
paths, handle/lifetime failures, malformed scalar domains, adjacent height fit,
subnormal insufficient height, getter-safe snapshots and cumulative work limits.
It is not the requested multipage float/composite acceptance suite.

Cost/parity/evidence commands:

```sh
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-before --compare artifacts/text-flow/edge-profile-vs-before/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-vs-before --compare artifacts/text-flow/sibling-before/report.json
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-vs-library --compare artifacts/text-flow/library-baseline/report.json
npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/sibling-vs-before/parity.json artifacts/text-flow/edge-profile-vs-before/parity.json
npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/sibling-vs-before/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json
npm exec -- tsx scripts/text-flow-sibling-evidence.ts
```

All pass: 162 strict rectangle/no-exclusion report/diagnostic/work-charge cases,
216 wrapper output/error cases, source preservation, final metric equality and
ordinary optional-graph absence. Inherited profile tests pass unchanged; there
is no fresh pre-edit profile-specific work-charge snapshot in this delivery.

Earlier failures (missing boundary inventory, an implicit-stroke test visual and
initial type annotations) were fixed, not waived. Code-principles self-check:
cohesive files under 400 lines, functions under 50, nesting at most three,
intent-only comments and risk-based tests; automated gates pass. No exception is
requested or approved. This repository does not use Changesets.

`sibling-vs-before/evidence.json` gives the exact final hashes and identifies the
six changed inherited files separately from new files. Auditor should review that
actual unstaged/untracked scope, selector fork isolation, rich output extraction,
ownership and quota failures, and cost attribution. Audit only the prerequisite;
the full sibling-float assignment remains incomplete and requires a fresh bounded
integration assignment after review. No tracker or Git delivery mutation occurred.

## Prerequisite validation auditfix (latest, audit pending)

Issue N/A. Same cwd, branch and base/HEAD as above. Starting state was 20 modified
tracked files and 36 untracked files, all inherited/owned existing work. This fix
changes only `packages/text/src/inline.ts`, `packages/text/src/validate.ts`, this
evidence document, and adds `packages/text/test/inline-validation.test.ts`.
`inline-selection.ts` needs no change: it already captures the original paragraph;
its shared preparation owner now validates that original before normalization.

`validateInput` remains the single validation owner. It validates original shape,
positive finite authored lineHeight, styles and run domains before deriving the
automatic font-containment height. The optional internal auto-height argument
only enables the existing derived normalization after validation. No duplicate
validator/traversal/ledger charge, tolerance, quota increase or callback-before-
validation was added. Valid tiny-positive authored leading can still expand to
font size in automatic modes; fixed mode retains its containment rejection.
Original paragraph and runs, rather than a normalized copy, now reach preflight
and text identity accounting. Numerical classification is exact input domains;
derived fit and native certificates are unchanged.

Four added tests exercise both `prepareInline` and ordinary `measureInline`, with
false, true and `{ strut: "normal" }`: -MIN_VALUE, -1, zero, null, numeric string,
NaN and Infinity authored leading; null/empty paragraph, null runs, null run,
null defaultStyle and invalid default/run font sizes. Each malformed case must
produce identical structured diagnostics at `/bad/paragraphs/0/...` in all three
modes and invoke no visual callback. Valid normal/automatic results retain exact
uniform geometry, including MIN_VALUE authored leading. Automatic preparation
retains cumulative work exhaustion. Existing getter-safe capture, native visual,
ownership and continuation regressions pass unchanged.

### Fresh final costs against the original prerequisite baseline

`artifacts/text-flow/sibling-prereq-fixed-vs-before/report.json` compares the fixed
delivery to **original** `sibling-before/report.json`, not to the defective
prerequisite. All 222 metrics are paired; tooling, flags, lock and consumer inputs
are unchanged. The earlier cost table remains a historical snapshot only.

| Existing consumer | Browser min bytes / gzip delta | Node min bytes / gzip delta |
| --- | ---: | ---: |
| Ordinary text | +124 / +26 | +165 / +48 |
| Prepared font | +124 / +27 | +165 / +55 |
| Layout | +172 / +33 | +384 / +124 |
| TextFlow | +2,940 / +938 | +3,979 / +1,250 |
| Rectangle TextFlow | +2,940 / +937 | +3,979 / +1,252 |
| Profile TextFlow | +2,940 / +938 | +3,979 / +1,261 |
| Drawing and JPEG | 0 / 0 | 0 / 0 |

Ordinary text gzip: baseline 21,020 / 39,518; final **21,046 / 39,566** browser /
Node. Relative to the defective prerequisite, the fix itself adds 9 minified bytes
on each platform, 3 / 5 gzip bytes. No zero-tax or runtime-speed claim is made.
Core runtime/declarations/pack and all packages except text/layout remain exactly
unchanged against the original baseline. Layout costs remain as above. Final text
ESM/CJS JS delta is +7,056/+7,807, declarations +3,974 per format, pack
+5,205 compressed / +34,575 unpacked. No optional inline-selection module enters
ordinary retained consumers. Addon sibling policy still has zero implementation.

### Commands, preservation and re-audit handoff

All commands ran serially in the worktree above:

```sh
npm exec -- biome format --write packages/text/test/inline-validation.test.ts
npm run build -w @updf/text
npm exec -- tsx --test packages/text/test/inline-validation.test.ts packages/text/test/inline-selection.test.ts packages/text/test/line-height.test.ts packages/layout/test/inline-selection.test.ts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build:browser
npm run check:graphs
npm run test:consumer
npm run test:browser
git diff --check
npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/sibling-prereq-fixed-vs-before --compare artifacts/text-flow/sibling-before/report.json
npm exec -- tsx scripts/text-flow-profile-parity.ts artifacts/text-flow/sibling-prereq-fixed-vs-before/parity.json artifacts/text-flow/edge-profile-vs-before/parity.json
npm exec -- tsx scripts/text-wrap-parity.ts artifacts/text-flow/sibling-prereq-fixed-vs-before/wrap-parity.json artifacts/text-flow/wrap-exclusion-optimized-final.json
node /tmp/opencode/sibling-prereq-evidence.mjs
```

PASS: 20 focused tests; format; lint including AST principles; all package builds
and typecheck; **1,466 full tests**, zero failures/skips; 12 browser builds and
graph inventories; 15 external consumer closures; **18 browser tests**, zero
failures/skips; diff whitespace; cost comparison; 162 composition and 216 wrapper
strict parity cases. One combined gate command exceeded the tool's 120-second
deadline during browser tests (10 passed, 7 cancelled); the standalone complete
browser rerun passed. Build chunk-size warning remains nonfatal, not waived error.

The temporary evidence collector writes only the new artifact directory. Its
`evidence.json` records all final source hashes, four fix-path sizes/fingerprints,
prior-to-final source differences, full Git status, and SHA-256 inventories of
**every file** in `sibling-before`, `sibling-vs-before` and `sibling-vs-library`.
Those older artifacts were never overwritten. Historical report/evidence hashes
still match the frozen manifest. Every inherited source hash in the previous
prerequisite evidence matches except the three intentionally changed files above;
the only new source path is the regression test. Final cost report SHA-256:
`fd5cf4b59a977263c8b1761e4464f8fdc60429edeb7da1bbbb36263436f77c0f`.

Code-principles self-check: correctness/domain and callback regressions pass;
cohesive files under 400 lines, functions under 50, nesting at most three;
intent-only comments; proportional risk-based tests; lint/tests pass. No approved
or requested exception; no Changeset (repository does not use Changesets).
No staged changes, commits, push, PR, tracker mutation or delegation. Final source
scope is 21 modified tracked / 37 untracked, retaining all inherited work.

**Status: implemented, not verified; audit pending.** Remaining acceptance for this
auditfix: none. Auditor should independently check original validation ordering,
structured origin diagnostics/no callbacks, legitimate automatic leading and
cumulative limits, plus final costs/hashes and inherited-work preservation.
Architect future source-progress/next-state integration is outside this slice;
no source-progress state or sibling integration was added. Stop here for re-audit.
