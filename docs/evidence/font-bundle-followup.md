# Font bundle follow-up: standalone measurement

Engineer evidence, not independent verification. Issue N/A; parent Builder owns
integration. PR #64 remains the separate open extraction delivery; this slice does
not alter it, its original worktree, or Git/tracker/delivery state.

## Scope and provenance

- Worktree: `/home/sprawl/projects/updf/trees/font-bundle-followup`.
- Branch: `feature/font-bundle-followup`; clean starting HEAD/base:
  `c9cbe75f6d9b4fee52ef8b93a295656754b83cac`.
- All changes are uncommitted Engineer-owned files in this worktree. No staging.
- Historical equivalent-feature baseline:
  `f347be43b245f6420818e0eb072a6877877af24a`, archived at
  `/tmp/opencode/updf-develop-integration-f347be4-20261005`.
  `cost-provenance.ts` freshly checked all 950 tracked files, isolated workspace
  links and matching tools; inventory SHA256
  `979228fe377a1b90b0e04bb716af0aa51cf549a7235103eb1bd91b02c9127055`.

Only standalone `@updf/text` measurement avoids constructing a full layout
operation. Core retains generic resource ownership and operation policy; text
retains font-independent fitting. There is no public API redesign, concrete font
algorithm in core, partial TextService contract, relaxed validation or new config.
Render/lower/layout consumers still construct their original operation and use the
same measurement delegate, metadata, scopes, final contexts and close guard.

`core/text-measurement.ts` factors the existing callback delegation into
`measureResolvedText`; the unstable sibling-only `core/internal` entry exports
`measureStandaloneText`, with its checked export inventory updated explicitly.
It calls the unchanged `operation(options)` first, preserving policy validation,
resource aliases/byte accounting, every TextService capability snapshot and every
unused provider callback descriptor/receiver snapshot. No provider initializes.
Output still passes through `ownTextService`: cloning, recursive freezing, finite
output checks and opaque run identity preservation are unchanged. Callback errors
propagate unchanged, at the original root path.

Lifecycle: the former `finally.close()` changed only private layout state.closed.
That state never escaped standalone measurement; TextService callbacks receive
only `{ bindings, budget }`. Neither field is invalidated by layout close. The
narrow function has no escaping operation or close API. Retained callback contexts
therefore remain usable exactly as before, including after failure; each call gets
a new budget. Layout/component close semantics remain unchanged and tested.

## Reproduction

Node v24.21.0, npm 11.19.0, TypeScript 5.9.3, esbuild 0.28.2, Vite 7.3.6.
`scripts/sizes.ts` rebuilds the measured packages sequentially, bundles the same
`costInputs` (and unchanged host-metrics template), using minified browser ESM,
ES2022 and explicit browser conditions. Assertions reject source aliases and
Node/CJS facades. No input/options were removed to achieve savings.

The report now includes sorted per-output module `bytesInOutput`, not just input
closure membership. Its optional fourth CLI argument selects an output directory
so a before report is not overwritten. Paths below are ignored artifacts, not
delivery files. `raw` remains the report field name but means **minified JS bytes**,
not unminified source. Module contributions describe emitted uncompressed bytes;
gzip is computed on the complete bundle and is not additive by module/package.

```sh
# Before runtime edits, at c9cbe75 (report tooling only modified):
npm run sizes -- . current /tmp/opencode/font-followup-before
# After runtime edits:
npm run sizes
npx tsx scripts/consumer/cost-provenance.ts /tmp/opencode/updf-develop-integration-f347be4-20261005
npx tsx scripts/sizes.ts /tmp/opencode/updf-develop-integration-f347be4-20261005 baseline
npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/updf-develop-integration-f347be4-20261005
```

All producers passed. A first cost-proof invocation after writing the historical
report to `/tmp/opencode/font-followup-historical` failed because the existing
proof expects `artifacts/font-extraction/baseline`; rerunning the producer at its
default location then the proof passed. No proof/harness contract was changed.

## Cumulative consumer costs

All figures in bytes. Before is extraction/integration HEAD c9cbe75, **not** old
font-in-core develop. Post values exercise this uncommitted slice.

