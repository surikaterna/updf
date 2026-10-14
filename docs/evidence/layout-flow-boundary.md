# Layout flow boundary: S3/S4 extraction evidence

Issue: N/A (authorized internal extraction). S3 and S4 each received independent
**PASS**. This report finalizes their combined PR scope; the final documentation
and delivery manifest still require independent review. No numerical fix, public
API, package extraction or optimized-speed claim is included.

## Revision and delivery ownership

- Worktree: `/home/sprawl/projects/updf/trees/layout-flow-boundary`.
- Branch: `feature/layout-flow-boundary`.
- Base/HEAD: `c48b5a3032b31dbf45f5024934fd49071ab6a30b`.
- Measurements describe that base plus uncommitted source, not a delivery commit.
- PR preparation owns only the two documents below. All existing production,
  frozen S2 tests and boundary/model tests are preserved byte-for-byte.
- No stage, commit, push, PR or tracker mutation in this preparation. Parent
  delivery follows final audit. PR 68 and its unmerged work remain untouched;
  this extraction does not reuse issue 47 or claim that different work.

## Exact intended PR paths

The following 23 paths are the entire extraction delivery, including untracked
files. The three host source files are modified; the other 20 paths are new.

```text
docs/architecture/layout-flow-boundary.md
docs/evidence/layout-flow-boundary.md
packages/layout/src/fragment-state.ts
packages/layout/src/protocol-runtime.ts
packages/layout/src/stack.ts
packages/layout/src/flow-runtime/protocol.ts
packages/layout/src/flow-runtime/runtime.ts
packages/layout/src/flow-runtime/fragment-state.ts
packages/layout/src/flow-composition/stack-model.ts
packages/layout/test/flow-runtime-fixtures.ts
packages/layout/test/flow-runtime-host-fixtures.ts
packages/layout/test/flow-runtime-host-output.test.ts
packages/layout/test/flow-runtime-host-state.test.ts
packages/layout/test/flow-runtime-interpreters.test.ts
packages/layout/test/flow-runtime-provenance.ts
packages/layout/test/flow-runtime-state.test.ts
packages/layout/test/stack-model.test.ts
tests/fixtures/layout-flow-native-free.ts
tests/fixtures/layout-stack-model-native-free.ts
tests/integration/layout-flow-boundary-helpers.ts
tests/integration/layout-flow-boundary.test.ts
tests/integration/layout-flow-host-witness.ts
tests/integration/layout-stack-model-boundary.test.ts
```

Explicitly excluded: all 13 TypeScript files under
`tests/experiments/stack-selector-contract/` and
`docs/evidence/stack-selector-contract-experiment.md`. Those files remain locally
untracked and untouched; dirty worktree state is not the PR manifest. Generated
build outputs, logs, local JSON captures and measurement drivers are not shipped.
The final local manifest `/tmp/opencode/updf-extraction-final.json` records each
intended path's SHA-256 separately from excluded paths; it is handoff provenance,
not a fresh-clone requirement or a Git commit identifier.

## Portable validation

After installing the lockfile dependencies with Node >=24 (`npm ci`), run from
the repository root. These commands do not require historical local captures or
the excluded experiment:

```sh
npm run format:check
npm run lint
npm run typecheck
npx tsx --test packages/layout/test/flow-runtime-*.test.ts
npx tsx --test packages/layout/test/stack-model.test.ts
npx tsx --test tests/integration/layout-flow-boundary.test.ts tests/integration/layout-stack-model-boundary.test.ts
npm test
npm run test:consumer
npm run build:browser
npm run check:graphs
npm run test:browser
git diff --check
```

Browser tests require the repository's Playwright/browser prerequisites. Normal
frozen-test execution uses source assertions, including expected traces and PDF
hashes. `FLOW_RUNTIME_BASELINE` is optional capture output, never required input.
The unchanged provenance writer intentionally retains its historical S2 objective
string; an after-extraction capture does not replace the frozen baseline.

