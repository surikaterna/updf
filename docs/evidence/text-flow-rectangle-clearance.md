# S4 — certified rectangle clearance

Issue: N/A. Objective: fix backwards-ink overlap for omitted and explicit `rect`
floating siblings without changing public authoring APIs or mandatory layout policy.
S0 independent approval was supplied by Builder (Auditor session
`ses_e983b9c1affe1Ag13PMxLVaL30`: “Verified — approve overall S0”). Historical S0
wording and its recovery archives/manifests remain unchanged chronology.

## Delivery and ownership

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/HEAD:
  `882d6d38f432edcac97e962fbf446062c1483c3d`.
- Entry: 145 inherited dirty paths, 41 tracked unstaged and 104 untracked; no staged
  changes. Those changes are not this slice's implementation.
- Runtime ownership: `packages/text-flow/src/{sibling,sibling-selection,path-selection}.ts`.
  Focused tests: new `rectangle-clearance.test.ts` and the artifact destination in
  `path-fix.test.ts`. Evidence ownership: new rectangle driver, this document and
  ignored `artifacts/text-flow/rectangle-clearance-{before,vs-before,vs-library}/`.
- No Git stage/commit/push/PR, tracker mutation, delegation, discard, app build or
  preview restart. No core, text, fonts, layout, layout-boxes or Paginator edits.
  No changeset: this unpublished repository does not use Changesets.

## Implementation and numerical contracts

Initial rectangle selection now uses the existing path-selection owner, with an
absent contour representing the authored rectangle. The old nominal-height-only
rectangle prefix loop is removed; full-width continuation still uses the existing
kernel range selector. There is no second wrapper, line-breaking or painting engine.

The optional inline-band certificate covers every remaining subset of the current
paragraph. Before handing off to a full-width tail, the same clearance guard queries
**all later paragraph sources** too: a later larger font may project backwards
farther than the first tail paragraph. Every resume/band/probe goes through existing
charged operations; repeated scans are bounded by the cumulative composition ledger,
not uncharged quadratic work. No quota is refunded or reset on failed lookahead.

Rectangle band contact permits `top >= bottom`; path edge queries preserve their
existing strict `top > bottom` behavior. These are exact comparisons of the owned,
outward certified native envelope, not approximate occupancy fits. Rectangle side
width remains the original exact subtraction; path interval predecessor rounding is
unchanged. A blocked rectangle retry visits the real float bottom before advancing
through any remaining backwards-ink gap. This preserves ordinary-leading placement
instead of rounding it up to the next nominal line top. No EPS, scalar-domain,
leading, clipping, cache identity, native certificate or quota changes were made.

The initial fragment's actual height includes clearance gaps. Its positive visual
is retained once, even with no selectable side text. Existing `frameFits` and native
Paginator admission can defer that intact candidate; failed selection does not
write the source checkpoint. The tail remains splittable, not a huge atomic block.
Existing whole-graph preparation and paragraph provenance/reporting owners remain.

## Fresh frozen evidence

Before runtime editing:

```sh
npx tsx scripts/text-flow-rectangle-evidence.ts freeze
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/rectangle-clearance-before/costs --compare artifacts/text-flow/migration-baseline/current/report.json
```

`before/protected.json` freezes tracked/nonignored sources, all existing text-flow
history (including the sealed S0 archive), and showcase
source/dist. It records an explicit scoped allowlist plus Git state. The three
pre-edit selector/producer files are saved alongside it. The cost runner reproduced
**238/238 S0 metrics with zero deltas**, same lock, before runtime editing. S0's
original driver verification is deliberately not rerun against changed runtime.

`freeze`/`capture` reserve PDF, bundle, raster and report files with exclusive writes.
Do not rerun capture over existing outputs. The existing path raster test now writes
under the fresh S4 `path-regression/` directory, never the frozen historical directory.
`verify` is read-only: checks protected hashes and rejects unexpected new source
paths outside the allowlist. `seal` captures delivery hashes and preview HTTP
observations; it does not replace any historical manifest.

```sh
npx tsx scripts/text-flow-rectangle-evidence.ts capture
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/rectangle-clearance-vs-before --compare artifacts/text-flow/rectangle-clearance-before/costs/report.json
npx tsx scripts/text-flow-rectangle-evidence.ts summary
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/rectangle-clearance-vs-library --compare artifacts/text-flow/library-baseline/report.json
npx tsx scripts/text-flow-rectangle-evidence.ts verify
```

### Native output

Fresh before omitted/explicit rectangles, each side: **75 exact red interior
pixels**. Fresh after: **0**. Rectangle-path controls: **0 before and after**.
Independent color guards require both visible red glyphs and blue float pixels;
they inspect actual 144-dpi native PDF rasters, not line reports. All 24 before/after
PDFs pass `qpdf --check` and complete `pdftotext -raw` extraction of `A`.
All six ordinary-leading before/after PDF hashes match exactly. The corrected tight
rectangle PDF/raster also matches the already-correct rectangle-path control.

The new regression matrix checks both sides × omitted/rect/rectangle path with
tight first paragraphs and later font-size-60 paragraphs. It asserts actual native
raster non-overlap, complete `AAAA` extraction and prepared source/ink reports.
Other additions cover empty/whitespace/break sources, a selected side prefix then
a blocked word, fresh-page oversize clearance, intact page deferral, unchanged
checkpoint on rejected candidates and cumulative rejected-fork kernel exhaustion
with the existing poisoned/closed lifecycle. Existing sibling/path tests cover
atomic inline blockage, backgrounds-before-glyphs, exactly-once late visual paint,
invalid descendant rejection before earlier paint, source offsets/keys, and ordinary
no-flow behavior. No protected owner was rewritten to obtain those outcomes.

