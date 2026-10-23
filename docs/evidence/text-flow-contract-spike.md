# Text-flow Slice 1: existing-owner contract spike and cost baseline

Historical spike record; preserved baseline and oracle semantics. The separately
assigned rectangular runtime follow-on is documented in
[runtime evidence](text-flow-runtime.md). Provisional signatures below are not the
new runtime API; no interval callback or contour negotiation was implemented.

**Contract spike only; no runtime feature. Implemented, pending independent audit.**
Issue: N/A. Integration owner: Engineer. Worktree:
`/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`; base and HEAD both
`244c0932c733accace68b7d8fb85cdc8f851d4e8`.

## Delivered scope and oracle limits

New files only: `packages/text/test/composition-parity.test.ts`,
`packages/layout/test/composition-contract.test.ts`,
`tests/fixtures/text-flow/rectangular.ts`, `scripts/text-flow-costs.ts`,
`scripts/text-flow-cost-inputs.ts`, and this note. No source, manifest, runtime
export, addon, bridge, contour solver, admission owner or compatibility API changed.
Existing dirty `docs/agents/README.md` and untracked
`docs/architecture/text-flow.md` were not edited. No stage/commit/push/tracker
mutations. All six delivery files remain untracked; generated reports are ignored.

The rectangular suite is an **existing-owner oracle**, not NEW composer parity.
It captures Helvetica and supported prepared Liberation Sans behavior: empty and
hard-break lines, preserve/collapse whitespace, code-point splitting/error policy,
mixed size/color runs, run-local source ranges, finite coordinates/baselines,
ink containment, a synthetic prepared-font overhang boundary, native rendering
repeatability, PDF text extraction and an exact Helvetica baseline/PDF matrix.
It is not raster equivalence, shaping, bidi, or a multi-interval proof.

Real layout operations exercise adapter contexts after success, failure and during
a subsequent operation, deterministic repeated measurement, cumulative explicitly
charged source work across queries/occurrences, original diagnostic attribution,
identical atomic retry requests, fresh-page admission and oversize rejection.
These use the existing measurement owner and native rich-text nodes, not fake
operation objects. No exposed new-composer handle exists: **composer cross-operation
ownership remains unproven**. Public reports cannot authorize opaque native runs.

## Provisional typed contract — not an available API

Decision: an eventual optional `@updf/text/composition` subpath owns text semantics;
an eventual `@updf/text-flow` owns exclusion-band geometry and the TSX adapter.
Core/layout must not import text-flow. Select the narrow optional capability
explicitly at text-service construction; core's existing operation must capture,
validate and guard it. Current service capture enumerates seven callbacks and
cannot transport arbitrary sessions. Do not attach an extra service method, use
a registry, carry a font runtime in adapter props or create an independent ledger.
This slice deliberately does not implement that bridge.

Illustrative contract vocabulary (not exports, and not a finalized ABI):

```ts
type Interval = Readonly<{ left: number; right: number }>;
type OccupiedBand = Readonly<{
  top: number;
  bottom: number;
  baseline: number;
}>;
type CompositionRequest = Readonly<{
  text: import("@updf/text").RichTextInput;
  maxHeight: number;
  // Synchronous and invocation-only; the operation charges every negotiation.
  freeIntervals: (occupied: OccupiedBand) => readonly Interval[];
}>;
declare const operationOwned: unique symbol;
type ComposedFrame = Readonly<{
  [operationOwned]: true;
  width: number;
  height: number;
}>;
type OptionalComposition = Readonly<{
  compose: (request: CompositionRequest) => ComposedFrame;
}>;
```

Prefer one synchronous data call with invocation-only, budgeted band negotiation,
not a retained cursor. Internal provisional metric/interval negotiation may need
to retry: fixed numeric lineHeight alone cannot establish the whole occupied band.
Metrics must include actual selected fonts, baseline envelopes, overhangs, ink and
native paint boxes. A changed interval can change selected runs and their metrics;
termination, monotonic conservatism and cumulative retry costs need proof before
this signature is accepted. Callbacks cannot mutate inputs, return thenables,
retain a usable operation context, reset budgets or supply trusted source paths.