## Independent proof and risk coverage

S3 independent audit passed 1,188 root tests, 22 frozen tests, 8 boundary tests,
14 clean external consumer closures and 15 browser tests (6 affected browser
checks in the Auditor's subset). S4 independent audit passed 1,205 root tests,
22 frozen tests, 10 model tests, 15 boundary tests, 14 consumer closures and 15
browser tests, plus format/lint/typecheck and code principles. The S4 Auditor
also proved 3,240 model cases and checked 1,399 protected hashes.

The seven frozen S2 files and full captured evidence are identical between
historical S2, S3 independent audit and S4 independent audit. Local archival
artifacts are `/tmp/opencode/updf-flow-runtime-s2-final.json`,
`/tmp/opencode/updf-flow-runtime-s3-independent-audit.json`, and
`/tmp/opencode/updf-s4-independent-frozen.json`. Full decoded PDF/trace capture
and the historical protected-source manifest are archival provenance, not a
portable gate; no huge manifest or PDF base64 is embedded here.

Of 493 base protected source paths, only `fragment-state.ts`,
`protocol-runtime.ts` and `stack.ts` changed. New runtime modules retained their
S3 bytes throughout S4. The host stack selection body from `function locate`
onward remains byte-identical to base. The generic model preserves the original
body after type generalization, operation order, summation, callback arguments,
thrown identity and allocations; no per-child allocation was added. Git base
source and the delivered new modules provide durable source-comparison evidence.

Frozen tests cover interpreter dispatch/receiver/reference/error identity,
copy-on-write continuation state, candidate budget/state publication, deep and
zero-height progress, actual versus natural atomic height, native output,
placements and PDFs. Ten model tests cover bounds, controls/gaps, fractions,
wide/subnormal magnitudes, `+42`, callback/error ordering and identity, custom
children and host binding identity. Fifteen boundary checks prove strict ES2022
compilation with `types: []`, `skipLibCheck: false`, emitted declarations and
executed generic consumers. Source, JS and declaration closures are checked
separately; compilation-first negative controls cover erased/type-only imports,
direct/transitive runtime leaks, import expressions and re-exports. S3 permits
only ES dependencies; S4 additionally permits the actual arithmetic entry, not
the whole kernel. Host compile witnesses use structural types without casts.

### Historical caveats retained

The initial S3 harness rejected TypeScript's standard `lib.decorators*`; its ES
allowlist was corrected without allowing DOM/Node/host imports. S4's original
host characterization assertion initially expected blank 0.5 to yield capacity
0.5 rather than the existing fallback 1. The corrected original-body host rerun
passed retrospectively after extraction, not as a pre-move passing capture.
Test-only exact-optional/unchecked-index errors were corrected without widening
production types. An initial S4 browser run had one SVG-only raster failure
(14 pass); its cause was not established. Unchanged full reruns and independent
audit passed 15/15, and layout was absent from the SVG-only graph. These facts
do not establish a diagnosis or authorize a raster-test waiver.

## Historical controlled cost measurements (not performance benchmarks)

Node 24.21.0 / esbuild 0.28.2. Layout consumer input:
`import { layout } from "@updf/layout"; globalThis.layout = layout;`.
Both arms use TS stdin, the same resolve directory, `bundle: true`, `minify:
true`, `target: "es2022"`, `platform: "browser"`, `conditions: ["browser"]`,
`format: "esm"`, `metafile: true`, `write: false`; gzip is measured on the
minified output. The S3 comparison substitutes only the two base host bodies
from Git in memory, transpiled ES2022/ESNext; the S4 layout pair uses fresh
before/after builds. No source worktree is rewritten.

| Profile | Before minified / gzip | After minified / gzip | Delta |
| --- | ---: | ---: | ---: |
| S2 → S3 layout consumer | 155,202 / 49,641 | 155,266 / 49,660 | +64 / +19 |
| S3 → S4 layout consumer | 155,266 / 49,660 | 155,324 / 49,690 | +58 / +30 |
| S2 → S4 cumulative | 155,202 / 49,641 | 155,324 / 49,690 | +122 / +49 |
| S4 core-only Vite | 46,547 / 13,833 | 46,547 / 13,833 | 0 / 0 |
| S4 no-SVG flow Vite | 210,420 / 58,011 | 210,528 / 58,054 | +108 / +43 |
| Direct generic model witness | N/A | 1,208 / 646 | New consumer |

Local provenance: `updf-s3-bundle-pair.json`,
`updf-s4-{before,after}-profile.json`, and `updf-s4-vite-pair.json` under
`/tmp/opencode/`. Vite pre-edit graphs/builds were captured but exact output byte
counts were missed by the initial driver. Vite sizes above are a retrospective
no-write pair using unchanged core/flow configs and a hash-matched original
stack body; module lists match captured before/after graphs. They are **not**
physical pre-edit byte captures. Independent audit accepted the disclosed proof.
These drivers are local historical provenance, not shipped reproducible tooling.

Core has no layout/non-arithmetic kernel; no-SVG flow has no SVG/parser, tables,
Node facades or built-ins. The model witness reaches only its consumer, model
and arithmetic implementation. Positive deltas buy internal seams, not size
savings. S4 production accounting was 70 added/42 removed (net +28), including
the 60-line model; no installed-size or speed benefit is claimed.

The later rejected selector cursor removed 0 dependencies, increased statements
38 → 51 and branches 17 → 21. Historical paired Node/CommonJS profiles grew
native-free +332 minified/+113 gzip bytes and PDF witness +389/+165. That is a
different profile, not comparable to the S3/S4 browser totals. Independent
NO-GO means the prototype/harness is excluded, not a production rollback.

## Final preparation gates and code principles

Final preparation ran the following commands serially in the worktree above,
on the unchanged HEAD plus the manifest scope. Format/lint/typecheck scan the
whole local workspace (including the preserved excluded TypeScript files); root
test globs do not execute that experiment. No runtime/import depends on it.

| Exact command | Final outcome | Local log suffix |
| --- | --- | --- |
| `npm run format:check` | PASS, no fixes | `format` |
| `npm run lint` | PASS, including strict AST principles | `lint` |
| `npm run typecheck` | PASS, full build/workspace checks | `typecheck` |
| `npm test` | 1,205 pass, 0 fail, 0 skipped | `test` |
| `npx tsx --test packages/layout/test/flow-runtime-*.test.ts` | 22 pass, 0 fail | `frozen` |
| `npx tsx --test packages/layout/test/stack-model.test.ts` | 10 pass, 0 fail | `model` |
| `npx tsx --test tests/integration/layout-flow-boundary.test.ts tests/integration/layout-stack-model-boundary.test.ts` | 15 pass, 0 fail | `boundary` |
| `npm run test:consumer` | 14 clean external tarball closures pass | `consumer` |
| `git diff --check` | PASS | No log |

Local logs use `/tmp/opencode/updf-extraction-<suffix>.log`; their absence on a
fresh clone does not prevent running any gate. Final manifest hashes prove all
non-document delivery files and all excluded files match preparation entry.
Browser build/graphs/tests reuse unchanged
S4 independent PASS provenance: this preparation changes docs only and verifies
production/test hashes, rather than claiming a fresh browser rerun.

Correctness and risk coverage, cohesive files ≤400 lines, functions ≤49 lines,
nesting ≤3 and intent-only comments passed independent audit and remain covered
by the strict gate. No approved or requested code-principles exception. No new
runtime tests are needed for documentation finalization; the delivered frozen,
model and boundary suites cover the extraction's risks without softened
assertions. No Changeset: this repository does not use Changesets, and no package
or public API change is made. Further extraction, numerical implementation and
delivery are outside this assignment. Auditor should review the final 23-path
manifest, documents and actual unstaged/untracked scope before parent delivery.