| Profile | Before JS | Post JS | Change | Before gzip | Post gzip | Change |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Drawing | 33,426 | 33,426 | 0 (0%) | 11,537 | 11,537 | 0 (0%) |
| Helvetica render | 58,859 | 58,859 | 0 (0%) | 20,049 | 20,046 | −3 (−0.01%) |
| Prepared Unicode render | 63,133 | 63,133 | 0 (0%) | 21,289 | 21,289 | 0 (0%) |
| Measurement with fonts | 53,910 | 32,987 | −20,923 (−38.81%) | 17,821 | 11,182 | −6,639 (−37.25%) |
| Optional Fontkit application | 436,407 | 436,407 | 0 (0%) | 174,783 | 174,794 | +11 (+0.01%) |
| Host-only measurement | 49,820 | 28,899 | −20,921 (−41.99%) | 16,265 | 9,645 | −6,620 (−40.70%) |

Rendering byte counts are unchanged, not a rendering optimization. Shared delegate
factoring changes minifier identifiers/order and hence a few compressed bytes.
No JPEG-specific input/profile exists here; no JPEG savings claim is made.

| Profile | Historical JS | Post JS delta | Historical gzip | Post gzip delta |
| --- | ---: | ---: | ---: | ---: |
| Drawing | 45,293 | −11,867 (−26.20%) | 15,826 | −4,289 (−27.10%) |
| Helvetica render | 45,351 | +13,508 (+29.79%) | 15,855 | +4,191 (+26.43%) |
| Prepared Unicode render | 49,230 | +13,903 (+28.24%) | 17,014 | +4,275 (+25.13%) |
| Measurement with fonts | 20,353 | +12,634 (+62.07%) | 7,354 | +3,828 (+52.05%) |
| Optional Fontkit application | 422,544 | +13,863 (+3.28%) | 170,070 | +4,724 (+2.78%) |
| Host-only measurement | N/A | No old host-runtime equivalent | N/A | N/A |

Measurement improves substantially against c9cbe75 but still exceeds historical
font-in-core develop. No assumed savings target or net improvement over develop.

## Durable emitted-code attribution

Package totals below sum actual `bytesInOutput`; they do not allocate inter-module
glue/trailing bytes. External includes the synthetic consumer input as well as
third-party code. Historical paths are normalized only for presentation. There are
no duplicate package instances in these emitted baseline/current graphs.

| Profile | Before core → post core | Post text | Post fonts | Post kernel | Post adapter | Post external |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Drawing | 33,066 → 33,066 | 0 | 0 | 195 | 0 | 146 |
| Helvetica render | 34,093 → 34,093 | 15,888 | 8,021 | 535 | 0 | 303 |
| Prepared render | 34,098 → 34,098 | 15,888 | 12,255 | 535 | 0 | 338 |
| Measurement with fonts | 32,750 → 11,910 | 15,916 | 4,418 | 535 | 0 | 185 |
| Fontkit application | 34,251 → 34,251 | 15,947 | 12,295 | 539 | 7,052 | 365,733 |
| Host measurement | 32,748 → 11,910 | 15,911 | 0 | 535 | 0 | 542 |

Before text totals for measurement were 15,999 (fonts) / 15,994 (host); other
package totals equal post. Historical package totals were core/kernel/external:
drawing 44,593/535/146; Helvetica 44,593/535/204; prepared 48,407/535/269;
measurement 19,684/535/111. Historical Fontkit: core 48,729, kernel 539,
adapter 7,052, external 365,634. Historical core included font/text implementations.

| Profile | Largest post emitted contributors (module bytes) |
| --- | --- |
| Drawing | core/validate 4,032; core/pdf-writer 3,328; core/text-output 3,317; core/document-resources 2,885; core/data 2,358 |
| Helvetica | core/validate 4,041; core/pdf-writer 3,334; core/text-output 3,323; text/validate 3,204; core/document-resources 2,888 |
| Prepared | core/validate 4,041; core/pdf-writer 3,336; core/text-output 3,323; text/validate 3,204; core/document-resources 2,888 |
| Measurement/fonts | core/text-output 3,317; text/validate 3,194; core/data 2,356; fonts/runtime 2,221; text/lines 2,165 |
| Measurement/host | core/text-output 3,317; text/validate 3,194; core/data 2,356; text/lines 2,160; text/measure 1,704 |
| Fontkit | fontkit/browser-module 234,649; brotli/dictionary.bin 69,036; unicode-properties/module 16,202; brotli/decode 9,424; brotli/context 4,465 |

