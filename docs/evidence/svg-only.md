# SVG-only extraction evidence (#47 / unmerged PR #68)

## Identity and bounded scope

- Worktree: `/home/sprawl/projects/updf/trees/svg-only`, branch `feature/svg-only`.
- Base/HEAD: `c6a672961db89107daeeb27e06fe5f8d55e596cf`, matching
  `origin/develop` at assignment. The starting index/worktree was clean.
- Published source: `a76a198481fdccb991c3b9a0fed2427a2e328eaf`, read-only
  `trees/svg-merge-ready`. Original feature provenance: `d92858b`; frozen
  baselines: `e813bab`; structured surrogate rejection: `a76a198`.
- Selective worktree extraction, not a cherry-pick of the mixed `a304983` merge.
  No source was taken from the unpublished mixed-JSX worktree.
- Engineer owns this worktree's uncommitted extraction only. No stage, commit,
  push, issue mutation, PR, merge, deployment, or other worktree edit occurred.
  Issue #47 remains OPEN; PR #68 remains historical OPEN/unmerged source.

Includes SVG authoring/JSX runtimes, bounded structured preparation, authentic
reusable handles/native components, optional block/inline adapters, shared SVG
XML/structured compilation, exports/optional-peer packaging, packed consumers,
source graphs, and existing showcase integration. XML APIs and diagnostic source
provenance remain covered. Structured unpaired UTF-16 surrogates reject in names,
attribute names/values and text; valid scalar pairs remain accepted.

`packages/core`, `packages/layout`, `packages/layout-boxes`, `packages/text`,
`packages/tables`, and the numerical policy are unchanged from the base. No
FitFrame, ParentFit, fragment-fit, context propagation, MetricSum preview/fork,
shared geometry helper, or arithmetic-preservation test change is extracted.
The proposal's fractional SVG/layout/browser/PDF tests and fixture are absent.
Current font, PNG, barcode and packed-consumer coverage is retained.

## Existing native-placement limitation

The adapter retains the existing conservative host protocol and strict fixed-size
fragment check. Subtraction can falsely defer `[4.9, 0.1]` in 5 points and
`[1.2, 1.1]` in 2.3 points. Metric fit does **not** imply native fit:
`[0.1, 0.2]` in 0.3 points and three 10.3-point blocks in 30.9 points at
origin zero can exceed the exact native endpoint. There is no one-page promise
and no shrinking, clipping, shifting, widening, or overlap workaround. Numerical
implementation and its proposal tests remain a separate workstream.

## Validation environment and commands

The table below records the original extraction checks, **before** the independent
audit rejection. Current correction checks and their provenance are recorded in
the audit-correction section below; original host/cost evidence is not a new rerun.

Node `v24.21.0`, npm `11.19.0`, Chromium `152.0.7977.82` (Arch Linux),
qpdf `12.4.1`, Poppler Cairo `26.08.0`. Commands run from the worktree above.
Logs are local `/tmp/opencode/svg-only-*.log`; generated bundles, PDFs, PNGs,
comparison JSON and the measurement driver are ignored `artifacts/` output.

| Command | Outcome | Log suffix |
| --- | --- | --- |
| `npm ci` | pass | `ci` |
| `npm run format:check` | pass | `format-final` |
| `npm run lint` | pass, Biome + AST principles | `lint-final` |
| `npm run typecheck` | pass, includes full `npm run build` | `typecheck-final` |
| `npm test` | pass, 1,157 tests | `test-final` |
| `npm run test:consumer` | pass, 14 clean external tarball closures | `consumer` |
| `npm run check:licenses` | pass, actual tarball notices/licenses | `licenses` |
| `npm run build:browser && npm run check:graphs` | pass | `build-browser-final`, `graphs-final` |
| `npm run test:browser` | pass, 15 tests | `browser-npm-final` |
| `npm run build:showcase` | pass | `build-showcase` |
| `npm run test:showcase` | pass, 101 tests, no cancellations | `showcase-final` |
| `node artifacts/svg-only-costs.mjs` | pass, actual-base XML PDF parity | `costs` |
| `git diff --check` | pass | terminal |

The packed proof covers absent/present optional layout, no-font placement,
ESM/CJS identity in both loader orders, and NodeNext/Bundler declarations.
Source-graph tests assert XML parsers are unreachable from TSX, one shared SVG
compiler, XML positive controls, and independent no-SVG controls. The frozen
baseline tests use checked-in sources, not Git history.

`tests/browser/svg-authoring.test.ts` bundles public browser exports, compares
XML/TSX PDF bytes exactly in Node and Chromium for red/blue, validates actual PDFs
with `qpdf --check`, and rasterizes via `pdftocairo` at 144 DPI. A filled-shape,
transformed parity fixture uses the unchanged native-reference comparator. The
existing reference suite additionally exercises paths, strokes, viewport modes,
nested viewports and root transforms; corruption controls remain unchanged.
The dynamic cost fixture independently retains exact node/PDF parity tests.

