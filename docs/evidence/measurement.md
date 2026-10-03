# #26 measurement/rich text — local implementation evidence

Status: **implemented, ready for independent audit; not verified or released**.
Auditor requested changes for R1; the remediation below is implemented locally
and awaits independent re-audit. This is not an Auditor verification or tracker change.
Integration owner: Engineer; no nested delegation. #26 remains OPEN, with no
tracker mutation. #27/#28, new issues, Git staging/commits/push/PR/merge, publishing,
deployment, workflow dispatch and repository settings were not authorized or performed.

## Delivery identity and scope

- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
- Branch: `feature/measured-flow-tables`.
- Base and unchanged HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`.
- `pwd`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD`
  and `git worktree list` confirmed the new clean isolated worktree before editing.
  No old worktree was edited; no task commits or staged delta exist.
- Delivery is the actual unstaged/untracked scope, not HEAD alone. Review with
  `git diff --stat`, `git diff`, `git diff --cached --stat`,
  `git status --porcelain=v1 -uall`, and `git ls-files --others --exclude-standard`.
- Final checks: `git rev-list --count ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD`
  returned 0; `git diff --cached --stat` was empty; porcelain reported exactly
   32 unstaged tracked modifications and 26 untracked files listed below.
- Historical evidence/issue bodies/index, legacy, dependency lock, licensed font
  fixtures, project MIT and third-party notices remain unchanged. The new active
  roadmap index is `docs/roadmap/current.md`, linked from current README/contracts;
  archived planning files are not rewritten to claim implementation.

## Changed files

Tracked, unstaged (32):

```text
apps/browser-fonts/app.ts
apps/showcase/index.html
apps/showcase/src/demos.ts
apps/showcase/src/main.ts
biome.json
docs/native-api.md
package.json
packages/core/README.md
packages/core/package.json
packages/core/src/core/content.ts
packages/core/src/core/measure.ts
packages/core/src/core/plan.ts
packages/core/src/core/validate.ts
packages/core/src/fonts/cids.ts
packages/core/src/fonts/measure.ts
packages/core/src/index.ts
packages/core/src/painting/alpha.ts
packages/core/src/types.ts
packages/core/src/vdom/create.ts
packages/core/src/vdom/expand.ts
packages/core/src/vdom/lower.ts
packages/core/src/vdom/native.ts
packages/core/src/vdom/registry.ts
packages/core/src/vdom/state.ts
packages/core/src/vdom/types.ts
packages/core/test/vdom.test.ts
readme.md
scripts/consumer/types.ts
scripts/graph-check.ts
scripts/packed-consumer.ts
scripts/sizes.ts
tests/consumer/declarations.test.ts
```

New, untracked (26):

```text
apps/browser-fonts/rich-proof.ts
apps/browser-react/vite.measurement.config.ts
apps/showcase/src/rich-controls.ts
apps/showcase/src/rich.ts
docs/evidence/measurement.md
docs/measurement.md
docs/roadmap/current.md
packages/core/src/core/fixed-text.ts
packages/core/src/measurement/arithmetic.ts
packages/core/src/measurement/index.ts
packages/core/src/measurement/ledger.ts
packages/core/src/measurement/lines.ts
packages/core/src/measurement/measure.ts
packages/core/src/measurement/metrics.ts
packages/core/src/measurement/types.ts
packages/core/src/measurement/validate.ts
packages/core/src/measurement/wrap.ts
packages/core/src/vdom/measure-output.ts
packages/core/src/vdom/measurement.ts
packages/core/test/measurement-context.test.ts
packages/core/test/measurement-roundoff.test.ts
packages/core/test/measurement.test.ts
tests/browser/browser-measurement.test.ts
tests/consumer/types/measurement-template.tsx
tests/integration/rich-text.test.ts
tests/showcase/rich.test.ts
```

## Contract and risk-based checks

See [measurement contract](../measurement.md) for exact semantics. This implements
both public plain/rich inputs, rich AST/TSX, private shared rendering truth, owned
prepared-font resources, frozen results/source mapping and scoped component context.
The fixed text helper was moved without changing its wrapping/baselines/bytes.
Plain lowering still defers wrapping errors to rendering; the final rich-only
measurement pass preserves rich origin diagnostics without changing that behavior.

Added 15 native cases, one prepared-font Chromium parity case and one rich showcase
case. Coverage includes empty blocks/paragraphs/runs and LF, preserve/collapse and
first-space source/style behavior across runs, run-boundary non-opportunities,
segmentation invariance, scalar splitting with supplementary UTF16 ranges, mixed
sizes/common baseline and whole-line alignment, RGB commands, actual prepared ink
(including below-baseline glyphs), overhang/envelope failures, owned-resource
forgery and mapping snapshots, frozen input/results, optional undefined/unknown
keys/getters, text/work exact caps, cumulative repeated calls, closed context on
success/failure, source spans/origins and deferred fixed wrapping. Existing tests
retain page/node/font/output caps, qpdf/Poppler extraction/raster and both CMR hashes.