Missing proofs for the next separately assigned runtime slice:

- Exact optional capability capture and callback receiver semantics, domain/output
  validation and operation resource/path bindings without a parallel owner.
- Success/failure cleanup, invocation-only negotiation, cumulative quotas and
  cross-operation rejection for opaque native run/frame ownership, not just reports.
- Full-width new composer comparison against this oracle, including native ink,
  source ranges, baselines, extraction and selected-graph preparation/admission.
- Bounded whole-band negotiation and multi-interval token/source-order semantics;
  authored width/cache identity stays exact. No numerical policy changed here.
- Polygon validity, clearance, boundary contact, tiny intervals and intersection
  arithmetic remain separate geometry decisions. No tolerance/certificate changes.

### Honest, CSS-familiar TSX direction (conceptual only)

Reuse the existing Paragraph/Span style vocabulary rather than adding a second
font/whitespace policy grammar. An eventual compound adapter might read explicit
roles, for example this **non-executable sketch**, not an import/install recipe:

```tsx
<TextFlow style={{ width: 240 }}>
  <TextFlow.Text>
    <Paragraph style={{ font: "Body", fontSize: 10, lineHeight: 14 }}>
      Ordinary text with <Span style={{ color: [1, 0, 0] }}>emphasis</Span>.
    </Paragraph>
  </TextFlow.Text>
  <TextFlow.Exclusion shape={reservedRegion} localToFrame={placement} />
  <TextFlow.Visual content={preparedVisual} localToFrame={placement} />
</TextFlow>
```

Role names and props are provisional. Exclusion geometry is independent of PNG,
JPEG, SVG or no visual; resource preparation/providers remain application choices.
Text is initially simple LTR, left-aligned and fixed numeric line-height; unsupported
modes must reject. This is one local atomic block, not browser sibling flow:
no misleading `float` prop, CSS shape-outside promise, sibling displacement or
pagination guarantee. Numeric point styles are CSS-familiar, not browser CSS.

## Reproducible cost harness

Run from this worktree, serially (builds clean emitted package directories):

```sh
npx tsx scripts/text-flow-costs.ts --root /home/sprawl/projects/updf/trees/text-flow-design --out artifacts/text-flow/library-baseline
npx tsx --test packages/text/test/composition-parity.test.ts packages/layout/test/composition-contract.test.ts
npx tsx scripts/text-flow-costs.ts --root /home/sprawl/projects/updf/trees/text-flow-design --out artifacts/text-flow/library-current --compare artifacts/text-flow/library-baseline/report.json
```