Initial attempts are not passes: building browser concurrently with showcase's
package rebuild stopped on a temporarily unavailable arithmetic output, so graphs
did not run. This was corrected by sequential build execution. The initial
parallel browser attempt had preview failures and a large native-reference raster
mismatch; after complete output builds, serialized execution passes. The browser
script now uses `--test-concurrency=1`, like showcase, to avoid overlapping
Chromium raster workers; no assertion or threshold was weakened. The initial new
raster fixture used overlapping colored/black antialiased cost shapes and exceeded
the calibrated foreground threshold despite exact PDF parity; the focused fixture
avoids that uncalibrated overlap. Existing raster/cost assertions are unchanged.
An initial showcase run timed out at 200 seconds after 52 passes (15 cancellations);
the full rerun with a 600-second allowance passed. Final lint also identified a
missing title in the new parity fixture; both equivalent sources now include it.

## Fresh bundled consumer measurements

Public browser ESM exports, esbuild, ES2022, whole-bundle gzip. Raw means bundled
without minification; minified and gzip use the minified bundle. Measurements
are fixture-specific costs, not timing benchmarks or additive module weights.
The ignored driver `artifacts/svg-only-costs.mjs` reads the **actual base** SVG
sources with `git show`, emits them in memory with the installed TypeScript, and
bundles them against unchanged built dependencies. No worktree is switched or
modified for the baseline. Current profiles use the built browser package exports,
not source aliases or Node facades. Base-only API comparisons use identical entry
code; red/blue XML render output has exact PDF-byte parity across revisions.

| Consumer | Revision | Raw | Minified | Gzip | Parsed / retained |
| --- | --- | ---: | ---: | ---: | ---: |
| Core render | base and SVG-only | 67,136 | 35,558 | 12,272 | 49 / 46 |
| Layout/createExtensions, no SVG | base and SVG-only | 303,312 | 155,454 | 49,709 | 183 / 149 |
| XML compileSVG export | base | 56,541 | 31,843 | 11,409 | 93 / 34 |
| XML compileSVG export | SVG-only | 58,211 | 32,620 | 11,723 | 94 / 35 |
| Dynamic XML compile/render | base | 115,422 | 62,769 | 21,650 | 93 / 70 |
| Dynamic XML compile/render | SVG-only | 117,105 | 63,546 | 21,980 | 94 / 71 |
| XML prepare/place/render | SVG-only | 117,110 | 63,546 | 21,991 | 103 / 71 |
| TSX prepare/place/render | SVG-only | 114,893 | 62,067 | 21,435 | 101 / 71 |
| Both preparation inputs | SVG-only | 123,883 | 67,453 | 23,116 | 105 / 75 |
| Layout helpers, no frontend | SVG-only | 248,299 | 127,053 | 41,003 | 218 / 125 |
| Layout + XML + adapters | SVG-only | 358,258 | 186,067 | 60,145 | 221 / 175 |

Core and no-SVG layout costs are unchanged. The XML render change is +777
minified / +330 gzip bytes. XML prepare/render is 556 gzip bytes larger than TSX
for this equivalent fixture. The helper closure excludes XML and structured/JSX
frontends. These measurements supersede mixed-proposal feature costs, not its
historical records; `docs/evidence/svg-merge-ready.md` was not extracted.

The distinct historical frozen source fixture remains pinned to
`21dcd483dcd84961a24f5823e95a586ea25dd534`, with normalized-map SHA-256
`d158acf0456357ebddb799d51d040d7128ae8b1d0d13eb531e7f6d505c0495d5`.
Its wrapper-based XML operation has different export code from the direct-export
actual-base row above; do not conflate their costs. See the fixture README and
`svg-baseline.ts` for provenance/integrity, preserved without changes.

## Code principles and handoff

- Correctness: feature, XML compatibility, packaging, graph and host gates pass.
- Cohesive files: production files stay at most 400 lines; functions at most
  49 lines and nesting at most three levels, checked by the AST gate.
- Comments explain ownership, invariants and runtime boundaries.
- Risk-based coverage: extracted authoring/adapter/negative/type/graph/baseline
  tests plus fresh PDF/raster and Node/Chromium parity. Numerical tests intentionally
  remain outside this extraction; none were weakened to pass.
- No new size/complexity exceptions. The narrow type-only module-scoped SVG JSX
  namespace suppression follows the documented core-runtime exception in
  `docs/code-quality.md`; no global ambient namespace is introduced.
- No Changesets setup exists (no configuration/dependency/scripts), so no
  changeset or new release infrastructure was added.

Implementation evidence is ready for independent Auditor review, not independent
verification. Audit the actual unstaged/untracked diff, verify shared architecture
and excluded files remain untouched, inspect current-base versus historical costs,
and confirm the optional-peer and native-placement contracts. Parent owns any
authorized delivery and tracker transition after audit.

## Bounded audit correction: XML diagnostic declaration compatibility

