# Slice F audit remediation — F-AUD01, F-AUD02, F-AUD03

**Implemented for independent re-audit, not verified. No G work.** The Auditor
found composition and occurrence defects despite the prior passing gates. The main
F handoff and its baseline/delta remain historical, byte-for-byte unchanged; their
earlier passing counts did not establish verification.

Cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
Branch: `feature/measured-flow-tables`. Base/HEAD:
`ac60f80675a2042f2f6043bae51b541b85e7251f`.
Pre-remediation inherited scope: 61 modified tracked paths / 241 untracked files.
Integration owner Engineer; no nested delegation, tracker, staging/commit/push/PR,
merge, Pages activation or deployment/settings mutation. Tracker N/A.

## F-AUD01 — preserve deferred authored content in measured cells

The natural painting path intentionally creates deferred native placeholders. An
ordinary data snapshot copied their visible empty-group shape but lost their private
emission identity. That reserved height while dropping the authored head/foot.

The layout owner now transports deeply immutable, privately registered emission
nodes through public measurement snapshots and ordinary data/JSX capture. These
are the existing core-owned content capability mechanism, not public fields,
callbacks, setters, mutable brands or serializer plans. JSON/copy lookalikes do not
gain executable ownership. The public API and accepted arbitrary-block cell
composition remain supported; there is no rejection workaround or scope freeze.

Measurement/geometry trials see only the already-known native geometry, not an
early recipe preview. Final recipes remain in the native graph beneath the same
cell translations/container transforms/clips. Selected extension and static-region
painting instantiate occurrence-owned emission nodes. Placeholder nodes/wrappers
are not charged as fictitious native output; real late output and its wrappers use
the shared document budget before validation/copy. Existing failing-budget getter
controls remain enabled and passing. Hidden text still counts and extracts;
clipping is not redaction. Page exhaustion prevents all recipe callbacks.

Public tests demonstrate actual qpdf/Poppler head → body → foot extraction, not
just AST shape or two equally wrong byte streams. Reused cells and repeated static
table-head cells get their own Block fragment owner, correct final page/total,
nearest provider and footer context. Prepared-font data and actual TSX use the
same public adapter, with exact Node/Chromium bytes **plus extracted authored
Latin/Cyrillic header/body/footer text and observed final context values**.

## F-AUD02 — occurrence-owned decoration state, immutable semantic reuse

Deferred decoration plans are immutable recipe blueprints. Preparing an occurrence
clones only its privately owned entries/owner state, binds the local extension and
lifetime, and starts a new fragment ordinal. The cached measurement/fragment
callback and semantic nodes are still reused. No cache counter is reset/restored
and no shared counter is temporarily borrowed under reentrant execution.

Repeated descriptor `t` in `[t,t]` reports index 0/count 1/first/last true twice,
with separate source placements. Multi-fragment owners reset independently: the
test's first table has two fragments and the second has three because it legitimately
starts in remaining page space; owner-local counts match those actual placements,
not a combined five-fragment owner. Cell Block owners remain count one independently
of their containing table's fragment count.

Known source-origin rebasing is operation-local, restored in finally, and applied
to captured content paths during late emission. Cached body-0 recipes failing in
body-1 now identify body-1 and retain the native character span. Existing structured
adapter errors outside that owned origin preserve their original identity/span.
Ordinary component errors retain core's pre-existing component-path wrapping.

## F-AUD03 — section/row/cell diagnostic origins

Static head/foot measurement now supplies `/props/head/rows/N` or
`/props/foot/rows/N` rather than falling back to `/props/rows`. Body paths retain
`/props/body/N`. Font-declaration checks use the same section/row convention.
The optional row origin default was removed internally so future callers cannot
silently omit it. Captured JSX cell paths are retained privately and used for
geometry and font-style checks; no loose public metadata bag was introduced.

Data tests exercise CHARACTER (including span), FONT_RESOURCE and GEOMETRY on the
second static head/foot row and check the complete section/row/cell prefix. JSX
tests exercise those categories at the captured second-cell source path. Repeated
headers are still decorations and do not pretend to consume body rows.

## Quality evidence at delivered scope

All commands below ran from the exact worktree above and unchanged HEAD:

| Command | Outcome |
| --- | --- |
| `node --experimental-strip-types scripts/record-slice-f-audit.ts` | Separate pre-remediation file/SHA manifest captured before edits; only recorder existed as new audit source |
| `npm install --package-lock-only --ignore-scripts` | Exact workspace table dependency added to browser proof app; no external version update |
| `npm ci --ignore-scripts` | Pass, 486 packages, historical deprecation warnings |
| `npm run format:check` | Final pass, 410 files |
| `npm run lint` | Final pass, Biome 413 files and all production file/function/nesting rules |
| `npm run typecheck` | Pass; full root build and strict root declarations |
| `npm test` | **352 passed**, no skips, including all original 342 tests and ten new public regression tests |
| `npm run test:consumer` | **Seven** actual clean tarball closures, NodeNext/Bundler/types/runtime pass |
| `npm run check:licenses` | **Seven** actual tarballs pass, complete MIT/notices/OFL protected, no font/test asset leak |
| `npm run build:showcase && npm run test:showcase` | Production build and **20 site tests** pass |
| `npm run build:browser` | **12 emitted-package browser bundles** pass |
| `npm run test:browser` | Final full run **ten passed**, including new prepared-font deferred-cell data/TSX proof |
| `npm run check:graphs && npm run sizes` | 12 graphs pass; public tables DAG and no optional/private/legacy leakage preserved |
| `npx tsx scripts/report-slice-f-audit.ts` | All **158 F / 133 inherited** protected paths and stronger audit-core/history/kernel checks pass; no baseline deletions |
| `git diff --check` | Pass; no stages/commits |

One SVG-reference run under concurrent site/browser load reproduced the known
black-logo raster failure (interior mismatch ratio 1, bbox delta 16). No SVG source,
metric, tolerance, retry rule or skip was changed. Exact standalone rerun
`npx tsx --test tests/svg-reference/browser.test.ts` passed; subsequent full
`npm run test:browser` passed all ten. This intermittent failure remains disclosed.
The historical >500 kB optional Fontkit proof warning remains.

A concurrent showcase attempt raced with `npm ci` removing tool links and failed
`tsc: command not found`. The full build/site gates were rerun after install finished
and passed. Corrected test expectations include legitimate per-owner fragment counts,
the captured JSX tree path, and existing component-vs-adapter error wrapping; none
relaxes a raster/numeric threshold or hides a failed composition.

Core-only bundle remains **49,793 bytes / 15,107 gzip**. Fixed CMR remains
**5,779 bytes**, SHA-256
`8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
The unchanged 63-edge inventory raster and old negative controls pass. Native
font/geometry/numerical/CMR certificates and all core source hashes are protected
against the audit baseline. Standalone table bundle now 108,271 bytes / 30,228 gzip;
the new browser proof is explicit optional test-app code, not core/site eager code.

Known legacy/full-audit failures are unchanged historical evidence, not repaired or
waived by this scope: raw legacy container failure, equivalent isolated baseline
18 passing/1 pending/6 failing, full npm audit 45 vulnerabilities and production zero.
They were not rerun as fixes in this bounded composition remediation.

## Code-principles and actual delivery

Self-check passes: cohesive production files under 400 lines; functions under 50;
nesting at most three; no `any`, public trust flags, table-private layout import or
unsafe callback restoration; comments explain ownership/budget invariants. Tests
are proportional to the high-risk composition/cache/budget/source-origin changes.
**No approved exception.** Modern lint/type/test gates pass; implementation is not
independent verification. G/image work is not implemented, and no issues were created.

`architecture-tables-audit-baseline.json` and `architecture-tables-audit-delta.json`
identify the actual incremental delivered source and all cumulative dirty scope,
including committed/staged/unstaged/untracked paths. The old main F evidence is not
regenerated. Check with `git status --short`, `git diff --cached --name-only`,
`git diff ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD --name-only`, and the audit report.
Final report: 61 cumulative modified tracked paths / 251 untracked files, zero
committed/staged paths. Incremental audit delta: 15 changed inherited files plus
the audit-owned recorder's formatting change; eight added files excluding the
self-referential delta JSON; no removals. Stronger audit protection checks 257
paths, including all core source/history, in addition to the 158/133 controls.

Auditor should re-check F-AUD01–03 on the actual delta: capability snapshots and
occurrence instantiation, late whole-document counters/lifetime and clipped output,
independent cached-table/cell owners, source rebasing and precise static/JSX error
origins. In particular verify real PDF text and current page/fragment/provider values,
not byte equality alone. **Ready for independent re-audit; not verified; no G yet.**
