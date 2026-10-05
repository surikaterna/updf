# S2: legacy active tooling retirement

The legacy workspace now builds with TypeScript `allowJs` (ES2015, CommonJS,
interop enabled), retaining `lib/**` paths and CommonJS `.default` exports.
No legacy engine, source, test, fixture, or raster behavior is changed.
The only remaining legacy development dependency is the historical `should`
assertion library; Babel, ESLint, Mocha and Prettier are absent from the active
workspace dependency graph.

## Historical evidence versus active configuration

`packages/legacy/.babelrc` and `.eslintrc` remain byte-identical historical
files. No active command reads them. Historical manifests/lockfiles under
`docs/evidence/baseline/` also remain inert. The retired root ESLint configuration
is preserved as `retired-root-eslint.config.ts.txt`, not an executable config.

Migration reconciliation still checks historical source/test/config bytes.
Ignored generated `lib` output is now rebuildable compiler output, not immutable
original source: its old hashes remain in the unchanged inventory, and changed
output is reported as `migration-edit-review-required`. These 58 generated
files were absent in this worktree before the build. Reconciliation requires
their paths to exist after building; it does not rewrite the historical hashes.

## Bounded test adapter

The adapter compiles disposable source/test copies with TypeScript, preserving
fixture paths. It collects only the declaration forms actually present:
`describe`, `xdescribe`, `it`, and `it.only`. Node's test runner owns execution,
callback completion, asynchronous failures and timeouts. This is not a general
Mocha replacement. Additional lifecycle/declaration forms require a separate
decision, not silent emulation.

The raw command retains the historical focused test. The comparison command
explicitly removes focus in its disposable execution but retains the historical
pending suite. Neither command edits original tests or assertions. Error name
and message are materialized at the adapter boundary because historical
`should` errors have lazy fields that Node's IPC serialization otherwise loses.

## Acceptance evidence

On Node v24.21.0, before and after retirement:

- Raw: 0 passed, 0 pending, 1 failed (`container should put absolute position`),
  exit 1, no PDFs. Its captured inventory is `legacy-raw-results.json`.
- Full: 18 passed, 1 pending, 6 failed, exit 1. Exact titles, names and messages
  are compared with the unchanged `docs/evidence/legacy-baseline.json`.
- Pending: `afm uncompress should decode object`.
- Known failures: code39 symbol for 1; container absolute position; BaseFont
  default width, summed widths, kerning; PdfDoc stream. No new failures.
- Full `test.pdf`: 708 bytes, SHA-256
  `ce5cc5e75a0b293ffd8ea2908a1305fe28be3de2dbab0951f386ad45d0322b68`.
- Packed smoke: 651 bytes, SHA-256
  `4d81741fb1650c5075a0e56a291a76b870677defd5413138f4da0fa00f464abc`,
  matching the historical baseline, disposable source shim, TS rebuild and
  installed tarball consumer; export keys are `["default"]`.

`npm run test:legacy` is intentionally still nonzero. A successful
`npm run test:legacy:comparison` proves equivalence, not a passing legacy gate.
Build, migration tests, Biome lint/format and code-principles checks are the
remaining bounded acceptance checks. No package version or delivery changes
are part of this slice.
