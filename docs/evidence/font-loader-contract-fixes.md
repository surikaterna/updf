# PR #76 loader contract review fixes

YOLO implementation and self-validation, not independent audit. Worktree
`/home/sprawl/projects/updf/trees/font-loader-contract-fixes`, local branch
`feature/font-loader-contract-fixes`, starting base
`f15d2fc4b1db4647e0b37c850ef15d9d216c66d4` (current font-loading PR head).
PR #75 has merged into develop at `3225bda`; #76 now targets develop. The commit
and PR record actual delivery state; no merge, deployment or upstream issue posting
is part of this fix.

## Findings and changes

- [Custom transport errors](https://github.com/surikaterna/updf/pull/76#discussion_r4250703725):
  both adapters previously leaked ordinary custom-loader errors. A narrow helper
  now wraps only the actual loader invocation, including synchronous throws and
  promise rejection, as `FONT_LOAD` at `/font/source`.
- [Complete loader contract](https://github.com/surikaterna/updf/pull/76#discussion_r4250703781):
  both adapters now require callable own enumerable `resolve` and `load` fields.
  Getters, hidden fields, inherited methods, missing fields and non-functions reject
  before any load. This also addresses the later Fontkite-only note in the review
  summary, which had no separate inline thread.
- [Ancestry/evidence](https://github.com/surikaterna/updf/pull/76#discussion_r4250739982):
  active docs now describe #75's merge and #76's develop base. The original
  standalone evidence is explicitly historical; its counts and measurements are
  retained, not relabelled as current validation.
- [Fraction serialization](https://github.com/surikaterna/updf/pull/76#discussion_r4255366603):
  already fixed by merged #80 (`9b943a7`), present in the starting base. No duplicate
  implementation change was made; the PR thread can reference that existing fix.

The public AssetLoader type is unchanged. Validation does not invoke `resolve` or
normalize a source on the loader's behalf. The captured load callback is invoked
with `Reflect.apply`, retaining the original receiver, source, byte cap and signal.

Existing loader `DocumentError` objects retain identity, diagnostic paths and span
metadata. AssetError LOAD maps to FONT_LOAD and other asset codes retain their
existing mapping. Arbitrary thrown values are not inspected/stringified; the new
transport diagnostic has a generic message. Returned-byte and font preparation
remain outside that catch boundary, preserving TYPE/LIMIT/FONT_FORMAT/FONT_RIGHTS
instead of masking them as transport failures. Fontkit still adds its direct-file
hint to parser FONT_FORMAT errors, not to structured errors supplied by a loader.

No font parser, bounds algorithm, transport implementation, package dependency,
default backend, or new font format was introduced. The small helper stays local
to each optional adapter so neither adapter depends on the other, and the shared
asset package does not acquire a core/PDF dependency.

## Validation

The four targeted reproductions (missing/non-callable resolver and unstructured
transport rejection, parameterized over both adapters) failed against the original
code. After the fix, all 16 new contract tests and five existing load tests pass.

Coverage includes malformed methods on URI and byte sources; getter/non-enumerable/
inherited rejection with zero side effects; preserved receiver/source/cap/signal;
synchronous and asynchronous arbitrary throws; error-message getters that must not
run; structured diagnostic identity/mapping; and post-load byte/format/rights errors.
Existing cancellation checks remain unchanged and pass.

| Exact command | Outcome |
| --- | --- |
| `npx tsx --test --test-name-pattern='resolve must|unstructured transport' tests/integration/font-loader-contract.test.ts` before edits | four failures, reproducing the findings |
| `npx tsx --test tests/integration/font-loader-contract.test.ts packages/fontkit/test/load.test.ts packages/fontkite/test/load.test.ts` after edits | **21 pass** |
| `npm run format:check` | pass |
| `npm run lint` | pass, including AST code-principles gates |
| `npm run typecheck` | pass, full build and workspace checks |
| `npm test` | **1,105 pass**, zero failures/skips/cancellations |
| `npm run build:showcase` | pass |
| `npx tsx --test --test-concurrency=1 tests/showcase/font-uri.test.ts tests/showcase/font-uri-state.test.ts tests/showcase/font-engine.test.ts tests/showcase/graph.test.ts` | **15 pass**, real Chromium, source/PDF parity, state and emitted graphs |
| `git diff --check` | pass |

The root suite includes packed Fontkit/Fontkite load-entry checks, portable
declarations, canonical ESM/CJS ownership and emitted dependency isolation. The
existing arithmetic negative-control test prints an intentional esbuild diagnostic
inside the passing suite. No new complete showcase run, live CDN smoke, corpus/fuzz
campaign or size benchmark is claimed for this narrowly scoped contract correction;
PR CI must validate the current develop merge result.

Principles self-check: cohesive bounded functions/files, no error coercion or
getter execution added, tests proportional to the boundary change, no suppressions
or exceptions. No numerical-policy change. No Changesets setup; packages remain
private/unreleased. Review comments should distinguish fixed code from historical
metadata and remain available for reviewer confirmation.

## Post-merge packed-consumer isolation follow-up

After #81 merged into #76 at `7ab12e3`, Copilot identified one remaining test-only
issue: the packed loader test installed `fontkit@2.0.4` from the registry. The
follow-up on `feature/font-loader-offline-test` replaces that call with local
tarballs for the installed Fontkit runtime dependency closure. It retains a real
npm consumer installation, declaration checks before Fontkit is installed, and
the ESM/CommonJS ownership and preparation checks afterward. No workspace symlink
or whole-node_modules copy substitutes for the packed consumer.

The helper requires Fontkit 2.0.4, detects conflicting versions rather than
silently flattening them, and installs the complete closure with `--offline` and
a fresh cache under the disposable test directory. This is deliberately a bounded
Fontkit fixture helper, not a general-purpose dependency installer.

Validation in `trees/font-loader-contract-fixes`:

- `npx tsx --test tests/consumer/font-load-packed.test.ts` — one pass.
- `env npm_config_offline=true npm_config_cache="/tmp/opencode/updf-font-load-offline-$(date +%s)" node --import tsx --test tests/consumer/font-load-packed.test.ts`
  — one pass with the entire test's npm subprocesses offline and a fresh outer
  cache, in addition to the helper's separate fresh install cache.
- `npm run format:check`, `npm run lint`, `npm run typecheck` — pass.
- `npm test` — 1,105 pass, zero failures/skips/cancellations.
- `git diff --check` — pass.

No runtime/package contract or numerical change; no principles exceptions or
Changeset required. Existing integration coverage is reused. This proves the
affected packed test's offline isolation, not that every repository command is
network-free. Full browser checks are left to the updated PR CI before merge.