Rich PDF extraction/raster proves mixed Helvetica/Cyrillic ordering, both red/blue
ink and containment in its line envelope. Node/Chromium prepared rich measurement
JSON and PDF bytes agree exactly. Showcase checks actual source, downloads, bounded
mobile keyboard controls, geometry summary, meaningful diagnostic and invalidation;
all eight old showcase cases and initial closure/optional SVG safety still pass.

## Initial implementation validation commands and outcomes

All commands ran in the worktree above, Node `v24.21.0`.
These initial-delivery results are retained; the R1 results below supersede their
test counts, bundle measurements and dirty-scope count.

| Command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts` | pass; 484 packages; inherited deprecation notices |
| `npm run typecheck && npm test` (baseline check) | pass; 93 retained native cases |
| `npx biome check --write --diagnostic-level=error .` | pass after focused fixes; no unsafe fixes |
| `npm run format:check` | pass; final 220 formatted files, no fixes |
| `npm run lint` | pass; Biome 223 files and unchanged ESLint thresholds |
| `npm run typecheck` | pass; strict workspace builds/legacy compile and root typecheck |
| `npm test` | pass; final 108/108, including historical preservation and PDF regressions |
| `npm run build:showcase` | pass; strict site compilation and 89-module production build |
| `npm run test:showcase` | pass; 9/9 actual Chromium showcase cases |
| `npm run build:browser` | pass; all 8 existing bundles plus measurement entry |
| `npm run check:graphs` | pass; all 9 graphs; measurement closure 17 modules, no Node/React/Fontkit/SVG |
| `npm run test:browser` | final pass 4/4, all 11 existing SVG references/tolerances unchanged; intermittent failure noted below |
| `npx tsx --test tests/svg-reference/browser.test.ts` | pass unchanged, after intermittent reference failure |
| `npm run test:consumer` | pass; all 5 clean tarball closures; measurement/fonts fixtures additionally run isolated NodeNext/Bundler `types: []` |
| `npm run check:licenses` | pass; MIT ©2026 Surikat AB and third-party notices, no production font assets |
| `node apps/node/dist/cli.js artifacts/cmr.pdf` | pass |
| `node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf` | pass |
| `node apps/node/dist/font-proof.js` | pass |
| `node apps/node/dist/painting-proof.js` | pass |
| `node apps/node/dist/svg-proof.js` | pass |
| `npm run sizes` | pass; real measurements, not #32 regression-budget completion |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | exact required digests retained |
| `npm run test:legacy:comparison` | pass equivalence only; raw/full exit 1; 18 pass / 1 pending / 6 fail retained |
| `npx tsx scripts/audit-report.ts` | known nonzero npm audit, 45 inherited findings (8 moderate / 10 high / 27 critical) |
| `npm audit --omit=dev --ignore-scripts` | pass; 0 production vulnerabilities |
| `git diff --check` | pass |

An intermediate targeted rich test failed while creating an intentionally oversized
test glyph without enlarging its descriptor; the fixture was corrected. Compiler,
formatter and function-size checks caught intermediate typing/formatting/test-size
issues; all were fixed without waiving gates. One final-chain browser run had an
existing SVG logo reference failure (full-canvas foreground, interior mismatch 1).
No production/test/tolerance change was made: the unchanged SVG test passed alone,
and the full 4-case browser suite then passed. This intermittent reference failure
is disclosed, not diagnosed away or hidden; Auditor should rerun the raster gate.

CMR digests:

- `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`
- `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`

Measurement bundle: **20,679 bytes / 6,578 gzip**. Core bundle: **43,641 / 13,379**.
Showcase initial JS: Vite **59.79 kB / 20.14 kB gzip**; optional SVG chunk
**28.44 / 10.31 kB**. Initial site remains core/VDOM/measurement only, no optional
parser, React, Node or SVG. Existing manual-only Pages workflow already builds core
through `build:showcase` and tests the resulting site; it is unchanged/not dispatched.

## Code-principles self-check and next owner

Checklist passes: correctness checked; cohesive production files ≤400 lines,
functions ≤49 lines, nesting ≤3; intent-only comments; readonly portable types;
proportional tests; current native lint/typecheck/tests pass. No `any`, size/depth
waiver or blanket lint exemption added. The exact new Vite config joins the existing
default-export allowance because Vite requires its config contract; no other rule
is waived. Existing JSX namespace/legacy/history exemptions retain their intent.
No other approved exception. No Changesets system exists; packages remain private.
Historical index preservation is handled with a separate active index, not a
rewritten preservation inventory or golden evidence.

Auditor should review all unstaged and untracked files against the stated base,
inspect whitespace/source/ink/cap boundaries and context lifetime, independently
check actual PDFs and Node/browser parity, rerun the intermittent SVG reference
gate, and confirm fixed CMR digests/ownership/portable declarations/graphs and
manual workflow safety. Do not start #27 until #26 receives independent audit.

## Auditor R1 remediation — implemented, not independently verified

Only eight files were changed by this remediation:

- `packages/core/src/measurement/arithmetic.ts` (new private compensated sum and fit comparison)
- `packages/core/src/measurement/metrics.ts` (rich-only Helvetica envelope complement)
- `packages/core/src/measurement/lines.ts` (stable fragment positioning/envelope/ink checks)
- `packages/core/src/measurement/measure.ts` (stable rich height, reused in returned result)
- `packages/core/src/measurement/wrap.ts` (stable advances and consistent token/scalar/soft fits)
- `packages/core/test/measurement-roundoff.test.ts` (new seven-case regression suite)
- `docs/measurement.md` (numerical contract)
- `docs/evidence/measurement.md` (this evidence)

The supplied 32-modified/24-untracked delivery was confirmed before edits. Branch,
base/HEAD and empty index are unchanged; only the helper and regression file add
untracked paths. No plain/fixed helper, Helvetica width table, font ownership,
public/internal export inventory, SVG test/threshold or delivery/tracker state changed.
The helper stays private; no speculative flow fit API or #27 work was introduced.

Risk-based controls exercise each reported exact-fit case across `measureText`,
`measureTextUnknown`, typed/unknown rendering, `lower`, and rendering the lowered
AST: one `A` at fontSize/lineHeight 10.51; three 10.3-point lines in height 30.9;
nine `A`s in width 60.03 in both error and codePoint modes. Tests additionally check
color/run segmentation invariance, paragraph segmentation, scalar and soft-wrap
boundaries, smaller bounds only four relative epsilons beyond fit, prepared-envelope
and zero-edge ink failures, scaling at `1e-200`/`1e200`, and arithmetic overflow/input
infinities. Huge left-aligned boxes cannot hide a real prepared-glyph overhang.

Before rebuilding, `npx tsx --test packages/core/test/measurement-roundoff.test.ts`
ran against the existing pre-remediation emitted engine: all five initial probes
failed, including the exact three Auditor diagnostics. After rebuilding and adding
prepared controls, all seven cases pass. An intermediate synthetic overhang fixture
used a fractional font-unit bound and correctly failed `FONT_DATA`; it was replaced
with an integer-bound glyph and a precisely varied centering width. Font metadata
validation was not relaxed.

Current commands, all in the same worktree with Node `v24.21.0`:

| Exact command | R1 outcome |
| --- | --- |
| `npx biome check --write --diagnostic-level=error packages/core/src/measurement packages/core/test/measurement-roundoff.test.ts` | pass; scoped safe formatting only |
| `npm run build -w @updf/core` | pass |
| `npx tsx --test packages/core/test/measurement-roundoff.test.ts` | pass, 7/7 |
| `npm run check:code-principles` | pass independently |
| `npm run format:check` | pass; 222 files, no fixes |
| `npm run lint` | pass; Biome 225 files and unchanged ESLint limits |
| `npm run typecheck` | pass; full strict workspace build/root check |
| `npm test` | pass, **115/115**; old 108 plus seven R1 controls, including qpdf/extraction/raster/CMR preservation |
| `npm run build:showcase` | pass; 90 modules; no site source changes needed |
| `npm run test:showcase` | pass, **9/9** |
| `npm run build:browser` | pass, **9 bundles** |
| `npm run check:graphs` | pass, **9 graphs**; private measurement closure 18 modules, portable/no React/Fontkit/SVG |
| `npm run test:browser` | pass, **4/4**, including actual prepared-font measurement/PDF parity and all 11 unchanged SVG references |
| `npm run test:consumer` | pass, all **5 isolated tarball closures**, NodeNext/Bundler `types: []` |
| `npm run check:licenses` | pass; project MIT/third-party notices unchanged |
| `npm run sizes` | pass; measurement **21,643 / 6,894 gzip**, core **44,611 / 13,680 gzip** |
| `node apps/node/dist/cli.js artifacts/cmr.pdf` | pass; regenerated from the current built engine |
| `node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf` | pass; regenerated from the current built engine |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | exact two digests above retained |
| `qpdf --check artifacts/measurement/rich.pdf` | pass |
| `qpdf --check artifacts/showcase/updf-rich.pdf` | pass |
| `git diff --check` | pass |

Current initial showcase JS is Vite **60.58 kB / 20.40 kB gzip**; optional SVG remains
**28.44 / 10.31 kB**. The previously disclosed intermittent SVG failure did not recur
in this remediation run; its history is retained above. Dependency manifests/lock,
legacy and audit-sensitive code were not changed, so the previously captured legacy
18/1/6 and inherited audit 45/production 0 evidence is retained, not claimed rerun.

Code-principles checklist was repeated: correctness-first finite/narrow fits;
cohesive files ≤400 lines, functions ≤49, nesting ≤3; intent-only comments;
readonly/public contract preservation; proportional regression tests; all relevant
gates pass. No new approved exception or lint waiver. No Git/tracker/delivery mutation.
Auditor should independently retry R1 and the genuine-overflow/scale controls on
the complete 32-modified/26-untracked delivery before allowing #27 to start.
