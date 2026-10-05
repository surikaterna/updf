# Layout kernel — Slice A implementation evidence

## Scope and ownership

- Objective: one canonical host-neutral allocator, **used by production PDF layout
  and the terminal proof**, not an inert foundation or a complete layout engine.
- Issue: N/A (no issue ID assigned; no tracker mutations authorized).
- Worktree: `/home/sprawl/projects/updf/trees/layout-kernel`.
- Branch: `feature/layout-kernel`; base and unchanged HEAD:
  `0bf8812b6c02c9e7114b75db02468ca4fe6f6147`.
- Initially clean. All changes belong to this assignment, unstaged/uncommitted;
  no stage, commit, push, PR, tracker mutation or nested delegation.
- Owned changes: new kernel package/tests, layout allocator/type/numeric wrappers
  and dependency/build manifest, root build order/lock, formatting inventory,
  boundary/graph/license/consumer/size tooling, TUI imports/profiling/live tests,
  and this evidence. No core production changes. Formbar remains read-only.
- Explicitly **not changed**: core MetricSum, Row placement, box composition,
  pagination, table algorithms, styles, PageBreak, or Formbar bridge semantics.
  Slice B boxes and Slice C fragmentation remain pending separate assignments.

## Package contract and real migrations

Actual kernel manifest: private MIT ESM `@updf/layout-kernel@2.0.0-poc.0`,
`files: [dist, README.md, LICENSE]`, **no dependencies, peerDependencies,
optionalDependencies or devDependencies**. Explicit exports:

| Entry | Import | Types |
| --- | --- | --- |
| `.` | `./dist/index.js` | `./dist/index.d.ts` |
| `./numeric` | `./dist/numeric.js` | `./dist/numeric.d.ts` |

Root exports only `resolveWidths`, `LayoutInputError` and allocator/error types.
Numeric exports only the six existing binary64 primitives, with precise validated
nonnegative-finite preconditions. Kernel compilation/declaration consumers use
`lib: [ES2022]`, `types: []`; no DOM or Node ambient types are required.

The original resolver/distribution/input/types and binary64 arithmetic moved from
layout to focused kernel files. The resolver/distribution arithmetic and binary64
primitive are preserved, not copied into a parallel production implementation.
`layout/src/binary64.ts` forwards exclusively to the public numeric entry: axis,
stack and generated intervals retain the same implementation. Deleted input and
distribution modules have no remaining callers. Layout's build cleans its generated
`dist` before compilation, so prior-build copies cannot survive in a tarball.

Production `layout/src/width-resolver.ts` delegates to the kernel and translates
**only** `instanceof LayoutInputError` via core `fail`. It does not relabel arbitrary
exceptions or replace an existing `DocumentError`. All legacy diagnostic codes,
paths and messages are preserved. Width types reexport from the public package.
Layout depends explicitly on core + kernel, and tables receives kernel transitively.
Core remains independent of kernel.

Kernel validation is limited to allocator input: ordinary data records, allowed
own keys, enumerable data descriptors, dense ordinary arrays, finite geometry,
and track count budget before entry inspection. Categories are TYPE, KEY, VALUE,
LIMIT and GEOMETRY. Records are consumed from a null-prototype snapshot of the
validated own data descriptors, never ordinary reads on caller records. Inherited
optional fields are absent (defaults apply); missing own required fields retain
their ordinary structured field errors. Getters are never invoked. Proxy traps remain arbitrary host
code, propagate unchanged, and are **not** claimed to be CPU-sandboxed.

The TUI intervals module imports the public kernel and `/numeric`; the proof
bundler source-aliases only those public entries using paths relative to its own
file. The allocator profile uses a public consumer entry. No current proof imports
private uPDF entrypoints. Historical `--baseline` profiling reads only immutable
Git blobs at the base revision; it does not ship a second allocator.

## Before/after behavioral oracle

Before moving code, ran `npm ci --ignore-scripts`, `npm run build`, `npm test`
(627/627), then `npx tsx scripts/layout-kernel-oracle.ts` against the original layout
resolver. The deterministic seed `0x51ceab` produces **3,000** results/errors across
fixed tracks, bounded weighted shares, gaps, clamps, subnormals, extreme scales,
invalid counts/keys/types/geometry, explicit undefined and getter rejection.
Getters throw a sentinel if ever executed. Only outputs/diagnostic triples are
digested; there is no reference allocator shipped alongside the moved algorithm.

Original, kernel and production wrapper all match:

`b298210b2436d5f829f2713bfa5fd5bae1fbcfdc6e8769330a4d26de1b57cb74`

