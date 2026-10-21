# Static range capability: size reduction without weaker validation

## Scope and status

Worktree: `/home/sprawl/projects/updf/trees/flow-admission`, branch
`feature/flow-admission`, unchanged HEAD/base
`b70da49ace00c19a8e570b4fc783806dffd6931c`. This batch starts from the existing
150-path uncommitted migration, not from clean HEAD. Issue: N/A.

Implemented and self-validated. **Independent audit remains pending**: this
session has no delegation capability. Neither this batch nor its tests constitute
either FINAL whole-flow audit. No stage, commit, push, PR or deployment occurred.

## Change and retained functionality

`createRangeOperation` exposes `prepare`, `select`, `counts`, and `close` on the
existing fragmentation subpath. Paragraph and measured block-unit bindings now
request that capability instead of constructing all fragmentation facilities.

The full `createFragmentOperation` remains a supported all-capabilities operation:
ranges, candidate endpoints, and indexed-region continuation share its source
identities, cumulative ledger, reentrancy guard, and poisoning lifecycle. It is
not a compatibility adapter or a second selector. Both constructors use the same
`RangeState` implementation and existing `selectRange`; the full state adds its
candidate/region stores and releases them through the shared poison path.

The narrow state does not import or construct those additional stores. Tests check
retained emitted modules, not merely the parsed module list: reexports can cause
optional modules to be parsed even when they contribute no output bytes.

No validation, numerical certificate, quota, ownership check, provider work lease,
or lifecycle guard was disabled. No feature flag or runtime mode branch was added.
The range capability intentionally cannot enumerate candidates or drive indexed
regions; callers needing those features choose the full operation from the start.

## Debug versus production builds

Production must retain input/domain validation, exact identities, geometry checks,
quotas, poisoning/reentrancy protection and resource release. These are behavioral
guarantees, not debug assertions. Debug tracing or additional diagnostic reporting
could be optional if separately justified; no such additional build configuration
was introduced here.

A minified consumer regression compiles with both development and production
`NODE_ENV` definitions. Both bundles are byte-identical and enforce the measurement
quota before the callback, frozen count snapshots, and rejection after poisoning.
This tests the range capability's build invariance; it is not a claim about every
possible application bundler configuration.

## Measured before/after

`artifacts/range-capability/measure.mjs` captured the actual dirty entry before
editing. Every reachable workspace module is emitted from its source using
TypeScript 5.9.3 (ES2022/ESNext), then esbuild 0.28.2 bundles browser ESM/ES2022.
Raw/minified options, profiles and default Node gzip are identical in both arms.
Metafiles and source hashes are retained. The after measurement was repeated with
identical output hashes, sizes, and retained-module attribution.

| Consumer | Before minified | After minified | Before gzip | After gzip | Gzip delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Core render only | 35,558 | 35,558 | 12,272 | 12,272 | 0 |
| Full layout + tables | 188,352 | 183,864 | 59,858 | 58,593 | -1,265 |
| Layout consumer | 167,359 | 162,871 | 53,350 | 52,080 | -1,270 |
| Text/paragraph consumer | 177,102 | 172,614 | 56,734 | 55,461 | -1,273 |
| Full kernel operation | 13,617 | 13,704 | 4,810 | 4,851 | +41 |

The full layout/table profile removes 7,738 raw and 4,488 minified bytes. The
explicit full-kernel consumer grows slightly because of the shared base state and
optional-store cleanup hook. No functionality was removed from that operation.

The range/layout retained graphs exclude `fragment-candidates` and
`fragment-regions`; the full-operation positive control retains both. A negative
control proves that importing the full capability defeats the narrow-graph check.

These are consumer bundle sizes, not installed package sizes or timing evidence.
The complete flow migration remains unfinished. Its full layout/table bundle is
still 1,942 gzip bytes above the previously measured branch-start profile of
56,651 bytes. Future integration of candidate/region capabilities would legitimately
bring their implementation cost back into consumers that need them.

## Validation

Subprocess-heavy commands used a private user/mount namespace and batch-owned
disk-backed scratch/cache to avoid the host's existing `/tmp` quota limitation:

```sh
unshare --user --map-root-user --mount --fork sh -c 'mount --make-rprivate / && mount --bind "$PWD/artifacts/range-capability/tmp" /tmp/opencode && export TMPDIR=/tmp/opencode npm_config_cache="$PWD/artifacts/range-capability/cache" && COMMAND'
```

No global mount, host configuration or unrelated temporary data was changed.

| Command | Result |
| --- | --- |
| `npm run format:check` | PASS after correcting initial formatting diagnostics |
| `npm run lint` | PASS, including AST principles |
| `npm run typecheck` | PASS, full serial build and root typecheck |
| Focused range/GC/paragraph-owner/retained-graph checks | 17 passed, including build invariance |
| `npm test` | 1,353 passed, no skips or failures, including build invariance |
| `npm run test:consumer` | 14 external tarball closures passed, including range ESM/CJS and strict NodeNext/Bundler declarations |
| `npm run build:browser` | PASS |
| `npm run check:graphs` | 12 profiles passed |
| `npm run test:browser` | 18 passed, no skips or failures |
| `git diff --check` | PASS |

The range/full paired tests verify source registration, immutable results, borrowed
content identity, exact-width rejection, quota ordering, poisoning, caught reentry,
callback-close exception identity, expired work and empty-source behavior. The
existing isolated GC child now also retains narrow closed/poisoned operations and
work handles while proving host buffers collect; its live control remains alive.
All existing full candidate/region tests remain active.

Logs and repeatable measurement inputs are under `artifacts/range-capability/`.
Normal repository tests do not depend on these local historical artifacts.

The focused command is:

```sh
node --import tsx --test packages/layout-boxes/test/fragment-range.test.ts packages/layout-boxes/test/fragment-release.test.ts packages/layout/test/paragraph-selection-architecture.test.ts tests/consumer/range-capability.test.ts
```

## Remaining work

Independent audit of this batch is outstanding. Private height-aware composition,
the unwired source-admission session and both FINAL whole-flow audits also remain
pending. This change does not complete the architectural migration.

Code-principles self-check passes: cohesive files, enforced size/function/nesting
limits, intent-only comments, proportional tests and passing quality gates. No
principle exception or gate waiver. The repository does not use Changesets.
