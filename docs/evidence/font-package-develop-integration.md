# Font/text extraction — pending develop integration evidence

PR #64; issue N/A. Engineer implementation evidence, **not independent verification**.
Parent Builder is integration owner; final Auditor reviews the actual pending merge.
No commit, push, PR/tracker mutation, nested delegation or other-worktree edit.

## Revision and scope

- Worktree: `/home/sprawl/projects/updf/trees/font-package-extraction`.
- Branch: `feature/font-package-extraction`.
- Extraction HEAD/first parent: `07052c9498639c45001bc4d0733fef6b1dc76d4a`.
- Incoming develop/MERGE_HEAD: `f347be43b245f6420818e0eb072a6877877af24a`.
- Common historical base: `ba487704860c3cf9a16b6aba90a8ae86285beff1`.
- Checks exercise the dirty integrated tree, not HEAD alone. Merge remains pending.
- The preceding checkpoint supplied 197 staged integration paths, no unmerged,
  unstaged or untracked paths. Those index changes are preserved; this slice owns
  consumer dual proofs, packaging export correction/regressions, cost proof tooling
  and this evidence/live-doc correction. Final scope/hash is reported in handoff.

Conflict resolution retained incoming documentation, dual-format packaging, Biome
and AST principles enforcement, legacy tooling retirement and the side-by-side
showcase UX/branding. Extraction ownership remains authoritative: core owns generic
resources, ports, PDF serialization and VDOM identity; fonts owns prepared handles,
font bytes, metrics and provider; text owns fitting and text services. Branding uses
the existing application text helper. No duplicate UI flow, old core font exports,
implicit font defaults, concrete core font dependency or copied implementations are
restored. Fonts/text use the same clean-out dual builder as other native packages.
The lock retains incoming pins and legacy TypeScript compilation, not retired
ESLint/Babel dependencies. No unrelated features or performance optimization.

## Actual installed dual-consumer contract

`scripts/consumer/dual.ts` and `dual-text.ts` execute inside real npm tarball installs.
All manifest entries (including internal seams) of every installed native package
must expose exactly the same named values through Node ESM/CJS, in both initial
import orders. This includes core resources/pdf and new fonts/text, not just core.
Require resolves to CJS, never caches `.mjs`, and a separate require-only process
passes with `--no-experimental-require-module`.

Ten closures retain drawing core without fonts/text, host-metrics core/text without
fonts, explicit Helvetica/prepared Unicode without Fontkit, layout/tables, geometry,
SVG/CMR, kernel-only, legacy and Fontkit optional peer absent/present. The absent
peer rejects in both loaders; the installed peer is pinned to 2.0.4. Browser graphs
and absent-package assertions reject hidden concrete font dependencies in core.

Cross-loader proofs exercise generic owned-resource WeakSet identity and byte
accounting; prepared/Helvetica handles accepted by runtimes from either loader;
VDOM context snapshots retaining exact handle identity; text-service and provider
factories from both loaders sharing one runtime; and rendering through both core
loaders. Real prepared runs/provider private slots therefore cross the canonical
graph. Independently created runtimes still reject foreign runs and providers.
Branded prepared/owned-resource/TextRun/Context types and every entry namespace
compile bidirectionally from actual installed `.cts`/`.mts` declarations under
NodeNext and Bundler, without source aliases.

The strengthened proof found a real packaging defect: source `export type` of the
value-backed `PdfWriter` class was incorrectly emitted as a facade value. Checked
symbol discovery now respects type-only export specifiers. Exact export identity
assertions were retained, not loosened. Regression tests cover declaration-level
and individual-specifier type exports while preserving actual class values.

The actual core tarball file inventory rejects obsolete fonts, fixed-text/metrics
and removed measurement implementations in browser ESM, canonical CJS and Node
facades, including declarations and maps. Negative tests cover all emitted suffixes;
retained measurement data/ports and core orchestration remain allowed. There is no
packaging fallback that copies the old implementation into another graph.

## Gates run on the integrated tree (2026-10-05)

