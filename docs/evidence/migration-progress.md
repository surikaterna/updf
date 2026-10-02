# #34 preservation and legacy baseline — incomplete migration

Date: 2026-10-02. Integration owner: Engineer; no delegation.

**#34 is not implemented. #35 has not started.** This delivery completes the
preservation/baseline preparation portion of execution slice A only. Workspace
migration, native package splitting, migrated gates, package licenses and the root
README remain outstanding. No architecture alternative was substituted. This is
not a release, migration acceptance report or independent verification.

The caller reports the preceding painting/native SVG work independently VERIFIED
after two remediation rounds. Its historical README/EVIDENCE remain byte-for-byte
unchanged, including their earlier pending-audit wording. That prior audit does not
verify this new migration tooling or an unperformed package transition.

## Exact delivery state

- Worktree/cwd: `/home/sprawl/projects/updf/trees/declarative-cmr-poc`.
- Branch: `feature/declarative-cmr-poc`.
- Base/HEAD: `7782bb3ba468a721ef7bd68fedd19b8f6c029d16`.
- No committed, staged or tracked-unstaged delta. Only new untracked files under
  `tools/migration/` and `docs/evidence/` were added in this session.
- All original 154 untracked POC files remain in `experimental/declarative/`,
  including all 12 foreign roadmap documents. No source, config, test, asset,
  evidence or roadmap file was removed, moved or edited.
- `migration-inventory.json` records old path, planned destination, byte length and
  SHA-256 for 81 tracked originals plus 154 untracked POC files. The additional
  58 ignored generated `lib` files are separately classified; they are not source.
  All 293 original files pass byte-for-byte preservation checks.
- Planned destinations are a preservation map, not proof that package boundaries
  or allowed importer contracts have been implemented. Historical config/locks are
  earmarked for evidence archives, not additional active workspace lockfiles.
- Existing root/subtree dependency installations were not changed. Legacy tests
  and compilation/packing ran in disposable copies except the explicit raw root
  `npm test`. Tests' relative output files remain in those disposable copies.
- No staging, commits, pushes, publication, deployment or tracker mutations.

Final delivery checks: `pwd`, `git branch --show-current`, `git rev-parse HEAD`,
`git worktree list`, `git diff --stat`, `git diff --cached --stat`, and
`git diff --quiet 7782bb3ba468a721ef7bd68fedd19b8f6c029d16` confirm that state.
`git ls-files --others --exclude-standard -- tools docs` lists exactly 17 new
files; original POC and roadmap counts remain 154 and 12. Final preservation and
tracked whitespace checks pass. New-file whitespace checks produced no diagnostics
and passed with exit 1 accepted as an ordinary new-file difference:

```sh
git ls-files --others --exclude-standard -z -- tools docs | xargs -0 -r -I{} sh -c 'git diff --no-index --check /dev/null "$1"; status=$?; test "$status" -le 1' sh "{}"
git diff --check
git diff --quiet
git diff --cached --quiet
```

## Commands and results

Unless otherwise noted, run from the worktree root above with Node `v24.21.0` and
npm `11.19.0`. The temporary bootstrap uses existing subtree tooling; it is not
the promised final root toolchain.

```sh
experimental/declarative/node_modules/.bin/tsx tools/migration/inventory.ts docs/evidence/migration-inventory.json
experimental/declarative/node_modules/.bin/tsx tools/migration/legacy-baseline.ts . docs/evidence/legacy-baseline.json
experimental/declarative/node_modules/.bin/tsx tools/migration/legacy-baseline.ts . docs/evidence/legacy-baseline-repeat.json
experimental/declarative/node_modules/.bin/tsx tools/migration/legacy-comparison.ts docs/evidence/legacy-baseline.json docs/evidence/legacy-baseline-repeat.json
experimental/declarative/node_modules/.bin/tsx tools/migration/legacy-tarball.ts . docs/evidence/legacy-tarball-baseline.json
experimental/declarative/node_modules/.bin/tsx tools/migration/verify-originals.ts docs/evidence/migration-inventory.json
experimental/declarative/node_modules/.bin/tsx --test tools/migration/migration.test.ts
experimental/declarative/node_modules/.bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --noUnusedLocals --noUnusedParameters --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022 --types node --typeRoots experimental/declarative/node_modules/@types tools/migration/*.ts
experimental/declarative/node_modules/.bin/eslint --config experimental/declarative/eslint.config.ts tools/migration
npm test
npm audit --ignore-scripts
gh api "repos/surikaterna/updf/license?ref=7782bb3ba468a721ef7bd68fedd19b8f6c029d16"
```

- Inventory, baseline collectors, equivalence comparison, tarball smoke,
  preservation verifier, strict tooling typecheck and tooling lint pass.
  Five tooling tests pass, zero fail. Collector success is **not** legacy test
  success: the collectors retain subprocess exit codes explicitly.
