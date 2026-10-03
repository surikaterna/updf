# Measured flow and tables — final local status, 2026-10-02

This dated summary reconciles maintained status after the supplied independent
Auditors passed #26, #27 and #28. It does not rewrite the original planning or
implementation evidence, whose awaiting-audit wording describes earlier stages.
The audit results below are supplied handoff evidence, not new Engineer audit claims.

## Independent audit and delivery status

- **#26 independently VERIFIED:** fractional fix, 115 cases.
- **#27 independently VERIFIED:** numeric policy, 145 cases; independent
  certificate validation, 2,558 cases.
- **#28 independently VERIFIED including spatial R1:** 129 altered raster copies
  rejected, 167 tests passed; independent raster audit added 126 controls.
- Final Builder fresh showcase build and tests passed **14/14**. The actual
  private site graph had **116 modules**; initial entry was core-only, with no
  React, Fontkit or Node APIs. Entry **63.47 kB**, optional SVG **28.44 kB**, flow
  **4.04 kB**, tables **12.17 kB**, shared private layout **10.01 kB**.
- #34/#35 were merged via [PR #36](https://github.com/surikaterna/updf/pull/36)
  at `ac60f80675a2042f2f6043bae51b541b85e7251f`, not merely locally audited.
- #26–#28 issues remain **OPEN**, unchanged; their feature delivery is local,
  uncommitted and unmerged. Packages remain private/unreleased.
- The supplied GitHub Pages API check returned **404 (not active)**. This is an
  audited local showcase/playground artifact, **not a live deployment**. No release,
  publication, activation or deployment is claimed or authorized here.

## Bounded documentation reconciliation

Worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`; branch:
`feature/measured-flow-tables`; base and unchanged HEAD:
`ac60f80675a2042f2f6043bae51b541b85e7251f`.

Only these five files belong to this session's delta:

```text
apps/showcase/index.html                maintained status text only
readme.md                               maintained current status only
docs/roadmap/current.md                  maintained current index only
packages/layout/README.md               opening current status only
docs/evidence/measured-flow-handoff.md   new dated summary
```

Historical roadmaps and evidence, production TypeScript, source APIs, tests,
manifests, lockfile, workflow and dependencies are unchanged by this session.
No staging, commits, tracker changes or Git delivery/deployment mutations occur.
The bounded reconciliation is **implemented, ready for independent final review**;
this does not reopen or substitute for the supplied feature audits.

## Reconciliation validation and preservation

Commands ran in the exact worktree above on unchanged HEAD plus the cumulative
dirty feature delivery:

| Command | Final outcome |
| --- | --- |
| `npm run format:check` | pass, 275 maintained files, no writes |
| `npm run lint` | pass, 278 Biome files and ESLint code-principles checks |
| `npm run build:showcase` | pass, package TypeScript builds/site typecheck; 116 modules, chunk sizes above unchanged |
| `npm run test:showcase` | pass, 14/14, actual HTML/downloads and optional graph checked |
| `git diff --check` | pass |
| `git diff --cached --stat` | empty, no staged changes |
| `git rev-list --count ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD` | 0, no task commits |
| `git diff --name-only \| wc -l` | 42 unstaged tracked files, inherited count unchanged |
| `git ls-files --others --exclude-standard \| wc -l` | 84 untracked files, inherited 83 plus this summary |

The first showcase run passed 13/14: two newly added PR links changed the exact
roadmap anchor list. PR #36 is now plain status text in the HTML, preserving the
existing navigation contract. All four requested gates were rerun and passed;
no test expectation was weakened or changed.

The production-source fingerprint command from the preserved table R1 evidence
returned the same before/after SHA256:
`f009b5283da5e230eee0e2439f9ce3c358f379d11e80a0a94fa51e8001d4ea53`.
Before/after `sha256sum docs/evidence/tables.md docs/evidence/measurement.md docs/evidence/flow.md docs/roadmap/README.md docs/roadmap/step-*.md package.json package-lock.json`
also matched for every listed file. In particular, historical table evidence is
unchanged at `58f2dc5ca0c6c9dd5d9df0a90a506cb449097529dd71a7b29450cbb8f12cbde7`.

Code-principles checklist: correctness/status distinctions checked; defaults
followed; file responsibilities remain cohesive; production file/function/nesting
limits unchanged and lint passes; no new code comments; risk-based existing
showcase tests rerun; formatting/lint/tests pass. **No new or approved exception**
is needed. No test additions or Changeset: status text/docs only, with no runtime
API or package impact. Broader feature audits and historical legacy/audit failures
are retained as supplied evidence, not claimed rerun or waived here.

Auditor should review this bounded five-file delta, verify maintained status against
the supplied audit/merge evidence and built HTML, and confirm historical/source
preservation and unchanged tracker/delivery state. Inspect cumulative delivery with
`git status --porcelain=v1 -uall`, `git diff`, `git diff --cached`, and
`git ls-files --others --exclude-standard`; untracked files require explicit reads.