| Exact command | Result |
| --- | --- |
| `npm ci` | pass, 64 packages; reproducible unchanged final manifest/lock pins |
| `npm run format:check` | pass |
| `npm run lint` | pass, Biome and AST file/function/depth checklist |
| `npm run typecheck` | pass, includes sequential clean package build and legacy compile |
| `npm test` | 803 pass, zero failures/skips/cancellations; 801 inherited + 2 packaging regressions |
| `npm run test:consumer` | pass, all ten normal + dual tarball closures and NodeNext/Bundler types |
| `npm run build:browser && npm run check:graphs` | pass, all twelve fresh emitted browser targets and source seams |
| `npm run check:licenses` | pass, all ten actual tarballs contain full project MIT; required third-party notices retained; no fixture font assets |
| `npm run test:browser` | historical Engineer pass, 11/11; subsequent independent default-GPU audit failed 9/11 (see qualification below) |
| `npm run build:showcase && npm run test:showcase` | pass, full 67/67 incoming/current tests, including branding/UX |
| `npm run test:legacy` | expected exit 1, historical focused container TypeError retained |
| `npm run test:legacy:comparison` | pass, historical full 18 pass / 6 fail / 1 pending and output digest preserved; not a passing raw suite |
| `npm test -w @updf/layout-playground` | pass, 12/12 |
| `npm run build -w @updf/layout-playground && npm run test:browser -w @updf/layout-playground` | pass, 5/5 |
| `git diff --check` and `git diff --cached --check` | pass; final index hygiene repeated before handoff |
| `git ls-files -u` | empty; no unresolved merge paths |

The new consumer initially failed on the actual PdfWriter facade mismatch, then on
three proof-fixture mistakes (zero pages, incomplete host runtime, unconfigured
layout measurement). These were corrected, and the complete consumer gate rerun.
The first principles run rejected a 50-line proof function; splitting compilation
into its cohesive helper restored the gate. No assertions or capability requirements
were removed. The intentional arithmetic corruption control prints an esbuild
error during passing native tests. Vite's optional Fontkit chunk warning is not a
failed gate. No async checks remain pending.

The historical independent all-black GPU capture and explicit software-rendered
pass remain in [original extraction evidence](font-package-extraction.md), unchanged.
The original Engineer default-browser pass does not diagnose or resolve that
environment risk. The subsequent independent audit reported 9/11, failing SVG logo
comparison and fractional-stroke calibration (native capture all black; calibration
28,000 pixels). This is caller-supplied independent audit/tool-history evidence, not
a new default run by this Engineer. The default GPU/CI risk remains unresolved.

## Bounded lockfile and qualified-browser auditfix

This slice owns only `package-lock.json`, `tests/integration/lockfile.test.ts` and
this evidence update. All 207 preceding staged paths and both merge parents are
preserved; there are no runtime, harness, threshold, license-policy or manifest edits.

Before the controlled browser run, all 103 current `artifacts/svg-*` files were
copied to `/tmp/opencode/pr64-integration-svg-failure-f347`, including native logo,
browser metadata and comparison results. `sha256.json` records their content hashes;
`original-index.txt`, `incoming-lock.json` and `pruned-lock.json` preserve provenance.
Independent audit logs/tool history remain prior evidence; this snapshot preserves
the actual failed files, not an invented exported audit log.

The lock was generated in `/tmp/opencode/pr64-lock-clean-f347`: a complete copy of
the resolved tracked source, READMEs, types and manifests, with no `node_modules`,
seeded with `MERGE_HEAD:package-lock.json`. Node v24.21.0 / npm 11.19.0 used
`https://registry.npmjs.org/`; `npm ping --registry=https://registry.npmjs.org/`
returned PONG (205 ms). The exact generation command was:

```sh
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/
```

This preserves incoming pins while npm reconciles the current fonts/text workspaces,
instead of copying the old lock over new workspace changes or inferring records from
Linux installed state. No manual metadata append was needed. Mechanical comparison
(`python /tmp/opencode/pr64-lock-validate.py`) passed for all 117 surviving incoming
registry records: exact version, resolved, integrity, OS, CPU and libc metadata.
There are zero new registry versions, 150 total package records, all 11 canvas parent
optional declarations resolved at 1.0.10, and fonts/text workspace links included.
Recovered 48 existing-record resolved/integrity pairs plus ten omitted canvas platform
records (58 pairs overall). Retired ESLint/Babel records remain absent. Exact incoming
historical HTTP URLs and SHA1 integrity are preserved, not silently upgraded.

