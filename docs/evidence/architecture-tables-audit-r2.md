# Slice F bounded R2 remediation — F-AUD01 and F-AUD04

**Implemented, ready for independent audit; not verified. Tracker N/A. No G work.**

Worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
Branch: `feature/measured-flow-tables`. Base and HEAD:
`ac60f80675a2042f2f6043bae51b541b85e7251f`.
Engineer owns this bounded integration; all inherited cumulative changes preserved.
No staging, commits, push, tracker mutation, nested delegation or delivery action.

## Actual R2 delta

Compared by SHA-256 with the existing, never overwritten
`architecture-tables-audit-r2-baseline.json`, changed inherited files are:

- `packages/layout/src/blocks.ts`: fixed validation sees geometry only; final fixed
  painting instantiates and snapshots privately owned emission nodes.
- `packages/layout/src/decorated-producer.ts`: static region painting carries the
  current operation origin into occurrence instantiation.
- `packages/layout/src/deferred-decoration.ts`: static decoration plans instantiate
  occurrence-owned recipes with the cached adapter's source mapping.
- `packages/layout/src/emission-nodes.ts`: retained recipe origins compose with the
  current occurrence origin, rather than being replaced.
- `scripts/record-slice-f-audit-r2.ts`: surviving recorder formatting only.

Added paths are the existing R2 baseline JSON, this evidence Markdown,
`packages/layout/test/fixed-emission-transport.test.ts`, and
`packages/tables/test/mixed-section-emissions.test.ts`. No baseline files removed.
The production fixes and initial tests survived the cancelled assignment; this
restart inspected them and strengthened the mixed-section and nested-origin tests.
All R2 paths are untracked relative to Git HEAD; cumulative tracked modifications
belong to the inherited delivery, not this restart. Nothing is staged or committed.

## Acceptance and regressions

F-AUD01: static head and static foot cells each contain nested Block Header/body/
Footer. With and without an explicit-height opposite section, `layoutFlow`, data
Document layout and ordinary core lowering all invoke both callbacks exactly once
per operation and produce the authored text in order. Actual PDFs pass `qpdf
--check` and `pdftotext -raw`; JSX section mixing also extracts the nested header.
Generic fixed transport retains ownership without table-specific branches, public
trust setters or rejecting valid arbitrary-block cells. Exact text quota six
passes/five fails; malformed getter data still fails without invoking the getter.
Existing deferred-cell clipping, page-limit and capability negative controls pass.

F-AUD04: repeated identical tables with static head or foot fail only on callback
two, identify `/body/1/props/{head,foot}/rows/0/cells/0/`, and retain CHARACTER span
`{start: 0, end: 1}`. Nested Flow/provider cases for both sections identify
`/document/children/1/provider/body/0/props/{head,foot}/rows/0/cells/0/` and observe
the correct `OK`, then `Ж` provider values. Semantic measurement caching remains;
existing cache-reuse and independent fragment-owner regressions pass unchanged.

## Checks in this restart

All commands ran in the worktree above at unchanged HEAD.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass; includes fresh full root build and strict root typecheck |
| `npx tsx --test packages/tables/test/*.test.ts packages/layout/test/fixed-emission-transport.test.ts packages/layout/test/decorations.test.ts packages/layout/test/table-boundaries.test.ts tests/integration/composable-tables.test.ts tests/integration/mixed-regions.test.ts` | 51 passed, including qpdf/Poppler and unchanged 63-edge raster oracle |
| `npm test` | 359 passed, zero failures/skips, approximately three seconds |
| `npm run format:check` | Final pass, 413 files |
| `npm run lint` | Final pass, Biome 416 files and ESLint code-principles rules |
| `npx tsc --noEmit` | Final pass after test strengthening |
| `npx tsx --test packages/tables/test/mixed-section-emissions.test.ts packages/layout/test/fixed-emission-transport.test.ts` | Final seven R2 tests pass after final assertion edit |
| `git diff --check` | Pass |

The first lint run caught fourth-level nesting in the strengthened test; the
conditional assertion was replaced with an unconditional equality assertion.
Final lint and focused tests pass; no exemption was added. The full 359-test run
preceded only this final assertion refactor; the affected seven tests were rerun.

A read-only Node SHA-256 comparison against R2 verified 226 protected paths
(core, legacy, fixed CMR example, font fixtures, historical evidence and numerical
axis/kernel files), with no removals. Fixed CMR SHA-256 remains
`8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
Historical baseline/delta evidence was not regenerated.

Prior independent full-gate evidence is recorded in
`architecture-tables-audit.md` (352 native tests, 20 site tests, 12 browser builds,
10 browser tests, seven packed consumers/licenses, graphs/sizes). These are
historical unchanged-scope evidence, not fresh R2/browser verification. No UI,
exports or dependencies changed in R2, so those expensive gates were not rerun;
neither were npm ci, npm audit or legacy comparison. Prior disclosed SVG-reference
intermittency and historical legacy/audit failures remain unchanged concerns.

## Code-principles and handoff

Self-check: correctness and unsafe-input controls exercised; cohesive production
files below 400 lines, functions below 50 and nesting at most three (lint passes);
comments explain ownership/invariants; high-risk transport/origin regressions
added; format, lint, types and tests pass. **No approved exceptions.** Internal-only
remediation, no package version/export change or Changeset added.

Both assigned findings are implemented. Independent Auditor should review the
four-source-file R2 delta and actual untracked tests, confirm private identity
survives fixed validation/snapshot/render transport, and check composed origins
on cached static and nested occurrences without losing spans or reuse. G remains
unimplemented and outside this assignment. No further implementation slice started.