`packages/layout-kernel/test/allocator.test.ts` checks that fixed digest for both
kernel and production wrapper, plus runtime validation, frozen results, primitive
boundaries, exact diagnostic translation, count-before-descriptor ordering and
unchanged arbitrary-host/DocumentError identity. New graph tests check the manifest,
license, ES-only config/declarations and neutral public allocator/numeric bundle.

`npx tsx scripts/layout-kernel-baseline.ts` was run before and after migration in
the same Node/environment. It bundles a public core-only text consumer, reports
the complete resolved emitted-JS input graph, and hashes real PDFs:

| Measurement | Before = after |
| --- | --- |
| Core text bundle raw / gzip | 39,516 / 13,984 bytes |
| Core text bundle SHA-256 | `00664c963c61a7017a1fdbadcafc3c6564df43814223b5fc1344621c2e751b21` |
| Core text PDF SHA-256 | `07175eea062e0b7e4ce412840d86ad6d65a51faa6e6a081bc4ee8a0d1056ee6a` |
| Fixed CMR SHA-256 | `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22` |
| Production Row geometry PDF SHA-256 | `83c3e00d2ed01e1d26721c315b6ae35a9346da3cd97f6ee89af8f7bc09f60a2e` |
| Sample freight PDF SHA-256 | `fb0e28599369c2eccd401bd236fadcb0399de3480385e2e80fde56014381c58c` |

The core input graph is identical: `<stdin>` and exclusively `packages/core/dist`
modules (no layout/kernel). `git diff --name-only -- packages/core` is empty.
Row bytes come from the real integration test's regenerated `geometry.pdf`, not
a synthetic allocator fixture. CMR and freight are rendered by the baseline script.

## Live terminal and byte profile

Pinned clean read-only Formbar root `/home/sprawl/projects/formbar`, revision
`4fc67c225ef9af80dd2345852df3b884e62656eb`. No install, build or edits there.
Both before and after:

```sh
FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown
FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs
FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs
```

All four literal hidden/shown × 32/80 bodies retain exact output and source order.
The baseline full suite already passed the independent exact field-projection
characterization at every width 24–160 (137 widths). The added live test checks the
same literal rounding characterization for both real states (274 projections),
including capped trailing slack and the full-width footer. Live tests: 4/4 passed
(baseline had the three original live tests).

Profile results (esbuild minified ESM, gzip via Node zlib, bytes not KiB):

| Scope | Before raw / gzip | After raw / gzip | Resolved before → after | Retained before → after |
| --- | --- | --- | --- | --- |
| Allocator | 5,428 / 2,355 | 4,553 / 1,975 | 53 → 8 | 12 → 6 |
| Formbar bridge | 198,549 / 58,329 | 198,549 / 58,329 | 224 → 224 | 120 → 120 |
| Terminal adapter | 9,051 / 3,783 | 8,138 / 3,398 | 56 → 11 | 15 → 9 |
| Combined runtime CLI | 208,177 / 61,969 | 207,289 / 61,591 | 281 → 236 | 136 → 130 |
| Separate bundling bootstrap | 2,349 / 1,234 | 3,082 / 1,554 | tooling only | tooling only |

The bootstrap grows because it now supports reproducible historical profiling.
The pre-move profile was captured before migration; `profile.mjs --baseline`
reproduces its exact raw/gzip sizes from immutable Git blobs, also retaining full
bundle/gzip/metafile artifacts. Current profiling asserts both **resolved source**
and **positive bytesInOutput** absence of all uPDF core/layout/fontkit modules,
with positive kernel allocator bytes controls. The old retained font-check (41 B),
VDOM (102 B), and painting (36/30 B) initializers are absent from the current graph.

Generated evidence (ignored, reproducible, available in this worktree):
`artifacts/layout-kernel-a/{baseline-profile,profile}/report.json` and each scope's
`bundle.mjs`, `bundle.mjs.gz`, `metafile.json`. The neutral emitted public consumer
has separate `standalone/` artifacts: **4,575 raw / 1,991 gzip**, no externals, with
both allocator and numeric positive retained controls. Run
`npx tsx scripts/kernel-profile.ts` to reproduce it without Formbar.