Fresh checks and provenance:

| Command / location | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` / isolated tree, then integrated worktree | pass, 64 packages each |
| `npm run typecheck` / isolated tree and integrated worktree | pass, full sequential build and legacy compile |
| `npm test` / isolated tree | pass, 803/803; resolved sources, no source aliases or shared workspace links |
| `npx tsx --test tests/integration/lockfile.test.ts` / integrated worktree | pass, 2/2 |
| `npm test` / integrated worktree after fresh install | pass, 805/805 including two new lock regressions |
| `npm run format:check` and `npm run lint` / integrated worktree | pass, Biome plus AST principles |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund --os=darwin --cpu=arm64` / isolated tree | pass, adds canvas-darwin-arm64 1.0.10 |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund --os=win32 --cpu=x64` / isolated tree | pass, adds canvas-win32-x64-msvc 1.0.10 |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund --os=linux --cpu=arm64 --libc=musl` / isolated tree | pass, adds canvas-linux-arm64-musl 1.0.10 |
| `BROWSER_CHROMIUM=/tmp/opencode/issue41-chromium-software.sh npm run test:browser` / integrated worktree | **ENV-qualified pass**, 11/11, zero skips; one authorized whole run |

Dry runs are install-plan evidence, not actual execution on those operating systems.
The existing verified wrapper is exactly `exec /usr/bin/chromium --disable-gpu "$@"`;
the executable remains Chromium 152.0.7977.82 (Arch Linux). Browser output is recorded
separately in `/tmp/opencode/pr64-software-browser.log`. No default retry, downgrade,
threshold change, cause diagnosis or waiver. The controlled pass neither fixes the
default failure nor automatically resolves issue #48. Final Auditor may run its own
authorized software check. PR/delivery state is unchanged; eventual PR should remain
draft while default gate risk is unresolved.

Other earlier source, ten dual-consumer, browser-graph, license, showcase, legacy and
cost/PDF proofs above are reused, not claimed freshly rerun here. Risk-based additions
check registry resolution/integrity generically and every canvas native declaration;
the two initial regression runs exposed overly strict SHA512/HTTPS assumptions, which
were corrected to accept exact incoming historical metadata without changing it.
Checklist: focused/cohesive 35-line test, short functions/shallow nesting, no new
approved exceptions; lint, fresh build/typecheck and tests pass. Default browser and
raw legacy failures remain explicit. This bounded repair is ready for re-audit,
not independently verified and not a claim that all integration gates are green.

## Fresh develop cost baseline and provenance

The original `ba487704` comparison remains **historical only**. This comparison
uses a newly extracted `git archive f347be43b245f6420818e0eb072a6877877af24a` at
`/tmp/opencode/updf-develop-integration-f347be4-20261005`, with its own `npm ci`
(62 packages). No baseline native test run is required for this producer comparison.
`cost-provenance.ts` verifies all 950 archived tracked files against Git blob IDs,
isolated workspace links, absence of fonts/text packages, historical exported
entry branches and matching TypeScript/esbuild/Vite versions. Source inventory
SHA256: `979228fe377a1b90b0e04bb716af0aa51cf549a7235103eb1bd91b02c9127055`.

From the integrated worktree:

```sh
npx tsx scripts/sizes.ts /tmp/opencode/updf-develop-integration-f347be4-20261005 baseline
npm run sizes
npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/updf-develop-integration-f347be4-20261005
npx tsx scripts/consumer/cost-provenance.ts /tmp/opencode/updf-develop-integration-f347be4-20261005
```

All passed. Both size producers rebuild their own prerequisites and use the same
Node v24.21.0 / npm 11.19.0 / TypeScript 5.9.3 / esbuild 0.28.2 / Vite 7.3.6,
minified browser ESM, ES2022, explicit `browser` conditions, same geometry/text/font
fixtures and exported operations. The producer rejects source aliases and Node/CJS
facades in both module closures; current-develop dual-format packaging is not
unfairly measured as CommonJS. Historical API branches are used only for baseline.
Reports/bundles/tarballs/PDFs/rasters live in ignored `artifacts/font-extraction`.