The independent Auditor returned **CHANGES_REQUESTED** for one medium must-fix:
making root `SVGDiagnostic.span` optional broke strict existing XML consumers,
both inferred `compileSVG` results and explicit `SVGCompilation` annotations.
The caller reported all other extraction scope passed independent audit, including
1,157 root tests, 44 targeted SVG tests, 14 packed closures, licenses, browser
build/graphs/15 tests, showcase build/7 targeted tests, inspection of the original
101 showcase tests, frozen-source integrity and actual-base costs. Those results
remain prior provenance, not correction-phase reruns.

Correction assignment retained the same worktree/branch/base/HEAD above and began
with 33 dirty tracked and 32 untracked files owned by the prior extraction. Only
the necessary audit correction was integrated, unstaged/uncommitted. Current scope
is 34 dirty tracked and 33 untracked files (individual fixture paths counted).
No other worktree, protected shared package, numerical policy, or mixed-JSX code
was edited; no Git delivery or tracker state was mutated.

- `SVGDiagnostic` again requires genuine `SourceSpan`; `SVGCompilation` again
  contains only those XML diagnostics. `compileSVG` exposes that legacy return
  contract via an overload: its XML parser supplies spans throughout CSS
  provenance. No span is invented and no new cast is used.
- Distinct `SVGPreparationDiagnostic` and `PreparedSVGCompilation` retain optional
  spans for the shared compiler, `PreparedSvg` and `compilePreparedSVG`. Both root
  and `/authoring` export these types alongside the unchanged XML type names.
  `/tree` and `/layout` retain warning rejection and need no export changes.
- New packed `svg-diagnostics-template.ts` proves inferred and explicitly annotated
  XML span slicing without guards under strict NodeNext **and** Bundler resolution,
  with optional layout absent/present. Negative assertions reject unguarded shared
  handle/result span access and assignment to the required-span XML types.
- One new runtime regression covers inline/stylesheet entity-derived XML warning
  spans, XML preparation equality, authentic structured diagnostic identity,
  span absence, exact frontend-specific paths and native painting parity.

Exact correction paths: `packages/svg/src/{types,index,authoring,prepared,compile,
css,style,inspect}.ts`, `packages/svg/test/authoring.test.ts`,
`scripts/consumer/svg-layout.ts`, `tests/consumer/types/svg-diagnostics-template.ts`,
`packages/svg/README.md`, `docs/svg-authoring.md`, and this evidence file.
Ignored local artifacts include the refreshed `svg-only-dirty-scope.txt` inventory
and `svg-only-diagnostic-runtime.mjs` emission proof.

| Correction command (same cwd) | Final outcome |
| --- | --- |
| `npm run typecheck` | pass, full workspace build and strict root typecheck |
| `npm run format:check && npm run lint` | pass, formatting/Biome/AST principles |
| `npm test` | pass, 1,158 tests (+1 runtime regression) |
| `npx tsx --test packages/svg/test/*.test.ts tests/consumer/svg-*.test.ts` | pass, 45 tests (+1) |
| `npx tsx --test packages/svg/test/*.test.ts tests/integration/optional-documentation.test.ts` | pass, 42 tests |
| `npm run test:consumer` | pass, 14 tarball closures, new positive/negative NodeNext/Bundler fixture |
| `node artifacts/svg-only-diagnostic-runtime.mjs` | pass, unchanged executable ESM/CJS emission in all eight corrected source modules |
| `git diff --check` | pass |

The emission proof replays the declaration-only correction against inspected
pre-correction source, transpiles with comments removed and compares executable
output. Combined SHA-256 is
`7f8f914c52a29aa8c6ced0f5d042426c0f3a8d95244c9ebc3940edf7aedcf708`.
The aggregate built JavaScript checksum changed: overload JSDoc is retained in
declarations but no longer emitted on the implementation. This is **not** a claim
of identical package bytes/maps. No executable production statement changed.
Browser/showcase/licenses/actual-base cost driver were not mechanically rerun for
this type-only correction; existing evidence above remains unchanged provenance.
Root/targeted tests did rerun SVG graph and frozen/dynamic cost assertions.
Correction output is captured in session tool results, not the original log files.

Initial correction checks were not passes: the added parity fixture first used
different XML/structured viewBoxes, then incorrectly assumed identical frontend
paths; both expectations were corrected without changing runtime behavior or
existing tests. A type JSDoc initially missed the existing documentation assertion's
exact phrase, and a fixture formatting check failed; final reruns above all pass.

Code-principles checklist: correctness and risk-based regression coverage pass;
cohesive production files remain under 400 lines, functions under 50 and nesting
at most three, enforced by lint; comments explain contracts/invariants; no new
exception. The existing module-local JSX namespace exception remains untouched.
Status: correction **implemented**, not independently verified. Issue #47 and
historical unmerged PR #68 remain unchanged. Auditor should recheck overload
soundness against XML CSS span provenance, packed inferred/annotated compatibility,
truthful span-optional prepared types and the exact correction scope before any
authorized delivery proceeds.
