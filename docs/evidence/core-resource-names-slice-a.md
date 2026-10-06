# Core-owned resource names — Slice A

2026-10-06. Approved central-names-first refactor only, in draft PR #66's worktree.
Issue assignment: N/A (JPEG history references #33; no tracker mutation).
Builder owns parent integration. This is Engineer implementation evidence, not an
independent audit, delivery, or completion of the subsequent B/C slices.

## State and scope

- Cwd: `/home/sprawl/projects/updf/trees/jpeg-resources`.
- Branch: `feature/jpeg-resources`; clean starting base and unchanged HEAD:
  `f97a07a223aad8ac6de043bf515777aec42f5778`.
- Engineer owns only this assignment's unstaged/untracked diff. No inherited dirt,
  stages, commits, pushes, PR changes, tracker changes or other-worktree edits.
- Implemented: one generic naming authority, `ResourceDefinition<T>` input and
  fresh shallow-frozen core `Resource<T>` output, own-data validation, migrations
  of fonts/alpha/JPEG/synthetic providers, contract docs and risk-based proofs.
- Unchanged: JPEG parser/profile/source, font definitions/ToUnicode, object
  reservation ordering, logical IDs, painting geometry, dependencies/lockfile.
  Six-node ownership/phase wiring (B) and native bridge (C) are not included.

Categories use existing PDF name byte semantics, including empty/Latin-1 names;
there is no format whitelist or provider prefix/key compatibility. `reserve`
receives the frozen core wrapper, while its payload and closure state may mutate.
Malformed definitions reject `RESOURCE` at `/resources`; missing/conflicting
XObject bindings retain their existing node resource paths.

## Validation

Commands run from the cwd above against the uncommitted Slice A source:

| Command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, Biome plus exact AST size/function/depth gate |
| `npm run typecheck` | Pass, full build and strict root compilation |
| `npm test` | Pass, 873/873, no skipped/cancelled |
| `npm run test:consumer` | Pass, 12 clean installed tarball closures, NodeNext/Bundler and both loaders/orders |
| `npm run build:browser` then `npm run check:graphs` | Pass, 12 browser targets; optional package isolation preserved |
| `npm run check:licenses` | Pass, 11 actual library tarballs |
| `npx tsx scripts/jpeg-example.ts` then `qpdf --check artifacts/jpeg-example.pdf` | Pass, reusable two-page image example |
| `npx tsx scripts/check-current-docs.ts` | Pass, scoped local-file links |
| `git diff --check` | Pass |

Initial parallel test/build scheduling was invalid: regeneration of `dist` raced
with tests, causing missing modules and a timeout. Sequential reruns completed.
Old private-name assertions and synthetic key injection fixtures were migrated;
trusted lower-level text/XObject escaping tests still exercise unsafe PDF names.
A new proof script's Buffer typing and test helper size/format errors were fixed;
the final gates above are the resulting passing runs, not waived failures.

New tests cover independent providers in shared Font/ExtGState/XObject categories,
actual page bindings, aliases/pages/document reuse, per-category counters, both
phases, failed factories without numbering holes, null-prototype/data-constructor
definitions, own/inherited key rejection, nonexecuted getters, fresh immutable
wrappers with mutable payloads and captured callbacks. Existing tests retain lazy
completion, later-page CID registration, unused bindings, foreign/conflicting
bindings, closed mutation paths, qpdf, extraction and raster coverage.

## Matched baseline and costs

Before edits, all eight profiles were built from actual f97 HEAD, not the older
rich-only PR base. Source archive for later B/C baseline reconstruction:
`/tmp/opencode/updf-slice-a-f97-source.tar` (`git archive` of the exact revision).
Baseline bundles/report/tarballs: `/tmp/opencode/updf-slice-a-f97-baseline`.
Current counterparts and proof: `/tmp/opencode/updf-slice-a-current`.

```sh
npx tsx scripts/sizes.ts . current /tmp/opencode/updf-slice-a-f97-baseline
# Above ran at clean f97 before editing; do not overwrite it with current source.
npx tsx scripts/sizes.ts . current /tmp/opencode/updf-slice-a-current
npx tsx scripts/consumer/resource-name-proof.ts
```

The proof asserts identical input sources for every profile; six real PDFs pass
qpdf and exact raster/extraction comparison. Qpdf object comparison normalizes
only resource dictionary names and matching Tf/Do/gs operands by category/object
reference, plus derived content stream lengths. Other objects, embedded font/JPEG
streams, object counts/references and command geometry remain equal. JPEG source
bytes are also checked directly. Both measurement profiles retain exact DTOs.

| Profile | f97 raw/gzip | Slice A raw/gzip | Delta raw/gzip |
| --- | ---: | ---: | ---: |
| Drawing | 33,744 / 11,675 | 34,420 / 11,850 | +676 / +175 |
| Helvetica | 55,616 / 19,229 | 56,184 / 19,332 | +568 / +103 |
| Prepared | 59,889 / 20,446 | 60,457 / 20,559 | +568 / +113 |
| Font measurement | 24,285 / 8,586 | 24,285 / 8,586 | 0 / 0 |
| Fontkit | 433,155 / 173,922 | 433,725 / 174,015 | +570 / +93 |
| Host measurement | 20,735 / 7,199 | 20,735 / 7,199 | 0 / 0 |
| JPEG | 40,394 / 14,183 | 40,978 / 14,309 | +584 / +126 |
| Mixed JPEG/prepared | 66,221 / 23,113 | 66,697 / 23,174 | +476 / +61 |

Each runtime profile parses/retains one additional generic resource-definition
module; both measurement graphs are unchanged. Full parsed module inventories and
retained contributions are in the matching reports. Existing profiles still omit
JPEG; non-Fontkit profiles still omit Fontkit. No source aliases, Node/CJS browser
inputs, new dependencies or hidden measurement cost are introduced. These are
Slice A costs only, not final B/C costs. Browser raster suites/showcase and raw
legacy suites were not rerun or claimed as additional green gates here.

## Self-check and handoff

Universal checklist satisfied: correctness validated; defaults followed; cohesive
production files at most 400 lines; functions at most 49 lines; nesting at most
three; comments describe intent/invariants; tests proportional to naming/ownership
risk; lint/tests pass. No new approved exception. No Changesets system is present.

Slice A is implemented, not independently verified. Parent Builder can pass the
actual uncommitted manifest to B, preserving the f97 baseline. Auditor should
review this delivery's schema/receiver/identity contract and all staged, unstaged
and untracked scope when the parent schedules the integrated B/C audit. No audit
or delivery authority is inferred from these Engineer checks.