| Consumer | Develop JS | Integrated JS | Delta (%) | Develop gzip | Integrated gzip | Delta (%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Drawing | 45,293 | 33,426 | −11,867 (−26.20%) | 15,826 | 11,537 | −4,289 (−27.10%) |
| Helvetica render | 45,351 | 58,859 | +13,508 (+29.79%) | 15,855 | 20,049 | +4,194 (+26.45%) |
| Prepared Unicode | 49,230 | 63,133 | +13,903 (+28.24%) | 17,014 | 21,289 | +4,275 (+25.13%) |
| Measurement with fonts | 20,353 | 53,910 | +33,557 (+164.87%) | 7,354 | 17,821 | +10,467 (+142.33%) |
| Optional Fontkit application | 422,544 | 436,407 | +13,863 (+3.28%) | 170,070 | 174,783 | +4,713 (+2.77%) |

Host-only measurement: 49,820 JS / 16,265 gzip; baseline equivalent N/A because it
has no structural host text runtime. Browser code sizes happen to reproduce the
older numbers; this is fresh `f347be43` evidence, not reuse of `ba487704` measurements.
Fonts-using consumers grow, especially measurement. There is no net-savings claim
for those consumers and no completed optimization claim.

Actual npm tarball payloads, including dual JS/declarations and notices (not npm
cache or filesystem allocation, excluding external Fontkit and test font assets):

| Package | Develop unpacked | Integrated unpacked | Delta (%) | Develop tar.gz | Integrated tar.gz |
| --- | ---: | ---: | ---: | ---: | ---: |
| Kernel | 259,440 | 259,440 | 0 (0%) | 49,534 | 49,534 |
| Core | 802,901 | 642,309 | −160,592 (−20.00%) | 135,226 | 108,057 |
| Fonts | N/A | 111,224 | new package | N/A | 21,807 |
| Text | N/A | 174,018 | new package | N/A | 30,599 |
| Adapter | 52,614 | 52,710 | +96 (+0.18%) | 10,667 | 10,692 |

Drawing install includes the whole kernel: 1,062,341 → 901,749 unpacked bytes,
−160,592 (−15.12%). Composed kernel/core/fonts/text: 1,186,991, +124,650 (+11.73%)
against develop core/kernel. Assets separately unchanged: TTF 410,712 raw / 213,360
gzip; metadata 373,653 / 33,339. No JPEG or external Fontkit installed cost claimed.

## PDF preservation and principles

Actual browser consumer bundles run through qpdf, pdffonts, pdftotext and exact
72-dpi Poppler raster hashing. Drawing, Helvetica and prepared Unicode preserve
text/raster; measurement DTOs match. Helvetica bytes match SHA256
`07aa4eeb52757cfb40d1a7dd1a0c36609e3016adfcceebcb1652c5dd19c831be`.
Drawing/prepared bytes change intentionally by removing unused Helvetica:
drawing `a5ae7280…` → `d5860430…`; prepared `e7cf3169…` → `2e2b6a20…`.
Full digests/extracted text are in `pdf-proof.json`.

CMR proof uses canonical installed Node core/font exports on both sides, not
private native ESM mixed with Node CJS ownership. ASCII CMR bytes remain
`8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
Unicode CMR changes `cea1742a…` → `4d2b14b9…`, with exact raster/extraction equality;
full provenance is in `cmr-proof.json`. No blanket byte-equivalence claim.

Universal checklist self-check: correctness through real installed consumers and
PDF/browser gates; cohesive files ≤400 lines, functions <50 lines and nesting ≤3;
intent-only comments; risk-based new facade/obsolete-artifact negative regressions
plus expanded real dual consumers; lint and native tests pass. No new approved
exception. Existing documented historical/generated/legacy exclusions are retained;
raw legacy failure is preserved and comparison passes, not silently waived.
No Changesets setup exists. Source scans leave old core API references only in
historical cost branches, removed-entry negative tests and migration/removal prose;
`fontBytes` application output variables are not obsolete limit fields.

Ready for independent Auditor to inspect staged scope against both parents,
reproduce identity/cost/provenance checks as warranted, and retain honest GPU/raw
legacy and text-cost qualifications. Delivery remains Builder/user-owned.
