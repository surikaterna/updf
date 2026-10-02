# Project MIT license resolution — 2026-10-02

Status: **implemented, ready for independent audit**, not independently verified,
committed, pushed, published or deployed by this implementation step. Tracker N/A:
this is the user's bounded licensing assignment, not roadmap #27/#28.

## Authority and delivery boundary

The user authoritatively confirmed that this project is MIT licensed with
“Copyright Surikat AB 2026”. The standard notice records that supplied attribution
as **Copyright (c) 2026 Surikat AB**. No additional holder, year, authorship history,
or provenance was inferred from repository metadata or remote license lookups.

The earlier missing-authoritative-project-notice blocker is resolved. Historical
evidence describing the then-unresolved notice remains unchanged; this dated
record supersedes that caveat for the current implementation only. It does not
rewrite historical authorship or replace third-party licensing.

The user authorized commit/push by the separate Diplomat delivery step **after
independent audit**. This Engineer step does not stage, commit, push, change Pages
settings, dispatch workflows, deploy, or publish npm packages. Push authorization
is not npm publication or deployment authorization. Packages remain private with
the existing versions, dependencies, exports and runtime behavior.

## Files and shipped notices

- Full standard MIT text: root `LICENSE` and `packages/{core,geometry,svg,fontkit,legacy}/LICENSE`.
  Npm automatically includes each package's LICENSE; actual archives were checked,
  not just manifest allowlists or `npm pack --dry-run` reports.
- Root `package.json` and its active lock root entry now declare `license: MIT`.
  All five production manifests already declared MIT and were left unchanged.
- `scripts/check-licenses.ts` now packs real tarballs with scripts disabled,
  inspects their contents, verifies full canonical project text in source and
  archives, retains private/version/dependency constraints and rejects font/test
  leaks. `scripts/project-license.ts` owns the canonical text and notice validators.
  Temporary archives are removed in a `finally` block.
- Geometry and legacy retain `LICENSE.svgpath` byte-for-byte, including Vitaly
  Puzrin / Fontello attribution. Both archives contain the original third-party
  notice in addition to the new project notice; neither is substituted for the other.
- Liberation Sans 2.1.5 test-font OFL notice, provenance, font bytes and metadata
  remain unchanged and are not shipped in any production tarball or showcase.
- The showcase emits root license bytes as `notices/LICENSE`, alongside unchanged
  `notices/LICENSE.svgpath` and `notices/REUSE.md`. Its project license link uses
  the existing `data-local` base-path mechanism, not an origin-root URL.
- Maintained root/package READMEs, architecture/migration/deployment documentation
  and site copy describe the confirmed attribution instead of the old blocker.
  Historical docs/evidence and archived migration README were not rewritten.

No feature, layout, CSS, workflow trigger, Pages setting, legacy implementation,
font asset or existing third-party notice was changed. No Changesets mechanism is
present; none was introduced.

## Actual worktree and preservation scope

All commands below ran in:
`/home/sprawl/projects/updf/trees/declarative-cmr-poc`.
Branch: `feature/declarative-cmr-poc`.
Base and unchanged HEAD: `7782bb3ba468a721ef7bd68fedd19b8f6c029d16`.

Before editing, `pwd`, `git branch --show-current`, `git rev-parse HEAD`,
`git status --short`, `git worktree list`, `git diff --stat` and
`git diff --cached --stat` confirmed the assigned isolated worktree and the prior
dirty implementation: **81 tracked dirty paths, 329 untracked files, no staged
changes**. No existing changes were reset or overwritten.

`python /tmp/opencode/updf-license-preservation.py before` recorded SHA-256 for
all 333 existing nonignored files (the unchanged base includes four tracked
existing files). Snapshot: `/tmp/opencode/updf-license-baseline.json`.
`python /tmp/opencode/updf-license-preservation.py after` compares every existing
path against that baseline, including historical docs/evidence, roadmap, workflow,
legacy code and fonts. The only changed existing paths are the 13 maintained
licensing paths listed below; no existing files were removed:

```text
apps/showcase/index.html
apps/showcase/vite.config.ts
docs/architecture/packages.md
docs/deployment/github-pages.md
docs/migration/legacy.md
package-lock.json
package.json
packages/core/README.md
packages/fontkit/README.md
packages/geometry/README.md
packages/svg/README.md
readme.md
scripts/check-licenses.ts
```

Ten added files: the six LICENSE files, `scripts/project-license.ts`,
`tests/consumer/project-license.test.ts`, `tests/showcase/license.test.ts`, and this
evidence record. The pre-existing 81 tracked dirty paths remain; there are now
339 untracked files. The three tracked paths touched by this task are root
`package.json`, `package-lock.json` and `readme.md`; all other task changes are
within untracked scope. No new commits or staged changes. Generated build/test
outputs remain ignored, not delivery source.

## Validation on the delivered scope

Node `v24.21.0`, npm `11.19.0`.

| Exact command | Outcome |
| --- | --- |
| `npx biome format --write scripts/check-licenses.ts scripts/project-license.ts tests/consumer/project-license.test.ts tests/showcase/license.test.ts package.json package-lock.json` | pass; scoped formatter fixed one test, no unrelated edits |
| `npm run format:check` | pass |
| `npm run lint` | pass; Biome and ESLint 400/49/depth-3 gates |
| `npm run typecheck` | pass; builds all production packages, examples and legacy, then repository no-emit typecheck |
| `npm test` | pass: 93/93, including two added licensing tests |
| `npm run check:licenses` | pass: actual core/geometry/SVG/Fontkit/legacy archives; 175/37/76/19/66 entries respectively; full project notice, retained Fontello notices, no font/test leaks |
| `npm run test:consumer` | pass: five clean external package closures; NodeNext/bundler types, runtime ownership, Fontkit absent/present, unchanged legacy digest |
| `npm run build:showcase` | pass; emits full project MIT license and existing notices |
| `npm run test:showcase` | pass: 8/8 including new Chromium HTTP 200/full-byte notice test at `/updf/notices/LICENSE` |
| `git diff --check` | pass |
| `python /tmp/opencode/updf-license-preservation.py after` | only the declared licensing scope changed; no prior paths removed |
| `git diff --cached --stat` | empty: no staged scope |
| `git status --short`, `git branch --show-current`, `git rev-parse HEAD` | dirty implementation retained; assigned branch and HEAD unchanged |

Unchanged all-browser/font/browser-build and raw legacy gates were not rerun:
no runtime/font/legacy code changed, SHA-256 preservation passed, native tests,
actual pack consumers and showcase Chromium tests cover the changed distribution
and site risks. Previously recorded inherited legacy suite/dependency-audit
failures are neither fixed nor claimed green.

## Code-principles self-check / next owner

- Correctness: exact full MIT grant, inclusion clause and disclaimer validated;
  actual tarball content and served bytes checked rather than metadata alone.
- Defaults/exceptions: no new exception. Existing legacy/historical/font formatting
  exclusions remain intentional and unchanged; no exception or weakening added.
- Cohesion/size: notice validation has one module; archive orchestration remains
  in the license checker. New/changed TS files are below 400 lines, functions below
  50 (enforced max 49), nesting no deeper than three.
- Comments: no redundant comments added.
- Risk-based tests: positive complete notice plus negative partial text, altered
  attribution, missing inclusion/disclaimer, missing packed license and missing/
  replaced third-party notice; production Chromium verifies subpath and full text.
- Format, lint, typecheck and relevant tests pass. Scope remains licensing only.

Auditor should independently review the task delta against the recorded dirty
baseline, verify the canonical text and all five archives/served subpath, and
confirm byte preservation and delivery boundaries. Only after audit should
Diplomat perform the separately authorized focused commit/push. No Pages or npm
delivery should be inferred from that authorization.