`--root PATH` defaults to cwd; `--out PATH` is required; `--compare PATH` optionally
reads a prior report. Out/compare paths resolve against invocation cwd. Each side
runs existing `npm run build`, inventories actual dist files by browser ESM, Node
facade and CJS (JS/declarations separately), and packs **all 14 exported library
workspaces under packages/** with
`npm pack --ignore-scripts --json --pack-destination OUT`. Apps (including the
exported CMR example) and non-exported legacy are listed separately, not library
totals. Private flags are recorded: these are unpublished libraries, not a release.

Each side bundles five emitted-export consumers (drawing, ordinary text, layout,
prepared font, JPEG) for browser and Node in genuinely unminified and minified ESM.
Each of the 20 outputs has fixed level-9, zero-mtime Node gzip measurements and an
esbuild metafile. No source aliases are used; browser conditions and drawing
isolation are asserted. Report includes input source, revision/dirty inventory,
lock SHA-256, Node/npm/TypeScript/esbuild versions and flags. No new dependency.
Node ESM facades retain CJS implementation costs; those are not browser costs.

Authoritative reports: `artifacts/text-flow/library-{baseline,current}/report.json`.
Earlier `baseline/` and `current/` captures included the exported CMR app and are
superseded, not the library baseline. Both authoritative captures have identical
production sources. All **188** paired metrics have delta **0**, percent **0%**.
Formula: delta = current − base; percent = 100 × delta / base. An absent baseline
is a new absolute-cost row, delta/percent N/A (also percent N/A for a zero base).
There is **no new runtime package yet**, so no invented addon cost or percentage.

| Library aggregate (bytes) | Baseline | Current | Delta | Percent |
| --- | ---: | ---: | ---: | ---: |
| npm tarball payloads (sum) | 625,017 | 625,017 | 0 | 0% |
| npm unpacked payloads (sum) | 3,424,231 | 3,424,231 | 0 | 0% |
| Browser ESM JS | 734,988 | 734,988 | 0 | 0% |
| Browser declarations | 291,060 | 291,060 | 0 | 0% |
| Node facade JS | 12,082 | 12,082 | 0 | 0% |
| Node facade declarations | 2,720 | 2,720 | 0 | 0% |
| CJS JS | 847,163 | 847,163 | 0 | 0% |
| CJS declarations | 291,060 | 291,060 | 0 | 0% |

| Retained consumer | Browser raw / min / min gzip bytes | Node raw / min / min gzip bytes | All deltas |
| --- | ---: | ---: | ---: |
| Drawing | 67,336 / 35,701 / 12,326 | 115,994 / 55,295 / 17,884 | 0 (0%) |
| Ordinary text | 112,451 / 58,251 / 20,062 | 247,859 / 118,580 / 37,094 | 0 (0%) |
| Layout | 348,257 / 176,803 / 57,121 | 622,806 / 297,535 / 90,466 | 0 (0%) |
| Prepared font | 119,035 / 62,526 / 21,370 | 247,849 / 118,615 / 37,116 | 0 (0%) |
| JPEG | 79,525 / 42,258 / 14,799 | 136,850 / 65,797 / 21,231 | 0 (0%) |

Tarball/unpacked figures are **package payload, not installed dependency closure**.
Installed dependency footprint is unavailable; workspace symlinks are not counted
as installations. Prepared font/image bytes supplied by callers are not retained
consumer code. Runtime latency/feature cost is not established by these sizes.
Historical `scripts/sizes.ts` minifies its “raw” and packs selected packages only;
its historical reports are unsuitable for this baseline.

## Validation and handoff

Environment: Node v24.22.0, npm 11.19.1, TypeScript 5.9.3, esbuild 0.28.2.
Lock SHA-256: `3c04c00b757259552db74da30a6d28bc09fbf8c4d0a7d41d3feaf86358e24cba`.
Worktree-local `npm ci --ignore-scripts` passed, without lock changes.

- Focused test command above: passes, 7 tests, zero failures/skips.
- `npm run format:check`, `npm run lint` (including code-principles): pass.
- `npx tsc --noEmit` and `npm run typecheck`: pass.
- `npm run build:browser`, then `npm run check:graphs`: pass, all 12 graphs.
- `npm run test:consumer`: pass, 14 external tarball closures.
- `npm test`: serial rerun passes, 1,387 tests, zero failures/skips.
- Both authoritative harness commands: pass, no nonzero deltas.

Initial full-test attempt was invalidated by running alongside typecheck's clean
build (missing emitted modules); initial graph attempt lacked browser artifacts.
Logs retained as `artifacts/text-flow/test.log` and `graphs.log`. Serial successful
logs: `test-final.log`, `typecheck.log`, `browser-build.log`, `graphs-final.log`,
`consumer.log`. No source fix or gate waiver was used for those setup failures.

Code-principles self-check: correctness scoped to existing owners; cohesive files
under 400 lines, functions under 50, nesting at most three; comments explain
invariants/intent. Risk-based boundary/regression tests added; no numerical runtime
change, Changeset or approved exception. No feature/verification claim.
Auditor should inspect actual untracked delivery files, rerun sufficient gates,
check report arithmetic/export resolution and independently challenge the contract
limits. Stop here; transport/composer implementation requires a fresh assignment.
