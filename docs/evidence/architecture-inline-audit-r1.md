# D audit remediation R1 — D-F1 and D-F2 only

Status: **implemented, ready for independent re-audit; NOT verified**. Engineer is
integration owner, without delegation. The caller's audit reported D-F1 HIGH and
D-F2 MED despite earlier passing gates; the reported 96 measurement / 192 emission
probe results and already-passing prepared inline green-ink evidence are caller
evidence, not additional Engineer reruns or proof that these two findings were safe.
No E/F/G/Image work, tracker mutation, staging, commits, publication or deployment.

## Exact scope and preservation

- cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`
- branch: `feature/measured-flow-tables`
- base = HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`
- Entry: **60 tracked unstaged modifications / 174 untracked files**, nothing staged.
- New pre-edit capture: `architecture-inline-audit-r1-baseline.json`, **517 paths**
  with byte lengths/SHA-256, taken before tests or production changes.
- Remediation delta: `architecture-inline-audit-r1-delta.json`, excluding itself
  from the hash list. **Two existing files changed / five new files**, no missing paths.
- Final full scope: **60 tracked unstaged modifications / 179 untracked files**;
  zero staged files and zero new committed revisions.
- All **131 historical/protected paths**, all **39 pre-R1 evidence paths** and all
  **76 inventoried core/kernel paths** are byte-identical. Historical D baseline,
  delta and handoff were deliberately not regenerated or rewritten.

Only production changes:

1. `packages/layout/src/content-paragraph.ts`: choose the existing ink-neutral local
   wrapper for **any** negative nominal local x/y box coordinate. Root coordinate
   validity is strict; a narrow relative ink-fit comparison cannot waive a negative
   root x. No clamping, glyph shift, new epsilon, tolerance relaxation or validator
   modification. Existing positive upper-edge/ink comparisons remain unchanged.
2. `packages/layout/src/content-measure.ts`: include the complete unpaginated before
   decoration reservation in metadata translation before applying child insets/gaps.
   First/all/last entries are all selected for the complete single fragment, matching
   the existing decoration paint path. After reservations do not shift that block's
   text but remain included in natural height and following sibling positions.

Core `inline.ts`, glyph/line metrics, root validator, numerical certificates,
paginator, decoration producer, sizing and container painting are unchanged. No
new page/fragment-context API or special E phase was added. Public measurement
results remain deeply frozen.

## Reproduction and risk-based regression evidence

Before production edits:

```sh
npx tsx --test packages/layout/test/d-audit-r1.test.ts
```

Result: **four failures / zero passes**. The minimal preserved-space paragraph at
fontSize10.3 measured successfully but exact-height zero-margin layout rejected
`GEOMETRY` at `/pages/0/children/0/x`. The before-decoration case reported top0 rather
than top5; nested lines reported `[1,18,47]` rather than actual `[10,32,56]`.

After the focused fixes:

```sh
npx tsx --test packages/layout/test/d-audit-r1.test.ts tests/integration/inline-audit-r1.test.ts
```

Result: **six/six pass**. New tests cover:

- Unsegmented preserved-space fractional text on an exact-height zero-margin page;
  the negative nominal box remains negative inside its valid local wrapper, proving
  the fix does not clamp/shift it.
- Fractional sizes 10.3/10.51/11.7/14.2 and left/center/right alignment, segmented
  versus unsegmented text, public measured baseline/ink/native positions and deferred
  core context. Data and core JSX emit identical bytes for each content variant.
- Old low-level plain/rich controls still render and pass qpdf/extraction. For each
  alignment, real Poppler rasters are byte-identical between segmented, unsegmented
  and rich-control output: no visible glyph/ink drift.
- Before/after first/all/last controls have natural height17 and correctly shifted
  frozen line/fragment/baseline/ink metadata. Before5 now produces top5, baseline13.75
  and fragment/aggregate ink6..16; after5 keeps top0/baseline8.75.
- Nested mixed policies, padding, border, gaps and following siblings have expected
  size and coordinates. Public core measurement of emitted native text is used as
  an independent placement oracle, not the private layout helper under test.
- Real qpdf-checked nested PDFs, PNG/PPM raster artifacts and independent Poppler
  word boxes agree with public metadata, including line tops `[10,26,49]` and total66.

Artifacts: `artifacts/inline-audit-r1/`. There was no relaxation of renderer, glyph,
core geometry, raster or existing negative-control assertions. Intermediate gate
failures were a >49-line test helper and widened literal type in a test's h props;
the helper was extracted and the literal annotated, without waivers.

## Final complete-source gates

All ran at the exact cwd/branch/HEAD above, Node v24.21.0. Production source and new
tests were complete before the successful broad chain; only R1 evidence followed.

| Exact command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including 400/49/depth-3 principles |
| `npm run typecheck` | Pass: workspace builds and strict root checking |
| `npm test` | **294/294 pass**, all original 288 plus six R1 additions |
| `npm run test:consumer` | Six actual packed closures pass, NodeNext/Bundler/types:[] |
| `npm run build:browser` | All 11 builds pass; existing optional-font >500 kB warning retained |
| `npm run build:showcase` | Pass |
| `npm run check:graphs` | All 11 emitted module graphs and internal boundaries pass |
| `npm run sizes` | Pass; core49,793/15,107, flow112,090/31,547, tables114,208/32,286 raw/gzip bytes |
| `npm run check:licenses` | Six tarballs retain full MIT/notices, no font assets |
| `npm run test:browser` | **8/8 pass**, including D Node/Chromium parity and strict SVG reference cases |
| `npm run test:showcase` | **17/17 pass** |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Original digests unchanged |
| `qpdf --check artifacts/cmr.pdf` and `qpdf --check artifacts/cmr-unicode.pdf` | Pass |
| `git diff --check` and `git diff --cached --quiet` | Pass; no staging |
| `node /tmp/opencode/updf-inline-audit-r1-delta.mjs` | Pass: only the two intended source files changed; all protected/history/kernel hashes unchanged |

CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
Unicode CMR: `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`.

The earlier inherited raw legacy failures (18 pass/1 pending/6 fail), full-audit
45-vulnerability result and historical SVG black-frame failure/unchanged retry remain
disclosed in the preserved D evidence. Dependencies/lockfile were not changed and
those checks were not rerun for this bounded two-file remediation. No SVG reference
failure occurred in this full browser run; no new CI waiver is claimed.

## Self-check and next owner

- [x] Correctness validated with reproduced failures, public APIs/native placement
  and real PDF/raster evidence; no avoidable coordinate clamping or unsafe pattern.
- [x] Defaults followed; **approved exceptions: none**.
- [x] Cohesive production files <=400, functions <=49, nesting <=3.
- [x] Comments explain root-coordinate and unpaginated-reservation invariants.
- [x] Six risk-based test additions proportional to both confirmed audit findings.
- [x] Maintained lint/type/test/build/consumer/browser gates pass.

No Changesets convention exists; none was added. Tracker/Git delivery/deployment
mutation remains unauthorized. Local status is **implemented for re-audit**, not verified.

Auditor should check actual cwd, `git branch --show-current`, `git rev-parse HEAD`,
`git status --short`, `git diff`, `git diff --cached --quiet` and
`git ls-files --others --exclude-standard`; review R1 delta plus inherited dirty
delivery. Recompute R1 hashes rather than expecting the preserved historical D
manifest to match superseded source. Independently rerun the reported 96/192 probes,
fractional preserved-space emission, segmented/native/core-context controls, nested
before/after reservations and existing prepared-inline raster coverage. Inspect
qpdf/extracted word positions and raster artifacts. **No E before independent D
re-audit; implementation is not verification.**