- Raw root `npm test` fails: zero passing, one failing, exit 1. Failure remains
  `test/container.js:255:46`, undefined `.toString()`, selected by inherited
  `it.only` at line 433. Inherited Windows output paths were not rewritten.
- The disposable full-suite harness rebinds Mocha's context `it.only` and
  `describe.only` to ordinary registration before loading tests. Original test
  files are not edited. Both identical pre-migration runs produce **18 passing,
  1 pending, 6 failing**, exit 1. Exact failed titles/messages and PDF hashes are
  retained in both baseline JSON files. Their comparison passes, but this is
  baseline repeatability, **not before/after migration equivalence**.
- Full-suite failures: Code39 symbol assertion; container `.toString()`; three
  BaseFont width/kerning assertions; `PdfDoc stream` (`solved.render` missing).
  The image test catches its missing-fixture exception and reports passing;
  this is inherited behavior, not successful image-rendering evidence.
- Legacy tarball smoke passes for actual `main: lib/index.js`, Babel default-object
  CommonJS semantics, `lib/boxes/a4` and `lib/stream` deep imports. Existing generated
  lib, Babel-registered root shim importing src, disposable Babel 6 rebuild, and
  external production-only installed tarball produce identical 651-byte PDFs:
  `4d81741fb1650c5075a0e56a291a76b870677defd5413138f4da0fa00f464abc`.
  The package remains the original `@surikat/updf@0.4.15` in this baseline.
  Packing occurs from an isolated legacy-only copy, not the worktree containing
  the unrelated untracked POC. Final tarball lists 64 files and excludes the
  generated smoke harness, src/test and font assets. This is not yet the migrated
  `@updf/legacy` package or the full native tarball matrix.
- Root `npm audit --ignore-scripts` fails with **57 vulnerabilities: 2 low,
  10 moderate, 16 high, 29 critical**. No audit fix or legacy modernization ran.
  This is the legacy root lock scope, not a future merged workspace audit.
- Authoritative license lookup returns HTTP 404. Existing manifest declares
  MIT/author Surikat AB; no copyright holder/year or missing MIT notice was
  invented. Existing Fontello MIT and Liberation OFL/provenance are preserved.
  Final per-package license/tarball isolation remains an acceptance item.

Native unchanged-baseline checks, from
`/home/sprawl/projects/updf/trees/declarative-cmr-poc/experimental/declarative`:

```sh
npm run typecheck && npm run lint && npm run build && npm test && npm run test:consumer && npm run check:graphs
```

All pass: 79 native tests, packed production consumer and graph checks. Graph
counts remain 25/22/5/64/69/106/10/28. Browser builds/execution were not rerun in
this session; graph checks read the existing prior browser-build artifacts.
No migrated package gate or new Chromium evidence is claimed.

## Principles self-check for this preparatory delta

- Correctness: original hashes verified; unknown preservation inputs fail closed;
  full results and artifact bytes are compared, not just exit codes.
- Defaults/exceptions: no new production principle exception. Generated disposable
  CommonJS harnesses are intentional Babel 6/Mocha 2 compatibility fixtures, not
  new native package CJS exports. Existing legacy source-size/complexity, focused
  tests, environment-specific fixtures and vulnerable tooling are inherited debt,
  explicitly unmodified. No waiver or passing aggregate is inferred.
- Cohesion/files/functions/nesting: migration responsibilities are separated into
  small TS files; existing modern ESLint enforces <=400 lines, functions <50 and
  nesting <=3 on new tooling.
- Comments: intent only (why the disposable harness uses CommonJS).
- Risk-based tests: five cases cover preservation coverage, destination examples,
  unknown-file rejection, equal-size hash corruption, malformed inventory, and
  negative comparison controls for changed failures/bytes/runtime or killed runs.
  Actual legacy tarball/source/main execution supplements unit tests.
- Lint/tooling tests pass; native baseline tests pass. Legacy tests/audit fail as
  recorded, therefore the overall project checklist is **not all green**.
- No Changeset: this project has no Changesets workflow and no package runtime
  change was made.

## Remaining work / next owner

Engineer must continue #34 slices B–D, then #35 slice E, then integrated slice F:
root workspace and scoped legacy toolchain; exact native manifests/exports and
ambient-free builds; narrow inventoried internal seams/importer checks; imports,
tests and eight browser targets; external tarball matrix/negative controls;
licenses and installed graphs; tested README TS/TSX/SVG/font examples and truthful
real-issue roadmap; migration preservation reconciliation and full integrated
evidence. All original POC and roadmap files must remain protected until their
new destinations and transformed-content reconciliation are validated.

An Auditor may review this preparation, but **must not mark #34/#35 verified or
implemented from it**. Tracker state remains untouched by instruction. No missing
architectural decision was discovered; the incomplete work is execution capacity,
not a reason to redesign or weaken the adopted contract.