### Costs and isolation

All **238 paired metrics**, 40 consumers and package inventories are in the reports.
All non-addon package emitted/packed costs are unchanged, including core, text,
fonts, layout and layout-boxes. Ordinary consumers have zero byte/gzip deltas.
**All consumer module lists are identical** to fresh before; existing graph guards
also pass. Representative sibling and path PDF bytes/results match before exactly.
Path charge traces match exactly; rectangle charge traces intentionally differ due
to certified band probes, per-line candidate selection and all-later-source checks.
`summary.json` records both full traces, not a claim of zero execution cost.

| Measured output | Before | After | Delta (bytes) |
| --- | ---: | ---: | ---: |
| Addon packed payload | 24,311 | 23,776 | -535 |
| Addon unpacked payload | 117,608 | 112,801 | -4,807 |
| Addon browser ESM JS | 26,219 | 24,879 | -1,340 |
| Addon CJS JS | 28,329 | 26,926 | -1,403 |
| Sibling browser min / gzip | 248,053 / 81,176 | 247,390 / 81,011 | -663 / -165 |
| Sibling Node min / gzip | 374,513 / 115,682 | 373,782 / 115,444 | -731 / -238 |
| Path browser min / gzip | 248,072 / 81,200 | 247,409 / 81,035 | -663 / -165 |

These are real retained-output reductions from removing the duplicate prefix loop,
not newly invented zero-cost profiles. The separate pre-feature library comparison
is historical, not same-lock; missing baseline profiles are not zero. Package payload
is not installed dependency closure. No new latency/memory/URL/decode claims.

## Validation and audit boundary

All commands below run in the delivery worktree. Logs are under `vs-before/`;
`*-final.log` supersedes early failed new-test iterations. Runtime build scripts
were inspected: root build targets packages/examples, not showcase. Browser builds
target browser fixture apps, not the live showcase dist.

The separate recovery supplement remains at
`artifacts/migration-recovery-s0/{manifest.json,recovery.tar.gz}`; it is outside the
pre-edit text-flow artifact inventory, as its own boundary declaration states.
Its manifest SHA-256 (external to that manifest) is
`5844eee1185c80686c062443ddacf13fd3868052cf2b59848bbf64642a661d78`;
archive SHA-256 is
`8f63c6ac620f3099a11a8e3ffeca6e63c428810e32112714f819ac6370fa6347`.
The S4 read-only check now explicitly asserts these reference hashes too. The
sealed S0 manifest remains
`9614123dad0b6b83c42546c72f80320746b68cf079b22e51295470dfcaf63571`.
No archive, historical document or manifest was modified.

| Command | Result |
| --- | --- |
| `npx tsx --test --test-concurrency=1 packages/text-flow/test/rectangle-clearance.test.ts packages/text-flow/test/sibling*.test.ts packages/text-flow/test/path*.test.ts packages/text-flow/test/side-path.test.ts` | PASS, 76 tests |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome and AST code-principles |
| `npm run typecheck` | PASS, includes full runtime build |
| `npm test` | PASS, 1,570 tests |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | PASS |
| `npm run test:consumer` | PASS, 15 clean external tarball closures |
| `npx tsx --test --test-concurrency=1 tests/browser/text-flow-path.test.ts tests/browser/text-flow-siblings.test.ts` | PASS, 2 Chromium/Node PDF/result parity tests |
| `npx tsx scripts/text-flow-paginator-proof.ts` | PASS, only inherited provenance reporting differs from HEAD |
| `npx biome lint --diagnostic-level=error packages/text-flow/src/path-selection.ts packages/text-flow/src/sibling-selection.ts packages/text-flow/src/sibling.ts packages/text-flow/test/path-fix.test.ts packages/text-flow/test/rectangle-clearance.test.ts scripts/text-flow-rectangle-evidence.ts` | PASS |
| `git diff --check` | PASS |
| `npx tsx scripts/text-flow-rectangle-evidence.ts verify` | PASS, protected sources/history/preview hashes unchanged |

An extra `biome check` invocation reported unsorted imports (including inherited
imports). This is the optional organize-imports assist, not the repository lint or
format gate. No broad import churn or rule waiver was applied; scoped lint passes.
Initial new tests were corrected for the host's `usedHeight`/`freshHeight` admission
contract, a required `children` field, and kernel poisoning after quota exhaustion.
No production policy was altered to make tests pass.

Code-principles checklist: correctness validated; cohesive files under 400 lines;
functions under 50 lines and nesting at most three; comments explain invariants;
risk-based numerical/native/protocol tests added; lint/typecheck/tests pass.
No approved principle exceptions. Independent audit remains required.

Status: **implemented, ready for independent audit; not verified**. Acceptance is
complete for S4 rectangle correctness only. Auditor should inspect the actual
allowlisted delivery hashes/diffs, later-source certificates and gap admission,
cumulative charge evidence, native raster guards, normal/path byte parity and
protected-history/preview preservation. S1/S2/S3 and all later migrations are not
part of this assignment.