The Formbar bridge still uses app-private compiler/install modules; it is not
advertised as a reusable public Formbar bridge. Its existing external dependencies
remain external, **excluded** from runtime bundle size: `@scheman/core@2.0.0`,
`ajv-formats@3.0.1`, `ajv@8.20.0`, `kuery@2.1.1`, `@kalada/core@0.6.0`,
`@kalada/syntax@0.1.0`, `@kalada/provider-routing@0.1.0`, `@arbitre/core@0.3.1`,
`react@19.2.6`. Their resolved paths/import kinds and installed versions are
retained in both profile reports. Node/esbuild bootstrap dependencies are separately
disclosed. Bundle size is **not heap usage**; no memory claim or arbitrary cap is made.

## Packed closure and validation gates

`npm run test:consumer` packs/registers core then kernel then layout then tables;
the clean layout install includes explicit core+kernel tarballs, and tables includes
the transitive kernel tarball in the same root install. **Eight closures pass**:
kernel-only, core-only, layout, tables, geometry, SVG/tree, Fontkit absent/present,
legacy. Core-only installs assert kernel absence; installed core graphs also reject
kernel leakage. The standalone kernel closure installs only its tarball and checks
NodeNext and Bundler with `types: []`, `lib: [ES2022]`, runtime allocation/numeric
entrypoints, error identity, and private/nonexistent subpath rejection. Kernel-only
installed graphs contain only kernel modules; no React, fonts, core or layout.

Environment caveat: `/tmp/opencode/node_modules` already contains unrelated React.
The standalone proof first asserts physical absence in its own install and seals
runtime resolution against unrelated ancestor node_modules before importing the
kernel. Thus negative import checks cannot silently use shared temporary packages;
no ancestor install is modified. This is a test harness fence, not kernel code.

