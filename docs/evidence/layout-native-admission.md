# Direct FixedBlock native admission evidence

## Current delivery and provenance addendum

The sections below preserve the **historical implementation-stage record**.
Changes were subsequently committed as `c61d0dd4`.
The [PR86 delivery report](https://github.com/surikaterna/updf/pull/86) records
independent audit **PASS** for the hash-matched sixteen-file delivery scope;
pending/unstaged wording below describes the earlier handoff.
[CI run 38811898718](https://github.com/surikaterna/updf/actions/runs/38811898718)
passed at `c61d0dd`.

The completion section below records gates and self-checks, not an independent
audit pass. This addendum attributes that pass to the PR86 delivery report; it
does not freshly re-certify standalone `c61d0dd4` or apply the later integrated
`133c519` audit to it. Historical measurements, hashes and handoff wording are
preserved, not rewritten as if already committed when measured.

## Historical delivery identity and limits

Ad-hoc issue: N/A. Worktree:
`/home/sprawl/projects/updf/trees/layout-native-admission`, branch
`feature/layout-native-admission`, base/HEAD
`c48b5a3032b31dbf45f5024934fd49071ab6a30b`. The worktree was clean before
implementation. All delivery files are unstaged modifications or untracked new
files owned by this assignment; no stage, commit, tracker or delivery mutation.

Production scope is geometry's additive existing-subpath helper, the host axis
reexport, final built-in fixed identity registration and paginator admission plus
accepted-coordinate reuse. No arithmetic, protocol, public content fields,
compiler/container/Row, SVG, budget or emission implementation changes.
The necessary accepted-coordinate reuse overlaps the concern of separate PR85;
neither PR85 nor PR84 was cherry-picked or used as a base. Integration of those
separate branches remains the parent's responsibility. See
[content roles](../architecture/layout-content-roles.md) for the implemented
direct-only contract and deferred nested/SVG limitations.

## Paired behavior: measured before editing, then after

Empty-child positive fixed blocks, 100-point page width, zero side/bottom margins:

| Heights | Body height / origin | Base | Current |
| --- | --- | --- | --- |
| 4.9, 0.1 | 5 / 0 | 1 page | identical coordinates, 1 page |
| 1.2, 1.1 | 2.3 / 0 | 1 page | identical coordinates, 1 page |
| 0.1, 0.2 | 0.3 / 0 | GEOMETRY `/body/1`, native endpoint | 2 pages, second y=0 |
| 10.3, 10.3, 10.3 | 30.9 / 0 | GEOMETRY `/body/2`, native endpoint | 2 pages, third y=0 |
| 0.1, 0.2 | 0.3 / 10 | 1 page | identical y=10,10.1 |
| 10.3, 10.3, 10.3 | 30.9 / 700 | 1 page | identical y=700,710.3,720.6 |
| 0.9999999999999999, 1e-17 | 1 / 0 | 1 page | identical coordinates, 1 page |
| 1.2, 1.1, 0.1 | 10 / 1 | GEOMETRY `/body/2`, overlap | 2 pages, y=1,2.2,1 |

The overlap refusal is real native association: the previous bottom is
`(1 + 1.2) + 1.1`, whereas the third origin is `1 + compensated(1.2, 1.1)`.
No certificate or tolerance was relaxed. These are not SVG false-deferral fixes.
Fresh metric oversized remains LAYOUT_OVERSIZED. A fresh height
`1 + Number.EPSILON` in height 1 is metric-admitted but fails the original exact
GEOMETRY/path/message without retry. Zero authored fixed height still rejects.

## Risk-based tests

- `packages/layout-boxes/test/geometry.test.ts`: shared throwing/nonthrowing
  certificate, exact diagnostic, nonfinite values, existing negative-domain
  behavior, translated endpoints and tiny remainder.
- `packages/layout/test/fixed-admission.test.ts`: direct recovery and unchanged
  fits, native endpoint/non-overlap assertions, fresh diagnostics, fixed identity
  reuse and copy refusal, wrapper/spacer exclusion, unknown atomic actual versus
  natural height, zero-height non-fixed placement and page controls.
- `packages/layout/test/fixed-admission-effects.test.ts`: candidate-local state
  and output-budget discard, unchanged source offset, one accepted paint,
  node/text/command/work reservation errors before native admission, malformed
  progress/height errors, recovery page quota and paint exception identity with
  no retry/publication. Synthetic privately registered producers exercise these
  paginator effect boundaries; production registration remains built-in-only.
- Shared `tests/fixtures/fixed-admission.ts` drives seven nonempty native-rect
  PDFs. Integration runs real `qpdf --check`, `qpdf --show-npages`, `pdftoppm -r 72`
  and native placement assertions. Chromium independently executes the same
  fixture and compares full placements/documents and every PDF byte with Node.
  Rasterization checks successful rendering, not a new pixel-level ink oracle.
- `packages/layout/test/fixed-admission-recipe.test.ts`: public adapter
  `measureContent` creates an actual owned `Block.Header` recipe, whose measured
  nodes travel through the real built-in fixed producer. The internal host
  harness (not a new public contract) demonstrates metric selection at occupied
  height 0.1 with candidate height 0.2/body 0.3, while the native endpoint exceeds
  0.3. Recovery accepts page index 1, source `/body/1`, range `[0,1)`, y=0.
  The callback remains uncalled through measurement, selection and accepted
  paint: this recipe's actual lifecycle executes at sealed finalization, not
  paint. It then executes exactly once with document/flow page 2 of 2 and fragment
  index 0/count 1/first+last. Native validation, qpdf checking/page count and
  rasterization of the accepted page pass. No private producer registration or
  synthetic recipe substitutes for this proof.
- Existing fixed-emission transport, JPEG/resources, renderer, Row, decorations,
  auto-margin, exact-width/progress/source-path and quota regressions also pass
  within the full suite.
- Packed kernel consumer runtime minimally imports the helper through ESM and
  CJS on the existing geometry subpath. The completion run passes all fourteen
  clean closures (see the environment and provenance below).

## Cost method and results

Node v24.21.0; installed lockfile dependencies via `npm ci`. A temporary driver
`/tmp/opencode/native-admission-evidence.mjs` ran **before source edits** and
again after the serial package build. Reports are
`/tmp/opencode/native-admission-before.json` and `...-after.json`. No frozen PDF
or generated base64 archive was added to the repository.

Each timing constructs a drawing operation, lays out the empty-child fixed
fixture, snapshots returned page/placement data (or diagnostics), and closes the
operation. Fixed 300 warmups then five samples of 2,000 full operations per case,
in table order; `performance.now()` elapsed wall time. Median ms per sample:

| Case (table order) | Base | Current |
| --- | ---: | ---: |
| 1 | 77.257 | 76.278 |
| 2 | 70.379 | 72.492 |
| 3 | 57.674 | 73.700 |
| 4 | 68.232 | 92.478 |
| 5 | 67.209 | 68.577 |
| 6 | 87.120 | 90.798 |
| 7 | 66.635 | 69.039 |
| 8 | 58.298 | 90.444 |

No speedup/regression threshold is invented. These small wall-time samples are
noisy, sequential rather than interleaved and include the whole operation.
Cases 3/4/8 are **not equivalent completed workloads**: base throws while current
selects again and produces a second page. Paint-count effect coverage establishes
two selections, offset 0 both times, and one accepted paint on recovery.

The driver also invokes installed esbuild with identical stdin profiles,
`bundle:true`, browser platform/condition, ESM, ES2022, `write:false`, first without
minification then with it; gzip uses Node `gzipSync` on minified bytes. Inputs:
`export { render } from "@updf/core";` and `export * from "@updf/layout";`.

| Profile | Raw base → current | Minified base → current | Gzip base → current |
| --- | ---: | ---: | ---: |
| core-only | 67,136 → 67,136 | 35,558 → 35,558 | 12,272 → 12,272 |
| full layout exports | 315,352 → 316,433 | 162,093 → 162,552 | 51,773 → 51,882 |

The positive layout overhead (+1,081 raw/+459 min/+109 gzip) buys the private
registry, narrow certificate entry and host retry branch. Registry cost is one
WeakSet add per fixed preparation and one membership lookup per selected body
fragment, not one lookup per native child. Accepted ordinary fixed placement
uses one top-level certificate, not probe plus recheck. Non-fixed paint-part
checks remain separate. The helper tree-shakes out of core-only consumers.

## Exact gate outcomes

All commands ran in the delivery worktree above; no checks are left running.

| Command | Outcome |
| --- | --- |
| `npm ci && npm run build` (before edits) | PASS, serial baseline build |
| `npx tsx --test packages/layout-boxes/test/geometry.test.ts packages/layout/test/fixed-admission*.test.ts tests/integration/fixed-admission.test.ts tests/browser/fixed-admission.test.ts` | PASS 13/13 |
| `npm run format:check` | PASS (final repeat) |
| `npm run lint` | PASS Biome + strict AST (final repeat) |
| `npm run typecheck` | PASS full serial package build + root tsc |
| `npm test` | PASS 1,170/1,170, including existing emission/resource/nested regressions |
| `npm run build:browser` | PASS on serial repeat, existing large-chunk warning |
| `npm run check:graphs` | PASS all twelve build graphs |
| `npm run test:browser` | FAIL 15/16: Fontkit browser screenshot capture protocol error |
| `npx tsx --test tests/browser/browser-fonts.test.ts` | FAIL same screenshot error in isolation |
| `npm run test:consumer` | BLOCKED/FAIL npm tar write errno -122 installing fontkit |
| `TMPDIR="$PWD/artifacts/native-admission-tmp" npm_config_cache="$PWD/artifacts/native-admission-cache" npm run test:consumer` | FAIL tsx Unix socket path EINVAL before checks |
| same env, `node --import tsx scripts/packed-consumer.ts` | BLOCKED/FAIL npm tar write errno -122, then truncated package JSON |
| `node /tmp/opencode/native-admission-evidence.mjs before` / `after` | PASS paired behavior/cost reports |
| `git diff --check` | PASS |

Early focused fixture errors (wrong rect paint key, default wrapper fresh height,
dist/source nominal types, tuple spread) and test nesting were corrected before
the passing runs. Initially running browser builds alongside other package
rebuilds caused a transient resolution failure; the browser build and graphs
were rerun serially and passed. Do not parallelize these dist-mutating commands.
These historical failures remain recorded, not waived. The completion below
passes without source/assertion changes or lasting environment configuration.

## Bounded completion: real recipe and disk-backed gates

Same worktree/branch/base/HEAD, Node v24.21.0, npm 11.19.0. Only the new recipe
test and this evidence document were changed in this completion assignment; all
prior-owned production, test, consumer and AGENTS changes were preserved.
No issue, stage, commit, push or PR mutation; no checks remain running.

Environment inspection: `df -h /tmp /home`, `df -i /tmp /home`, `free -h`, tool
availability and `unshare --user --map-root-user --mount true` succeeded. `/tmp`
was tmpfs, 32G/36G used (4.1G available); `/home` had 1.6T available. Memory was
51Gi/60Gi used, swap 69Gi/120Gi used. Both packed install roots are hardcoded
`/tmp/opencode`; `TMPDIR` alone cannot move them. A private user/mount namespace
can bind this assignment's new ignored disk-backed scratch there. It is destroyed
when the command exits; the host mount and existing `/tmp/opencode` files are
untouched. No privileged/global mount, system configuration, tool install,
unrelated deletion, process kill or source-script edit was needed.

From the worktree, after verifying `artifacts` exists, created only
`artifacts/native-admission-completion/{tmp,cache}`. Exact successful invocations
(logs redirected to the same directory as shown in the table):

```sh
unshare --user --map-root-user --mount sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/native-admission-completion/tmp" /tmp/opencode && df -h /tmp/opencode && npm_config_cache="$PWD/artifacts/native-admission-completion/cache" npm run test:consumer'
unshare --user --map-root-user --mount sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/native-admission-completion/tmp" /tmp/opencode && TMPDIR=/tmp/opencode node --import tsx --test tests/browser/browser-fonts.test.ts'
unshare --user --map-root-user --mount sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/native-admission-completion/tmp" /tmp/opencode && TMPDIR=/tmp/opencode npm run test:browser'
unshare --user --map-root-user --mount sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/native-admission-completion/tmp" /tmp/opencode && TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/native-admission-completion/cache" npm test'
```

| Completion command | Actual outcome / log under `artifacts/native-admission-completion/` |
| --- | --- |
| `node --import tsx --test packages/layout/test/fixed-admission-recipe.test.ts` | PASS 1/1, qpdf + accepted-page raster; also included in full root run |
| `npm run lint` | PASS Biome + strict AST, `lint.log` |
| `npm run typecheck` | PASS serial full build + root tsc, `typecheck.log` |
| `npm test` without routing | FAIL 1,169/1,171, temp write UNKNOWN and npm errno -122 in font-load packed regressions, `test.log`; not counted as pass |
| `npm test` with namespace/environment above | PASS 1,171/1,171, zero skipped, `test-disk.log` |
| `npm run format:check` | PASS, `format.log` |
| `npm run test:consumer` with namespace/environment above | PASS all fourteen closures, `consumer.log` |
| isolated Fontkit test with namespace/environment above | PASS 1/1 including screenshot, `browser-fonts.log` |
| `npm run test:browser` with namespace/environment above | PASS 16/16, zero skipped, `browser.log` |
| `git diff --check` | PASS |

Builds were not parallelized with browser checks. Packed/browser checks used
the already built prior implementation; the subsequent full typecheck rebuild
has identical production inputs (only a test/docs added). Earlier successful
browser-build and twelve-graph gates above remain applicable. No build, golden,
assertion or fontkit closure was skipped. Routing resolves these observed
failures, but does not independently diagnose every host quota/memory mechanism.
Initial new-test execution exposed the harness's measurement-only operation;
using the existing drawing-capable host operation fixed it without production
changes. Focused and full runs then passed.

Local provenance (SHA-256; ignored generated artifacts, not committed fixtures):

| Path | SHA-256 |
| --- | --- |
| `packages/layout/test/fixed-admission-recipe.test.ts` | `df41de219a60c97e3cc577fcd0d8e206b1f47cc19a2f8fc83986c29c97f5cde3` |
| `artifacts/native-admission-completion/consumer.log` | `41a614ac3e864e682c90300ffc17e721eddaf17aacdb73a3991beefda04a0740` |
| `artifacts/native-admission-completion/browser.log` | `c81b33a16b599e96483b609a47531a4f402b288bfe7cf798f712743e7c774394` |
| `artifacts/native-admission-completion/browser-fonts.log` | `e98a6d123ac9ec05be83374b27155a37e009e6263fab4416e3be4c6e0261c589` |
| `artifacts/native-admission-completion/test-disk.log` | `0cb9d0818bcbcf57f1d645ea2ddf1ce352c3c4bd087977b003e0f4bcfc9b484d` |
| `artifacts/native-admission-completion/typecheck.log` | `d0448981503d8dbee57962f0f412274af6494033588668e0b87054c374f148e1` |
| `artifacts/native-admission-completion/lint.log` | `094a75ba17c871952643fe3b6002d6ddac8fa765b02cac9307f98c34451e3fd5` |
| `artifacts/cmr-unicode-browser.pdf` | `2a6d2be4a19c54f4f1084b1b328d03b7aafe16d7fe64d577333c913d6587ea3b` |
| `artifacts/font-browser.png` | `bb7dc80792e569d24449a02897e1e3dbc9c93d754aed2f8d8ffbe365ff5f0ccc` |
| `artifacts/installed-graphs.json` | `a7e69d447abc330ff2dd9a5e10d498c454511ee2478d384052b44e6d95f0499f` |

## Historical self-check and stopping point

Required gate completion and the dedicated real deferred-recipe proof are now
complete. **Status: implemented, ready for independent Auditor; not verified.**
No tracker exists (issue N/A). Auditor should inspect all six tracked modified
and ten untracked delivery files, including prior source and AGENTS guidance,
the final-context recipe lifecycle, and unchanged namespace-routed gate evidence.
All work is unstaged/uncommitted; PR/delivery remains the caller's responsibility.

Principles self-check: cohesive source files under 400 lines, functions under 50
and nesting at most three, comments limited to contract/intent, risk-based tests,
no unsafe catch/diagnostic parsing or silent scope expansion. Format/lint/typecheck
and native, packed and full-browser tests pass. All checklist items satisfied;
no approved principle exception or CI waiver. Repository does not use Changesets;
none added. The new 138-line cohesive test is risk-based coverage of an actual
owned recipe rather than a new runtime abstraction or general fit framework.