Measurement/fonts removed core/validate 4,037, vdom/normalize 2,878,
core/layout-operation 1,692, painting/bounds 1,551, core/ink 1,450,
painting/read 1,026, core/measure 939, vdom/context 830, vdom/registry 753,
painting/commands 706 and other layout orchestration. Painting/style shrank
1,786 → 30 and affine 708 → 36: top-level frozen constants still evaluate through
the internal barrel. The graph regression bounds style at 30 rather than falsely
claiming its entire input file disappears. This tiny further-avoidable barrel
residue is deliberately not optimized in this slice.

There was **no PDF writer/content serializer in either measurement profile**,
before or after. The saving is layout/drawing validation and VDOM orchestration.
Only 4,418 emitted bytes are actual fonts code in post font measurement; host
measurement still costs 28,899 bytes with no fonts package at all.

Residual cost: complete createTextService methods remain reachable through its
dynamic service object; core snapshots/checks all capabilities and validates all
returned data, including nonmeasurement outputs. Text schema/lines/measure,
finite coordinates, work ledgers, resource identity and own-data guards are needed.
Narrowing capability contracts or splitting factory APIs would require a separate
caller-assigned design decision; none is done prematurely for size. The unchanged
render profiles likewise retain generic ownership/service overhead and complete
rendering validation. Further optimization belongs in a fresh bounded assignment.

Package installation is not bundle cost: core unpacked 642,309 → 646,826 bytes,
tar.gz 108,057 → 108,902; text unpacked 174,018 → 173,654, tar.gz
30,599 → 30,499. Other package payloads are unchanged. Fixtures remain separate:
TTF 410,712 raw / 213,360 gzip; metadata 373,653 / 33,339. No asset optimization.

## Validation and principles

- `npm run format`, `npm run format:check`, `npm run lint`: pass; Biome plus AST
  400-line file, <50-line function, ≤3-level nesting enforcement. Initial lint
  rejected a type-only import; corrected without suppressions.
- `npm run typecheck`: pass, full modern dual-package build and legacy compile.
  Added malformed-capability test fixtures initially needed explicit known-present
  service assertions for TypeScript; fixed and the complete gate rerun.
- `npm test`: **811/811 pass**, zero failures/skips/cancellations; includes measurement behavioral
  parity, lifecycle/error identity, aliases/quotas, getters/inheritance, unused
  providers, mutation snapshots and emitted retained-module negative control.
  Initial graph test wrongly forbade the 30-byte frozen style constant; corrected
  to assert actual retained bytes rather than entire input closure absence.
- `npm run test:consumer`: pass, ten clean tarball closures; installed Node ESM/CJS,
  both import orders, canonical brand identity, NodeNext/Bundler declarations.
- `npm run check:licenses`: pass, all ten actual tarballs.
- `npm run build:browser && npm run check:graphs`: pass, twelve targets. Optional
  Fontkit chunk-size warning only; no changed thresholds.
- `npm run test:browser`: one default run, 11/11 pass, including measurement
  Node/Chromium and SVG raster gates. No rendering override. This does not resolve
  the earlier independent all-black GPU/environment concern documented in the
  integration evidence; independent Auditor should evaluate that environment.
- Cost provenance and PDF cost proof: pass; qpdf/font/extraction/exact raster
  preservation, Helvetica byte identity and measurement DTO equality. Existing
  native golden PDFs and layout close-context tests all pass unchanged.
- Showcase source/harness unchanged; reuse c9cbe75 integration evidence (67/67),
  not a fresh showcase-run claim. No unrelated legacy/browser remediation.
- `git diff --check`: pass. Final scope: five unstaged tracked files and four
  untracked delivery files (this document, narrow core module and two test files);
  no staged files, manifest/lock changes or tracked generated artifacts.

Universal checklist self-check: correctness tested; cohesive files; file/function/
nesting bounds enforced; intent-only comments; risk-based new behavioral and graph
negative regressions; lint/tests pass. No approved exceptions or new suppressions.
No Changesets setup exists. Status: implemented pending independent audit, not
verified; actual tracker N/A and no tracker mutation. No outstanding asynchronous
checks. Builder/Auditor reviews the uncommitted scope and reproduced attribution
before deciding integration or another bounded optimization.