| Exact command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts` | Baseline pass, assigned worktree only |
| `npm install --ignore-scripts --no-audit --no-fund` | Added one workspace link; lock delta only kernel + layout edge |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, Biome + code-principles ESLint; kernel added to authoritative Biome inventory |
| `npm run typecheck` | Pass, including ordered package build |
| `npm test` | 636/636 pass after own-property audit fix: baseline 627 + nine new risk-based tests |
| `npm run test:consumer` | Eight tarball closures pass |
| `npm run check:licenses` | All eight package tarballs pass; kernel 39 files, layout 387; no moved input/distribution in layout tarball |
| `npm run build:browser` | All 12 builds pass; existing optional font-demo large-chunk warning only |
| `npm run check:graphs` | All 12 graphs pass; core excludes kernel, production flow/tables include kernel |
| `npm run sizes` | Pass after generating the existing required PDF artifacts; kernel included |
| `npm run build:showcase` | Pass with new build order |
| `npm run test:browser` | 10/10 actual Chromium/Node runtime/raster tests pass |
| `npm run test:showcase` | 56/56 pass with 240s tool timeout; earlier 120s combined build/test invocation timed out after 53 passes, not waived |
| `git diff --check` | Pass |

Size prerequisites executed unchanged:
`node apps/node/dist/cli.js artifacts/cmr.pdf`,
`node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf`,
`node apps/node/dist/font-proof.js`, `node apps/node/dist/painting-proof.js`,
`node apps/node/dist/svg-proof.js`. An initial sizes invocation lacked those existing
artifacts; rerun passed after generating them. An initial graph assertion matched
the worktree name rather than the package path; it was corrected and rerun passed.

No claim that historical counts “152” or “50” describe this checkout: actual current
showcase/browser counts are reported above. Tests and production optional behavior
were not weakened to achieve those counts. No Changeset: this project does not use
Changesets. No publishing/delivery is authorized.

## Code-principles self-check / audit handoff

### Bounded own-property audit fix

Issue N/A; same cwd, branch and base/HEAD as above. All pre-existing Slice A work
was preserved. This follow-up changed exactly these seven files (relative to its
received dirty state), with no core production edits:

- `packages/layout-kernel/src/width-validation.ts`
- `packages/layout-kernel/src/width-input.ts`
- `packages/layout-kernel/README.md`
- `packages/layout-kernel/test/own-properties.test.ts` (new)
- `scripts/consumer/kernel-own-properties.ts` (new)
- `scripts/consumer/kernel.ts`
- `docs/evidence/layout-kernel-a.md`

The shared regression runs in isolated child processes, both against the packed
kernel and against the workspace kernel/production DocumentError shim. Each child
restores Object.prototype descriptors in `finally`. It tests inherited data values,
returning getters and throwing getters for all required and optional record fields;
required fields produce exact code/path/message triples, optional fields match the
absent/default result, and own accessors reject without evaluation. Getter reads
remain zero. Arbitrary proxy-thrown errors still retain identity in both resolvers.
The 3,000-case oracle digest remains exactly the value above; no oracle weakened or
updated. The inherited-invalid contract correction is intentional, not pre-move parity.

Fresh checks in this audit-fix assignment:

| Exact command | Outcome |
| --- | --- |
| `npm run typecheck` | Pass, full ordered package build + root TypeScript |
| `npx tsx --test packages/layout-kernel/test/*.test.ts packages/layout/test/width-resolver.test.ts` | 17/17 pass, including both 3,000-case digests |
| `npm run format:check` | Pass on rerun; initial signature formatting failure fixed |
| `npm run lint` | Pass, Biome + code-principles ESLint |
| `npm test` | 636/636 pass, including regenerated real Row geometry PDF and raster checks |
| `npm run test:consumer` | Eight fresh packed closures pass, including isolated own-property probe |
| `npm run check:licenses` | Eight fresh tarballs pass (kernel 39 files, layout 387) |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs` | 4/4 pass, both real states at all 137 widths |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs` | Pass at prior-fix sizes; current table refreshed by SECONDprotoauditfix below; no resolved/retained PDF/font/VDOM leak |
| `npx tsx scripts/kernel-profile.ts` | Pass; 4,564 / 1,995 raw/gzip, no externals or forbidden inputs |
| `npx tsx scripts/layout-kernel-baseline.ts` | Pass; all core text/PDF/CMR/Row/freight hashes above unchanged |
| `npm run build:browser` | All 12 fresh builds pass; same optional font-demo chunk-size warning |
| `npm run check:graphs` | All 12 fresh graphs pass |
| `npm run sizes` | Pass; kernel source 12,323 bytes, standalone 4,564 / 1,995 bytes |
| `git diff --check` | Pass |
| `git diff --name-only -- packages/core` | Empty |
| `git -C /home/sprawl/projects/formbar status --short` | Empty; pinned HEAD still `4fc67c225ef9af80dd2345852df3b884e62656eb` |

Browser 10/10 and showcase 56/56 runtime results above are prior Auditor evidence,
reused as authorized, not claimed rerun here. No browser/showcase or core code was
changed; fresh browser graphs, live proof, full real-PDF tests and identical Row
PDF hash cover the modified allocator's actual production path. No async checks
remain running. No approved code-principles exceptions; no Changeset applicable.

### Exact delivery manifest

No committed or staged changes. Current delivery is **21 tracked unstaged paths**
(19 modified, two deleted) and **24 untracked files**, all owned by Slice A; ignored
build/profile/PDF artifacts are generated evidence, not delivery files. No other
worktree or tailnet configuration was changed.

Tracked unstaged (M unless marked D):

```text
biome.json
package-lock.json
package.json
packages/layout/package.json
packages/layout/src/binary64.ts
packages/layout/src/width-distribution.ts (D)
packages/layout/src/width-input.ts (D)
packages/layout/src/width-resolver.ts
packages/layout/src/width-types.ts
scripts/boundaries.ts
scripts/check-licenses.ts
scripts/consumer/graphs.ts
scripts/graph-check.ts
scripts/packed-consumer.ts
scripts/sizes.ts
scripts/tui-layout-proof/bundle.mjs
scripts/tui-layout-proof/intervals.ts
scripts/tui-layout-proof/live.test.mjs
scripts/tui-layout-proof/profile.mjs
tests/consumer/declarations.test.ts
tests/integration/boundaries.test.ts
```

Untracked:

```text
docs/evidence/layout-kernel-a.md
packages/layout-kernel/LICENSE
packages/layout-kernel/README.md
packages/layout-kernel/package.json
packages/layout-kernel/src/binary64.ts
packages/layout-kernel/src/error.ts
packages/layout-kernel/src/index.ts
packages/layout-kernel/src/numeric.ts
packages/layout-kernel/src/width-distribution.ts
packages/layout-kernel/src/width-input.ts
packages/layout-kernel/src/width-resolver.ts
packages/layout-kernel/src/width-types.ts
packages/layout-kernel/src/width-validation.ts
packages/layout-kernel/test/allocator.test.ts
packages/layout-kernel/test/graph.test.ts
packages/layout-kernel/test/own-properties.test.ts
packages/layout-kernel/tsconfig.json
scripts/consumer/kernel-own-properties.ts
scripts/consumer/kernel.ts
scripts/kernel-profile.ts
scripts/layout-kernel-baseline.ts
scripts/layout-kernel-oracle.ts
scripts/tui-layout-proof/allocator.ts
tests/consumer/types/kernel-template.ts
```

- Correctness: exact oracle, production PDF bytes, live TUI and packed consumer checks.
- Defaults: no unsafe fallback/relabeling, no ambient/runtime dependency added.
- Cohesion/size: new production files each have one responsibility and are under
  400 lines; new/changed functions under 50 lines, nesting at most three levels.
- Comments explain invariants/preconditions/historical evidence or negative type
  tests, not routine mechanics. No approved principle exceptions required.
- Risk-based tests added for extraction parity, strict validation/error boundaries,
  numeric extremes, packaging/declaration/graph isolation and all live TUI widths.
- Formatting/lint/typecheck/tests pass; no required gate remains waived.

Status: **implemented, ready for independent audit**, not verified. Auditor should
review the entire unstaged/untracked delivery against this base, confirm no parallel
allocator survives in source or tarballs, independently inspect error compatibility,
public TUI alias/graph fences and the standalone packed closure, then decide audit
status. Integration/delivery remain owned by the parent; B/C are not part of A.

### SECONDprotoauditfix — array descriptor follow-up

Issue N/A; exact cwd/branch/base/HEAD remain as recorded above. Received and
preserved 21 tracked dirty paths and 24 untracked files owned by Slice A. This
bounded follow-up changes exactly three existing delivery files:

- `packages/layout-kernel/src/width-validation.ts`
- `scripts/consumer/kernel-own-properties.ts`
- `docs/evidence/layout-kernel-a.md`

Array element descriptors now require an **own** `value`, matching record
validation. Inspection of all new kernel source found no other descriptor guards;
the `in` checks in width-input operate on validated null-prototype snapshots.
No core validation, allocation arithmetic, shim, or proxy-error handling changed.

Red evidence: before rebuilding the fixed guard, an isolated `npx tsx --eval`
probe injected result logging into the shared runtime and executed it against the
existing workspace kernel dist. Returning array accessor: accepted, reads **1**;
throwing array accessor: raw sentinel escaped, reads **1**. Both corresponding
over-budget cases already returned LIMIT with reads **0**. The probe exited 1
on the zero-read assertion, as expected; no diagnostic oracle was updated.

The extended shared helper now exercises both accessor variants with inherited
`Object.prototype.value`, exact TYPE `/widths/tracks/0` / `Dense enumerable data
arrays only`, LIMIT-before-entry behavior, and legitimate own data descriptors.
It runs against workspace kernel, production DocumentError shim, and packed kernel.
It creates null-prototype accessor descriptors, restores pollution in `finally`,
and performs assertions/test-runtime reporting only after restoration. Zero reads
are required; the existing arbitrary proxy-sentinel identity probes remain intact.
Monkeypatched intrinsics and CPU-sandboxing arbitrary host/proxy code are not promised.

Fresh gates for this follow-up (all pass unless explicitly identified as red):

| Exact command | Outcome |
| --- | --- |
| `npm run typecheck` | Full ordered build + root TypeScript pass |
| `npx tsx --test packages/layout-kernel/test/*.test.ts packages/layout/test/width-resolver.test.ts` | 17/17; unchanged 3,000-case oracle for kernel/shim |
| `npm run format:check`; `npm run lint` | Pass; Biome and code-principles ESLint |
| `npm test` | 636/636; real native PDF/raster regressions included |
| `npm run test:consumer`; `npm run check:licenses` | Eight fresh closures and eight licensed tarballs |
| `npm run build:browser`; `npm run check:graphs` | All 12 builds/graphs; existing optional font-demo chunk warning only |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs` | 4/4, 274 live width/state projections |
| `FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs` | Refreshed current table above; zero resolved/retained PDF/font/VDOM leaks |
| `npx tsx scripts/kernel-profile.ts`; `npm run sizes` | 4,575 / 1,991 bytes; kernel source 12,334 bytes |
| `npx tsx scripts/layout-kernel-baseline.ts` | All bundle/native PDF hashes above unchanged |
| `git diff --check`; `git diff --name-only -- packages/core` | Pass; core diff empty |
| `git -C /home/sprawl/projects/formbar status --short`; `git -C /home/sprawl/projects/formbar rev-parse HEAD` | Clean; unchanged pinned revision |

Code-principles checklist: correctness, defaults, cohesive files, function/file size,
nesting, intent-only comments, proportional regression tests and gates all satisfied;
no approved exceptions or Changeset applicable. All acceptance items complete; no
running checks, staged/committed changes, tracker mutations, or added delivery files.
Status: **implemented**, not independently verified. Auditor should review this
three-file delta and independently confirm polluted array rejection/zero reads in
workspace/shim/packed consumers. Parent retains integration and delivery ownership.
