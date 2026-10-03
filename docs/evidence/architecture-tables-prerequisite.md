# Slice F — partial prerequisite, not completed tables delivery

Date: 2026-10-03. Integration owner: Engineer; no nested delegation.
Worktree/cwd: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
Branch: `feature/measured-flow-tables`. Base and HEAD:
`ac60f80675a2042f2f6043bae51b541b85e7251f`.
A–E are independently verified per the caller. **F is incomplete, not implemented
or verified as a slice.** G must not start on the strength of these passing checks.
Tracker N/A; no tracker, staging, commit, push, PR, merge, Pages activation or
deployment/settings mutation. All delivery remains uncommitted.

## Actual implemented prerequisite

Public block adapters previously exposed only operation-bound text measurement.
Standalone `measure()` creates another operation and returns no native nodes, so
it cannot correctly implement composable cells with the shared resource/policy
lifetime. Importing layout's private compiler from a new tables package would
violate the approved graph. The bounded prerequisite adds:

```ts
// Inside defineBlockAdapter({ measure(props, context) { ... } })
const measured = context.measureContent(content, { width: context.width });
// measured: MeasuredContent = { size: { width, height }, nodes }
```

`content` is readonly `BlockContent`; constraints have required positive finite
width and optional nonnegative height. Width cannot exceed the adapter's region;
height is an overflow constraint, not pagination. The readonly deeply frozen native
snapshot can be composed by an adapter's fragment callback without exposing
serializer plans, resolved fonts, operation state or private brands.

This uses the **owning** operation's resources, installed extension identities,
normalizer, paragraph/inline engine, generic compiler and natural painting path.
It creates no pages or independent resource/policy lifetime. Captured methods close
on success and failure. Page controls reject. Generated measurement trials use
the existing candidate-local output budget; emitted occurrences are charged by
the selected owner fragment and final document validation. No numeric certificate,
32-local-ULP rule, text wrapping or paginator dispatch was changed.

The existing public `measure()` now calls an extracted `paintNatural` helper with
the same algorithm and diagnostics. This avoids a second painting implementation.
The source graph inventory adds **only two exact layout helper paths**, not new
table/private seam permission, wildcard exports or blanket exemptions.

## Remaining F scope — explicitly not delivered

- New private MIT `@updf/tables` package, exact dependency versions, explicit ESM
  exports/declarations, workspace/build/CI ordering and seventh packed closure.
- Public ordinary-core-component `Table.Head/Body/Foot/Row/Cell/HeaderCell`, owned
  readonly data constructors and the public semantic-adapter component bridge.
- Same-operation cell normalization preserving nearest captured provider scopes
  and owned content/adapter identities through props; source row/cell paths and
  metadata/metrics. This prerequisite does not establish that bridge or transport.
- Coordinated explicit column widths, atomic row producer, head/foot decoration
  reservations, empty-table/foot-only behavior, strict unsupported-field/role
  diagnostics, style inheritance, shared grid edges and constrained cell clipping.
- Table-specific whole-document/late/repeated-source resource and quota evidence,
  alias/cache tests, final fragment-context callbacks and header/body preflight.
- Actual `tables.tsx` inventory showcase with multiparagraph/chart/SVG cells,
  separately optional SVG chunk and requested controls/source/download metrics.
- New converted fixture extraction, row multiplicity/order, geometry/raster grid
  negative controls, native SVG reference, Node/Chromium parity and graph proofs.

Existing `@updf/layout/tables`, `/tables/vdom`, `layoutTable`/`layoutTableFlow` and
their implementations/tests/showcase remain **legacy transitional**, unchanged,
not permanent APIs. G is responsible for the explicitly audited migration/removal;
this partial prerequisite does not claim the F migration has occurred. No Image,
#33, row split/span/nested-table support, global registry or new JSX runtime.

## Validation at the delivered partial scope

All commands ran in the exact worktree above, with unchanged HEAD:

| Command | Outcome |
| --- | --- |
| `node --experimental-strip-types scripts/record-slice-f.ts` | Captured pre-F hashes before implementation; only recorder existed as F source |
| `npm ci --ignore-scripts` | Pass; 485 packages installed, historical dependency deprecation warnings |
| `npm run format:check` | Pass; 380 files |
| `npm run lint` | Pass; Biome 383 files and production file/function/nesting ESLint rules |
| `npm run typecheck` | Pass; complete root build and `tsc --noEmit` |
| `npm test` | Pass; 318 tests, no skips, including existing C/D/E/numeric/CMR/qpdf/extraction/raster controls |
| `npm run test:consumer` | Pass; existing six actual tarball closures, NodeNext/Bundler ambient-free declarations and runtime |
| `npm run check:licenses` | Pass; actual six tarballs retain complete 2026 Surikat AB MIT; third-party notices unchanged |
| `npm run build:showcase && npm run test:showcase` | Pass; actual production site build and 19 tests |
| `npm run build:browser` | Pass; 11 existing builds; historical >500 kB optional Fontkit warning |
| `npm run test:browser` | Pass; nine tests including native SVG reference, no threshold changes |
| `npm run check:graphs && npm run sizes` | Pass after exact helper inventory update; 11 graphs; core bundle 49,793 bytes, gzip 15,107; fixed PDF 5,779 bytes |
| `npm run test:legacy` | Known failure; raw harness stops at container `toString` TypeError, 0 passing/1 failing |
| `npm run test:legacy:comparison` | Equivalent historical baseline; isolated full harness 18 passing/1 pending/6 failing; not a passing raw gate |
| `npm audit --omit=dev` | Pass; zero production vulnerabilities |
| `npm audit` | Known failure; 45 vulnerabilities, 8 moderate/10 high/27 critical; no dependency fixes or waivers |
| `npx tsx scripts/report-slice-f.ts` | Preservation/delivery delta, including all 133 inherited protected paths; no stages/commits or baseline deletions |

Initial development checks had two corrected failures: layout build caught
untyped new context parameters (fixed with contextual `MeasureContext` typing),
and a new test read `placement.height` instead of `placement.box.height` (corrected
before root typechecking). Graph validation initially caught missing exact helper
inventory entries. Final passing gates supersede those failures, not legacy/audit
failures. No evidence threshold or test skip was added.

Seven new risk-based public API tests cover shared stacked paragraph measurement,
nested installed chart identities, prepared operation fonts, closure on both paths,
descriptor-safe constraints, cumulative selected output text quotas and rejection
of internal page creation. The external content consumer adds readonly/type-error
checks and actual runtime PDF generation through the new method.

## Code-principles and handoff

Bounded diff self-check: cohesive production files under 400 lines; functions under
50 lines and nesting at most three (production ESLint passes); no `any`, unsafe
brand injection or private API export; comments explain measurement-budget intent;
tests proportional to the new generic public capability. **No approved exceptions.**
Modern format/lint/type/tests pass; known legacy and full-audit failures remain
explicit, not waived. No Changesets infrastructure or package release is introduced.

`architecture-tables-baseline.json` captures the actual inherited delivery, rather
than using Git diff alone as the F boundary. `architecture-tables-delta.json` lists
every new/changed SHA-256 and all cumulative tracked/untracked paths. Check with
`git status --short`, `git diff --cached --name-only`,
`git diff ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD --name-only`, and the report.
Historical docs/evidence, licenses/assets/Fontello OFL, numerical kernel and CMR
sources are protected against the pre-F baseline; no old evidence is rewritten.
Final report: 60 cumulative modified tracked paths and 214 cumulative untracked
files (Git's short status groups untracked directories). Zero committed/staged
paths. The F delta has six changed inherited files, a formatting change to its own
pre-capture recorder, and seven added files including the excluded self-referential
delta report. All 158 protected pre-F paths and the 133 inherited protected paths
pass SHA-256 equality checks; no baseline file was deleted.

Auditor may independently review this **bounded prerequisite** and especially
operation-bound resource/quota behavior and parity of the extracted natural paint
path. Engineer must then finish the remaining F package/bridge/table/showcase/tests
before marking **Slice F implemented** for its own independent audit. This is a
partial integration state, not an authorization to move to G or release anything.
