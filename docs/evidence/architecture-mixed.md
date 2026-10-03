# Slice E delivery — implemented, not independently verified

Date: 2026-10-03. Integration owner: Engineer; no nested delegation.
Exact cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
Branch: `feature/measured-flow-tables`. Base and HEAD:
`ac60f80675a2042f2f6043bae51b541b85e7251f`.

The caller reports A–D independently verified. The actual initial state was
60 modified tracked files and 179 untracked files, with nothing staged and no
commits above base. This was captured before runtime edits in
[architecture-mixed-baseline.json](architecture-mixed-baseline.json); the recorder
itself was the only E file present at capture and is explicitly excluded from
that initial 179 count. Do not rerun the recorder: its exclusive-create flag
protects the archive. Earlier evidence/status records remain untouched.

The final [architecture-mixed-delta.json](architecture-mixed-delta.json) gives
baseline/current byte lengths and SHA-256s, E changed/added paths, the complete
cumulative tracked/untracked scope and protected-file outcomes. The delta excludes
its own recursively changing hash. `npx tsx scripts/report-slice-e.ts` regenerates
only this E delta, checks HEAD/staging, verifies protected baseline hashes and
proves the prior architecture/native API bodies are unchanged beneath the new
prelude/appendix. 133 explicitly protected historical/legacy/font/CMR/numerical/
roadmap/Pages paths remain byte-identical to the actual E baseline.

## Implemented contract and bounded scope

See [documents.md](../documents.md) for the actual API and choices:

- coherent root Document/Page/Flow/Block/Paragraph/Span on the existing core JSX
  runtime, with readonly pure-data constructors and native node arrays;
- fixed → flow → fixed → flow ordered concatenation, no unused-fixed-space
  donation, preserved one-page empty flows/intentional breaks, explicit zero-page
  document rejection;
- singular frozen PageSize A4/A5/Letter/Legal, explicit point/mm/in custom helper,
  mutation-free preset/custom orientation;
- opaque section/slot normalization, provider snapshots and one shared operation,
  source/measurement resources, global page/output budgeting and finalization;
- final PageInfo document numbering, one-based section numbering, zero-based flow
  ordinal with one-based local page numbers; fixed pages expose `flow: null`;
- readonly PageContext/FragmentContext without Provider or setter; separate hidden
  nominal WeakMap-owned binding capabilities prevent a public read handle from
  rebinding even through the internal operation seam;
- generic first/all/last reservation machinery for Block.Header/Body/Footer;
  owner-local final fragment totals, opaque emissions, no recipe preview/retry,
  no phantom wrappers for empty recipe output;
- final native/semantic regions, explicit hidden constrained blocks, normalized
  vertical overflow errors, inherited Flow adapters and closed measurement scopes;
- layout/ordinary-lower exact bytes, including the existing native primitive
  registry/resource-metadata semantics;
- bounded optional mixed showcase: fixed cover → flow → fixed appendix, presets,
  orientation/theme, header/footer toggles, actual Page N/total footers, exact raw
  source, Blob invalidation and delayed-chunk cancellation;
- prepared-font Chromium proof comparing the complete page/fragment metadata,
  placements and exact PDF bytes with Node.

Core remains layout-independent. The optional inventoried `core/internal-drawing`
entry installs document drawing support without leaking native document lowering
into the standalone table closure. All original table negative controls remain.
The root layout graph now intentionally includes mixed-document authoring; its
positive control is explicit. Six optional showcase chunks replace the original
five because exactly one new mixed demo was added, not because a check was skipped.

Not changed: F separate tables/cell migration, G, images/#33, numeric/32-ULP
certification, D ink rules, fixed CMR source/digests, existing optional parser
limits, legacy source, original evidence/assets/roadmap or deployment settings.
No staging, commit, push, PR, merge, tracker change, release or deployment occurred.

## Final gates — actual full cumulative worktree

All commands below ran from the exact cwd above at the unchanged HEAD, with the
runtime delivery unstaged/untracked. This is implementation evidence, not an audit.

| Exact command | Outcome |
| --- | --- |
| `npm run format:check` | PASS; 375 formatter-selected files |
| `npm run lint` | PASS; Biome error-level checks and full native ESLint principles |
| `npm run typecheck` | PASS; all package builds plus workspace `tsc --noEmit` |
| `npm test` | PASS; **311** native/consumer/integration tests, zero skips/failures; includes 17 focused E tests and all prior adversarial/raster controls |
| `npm run test:consumer` | PASS; six fresh external tarball closures, NodeNext/Bundler readonly JSX/data/context types, ES2022-only consumer libraries, runtime parity |
| `npm run check:licenses` | PASS; actual six tarballs, full project MIT, unchanged notices, no font assets shipped |
| `npm run build:showcase` | PASS; fresh `/updf/` local production build, optional mixed module/raw source and six dynamic chunks |
| `npm run test:showcase` | PASS; **19** real Chromium/site cases, zero skips/failures |
| `npm run build:browser` | PASS; **11** fresh browser builds |
| `npm run check:graphs` | PASS; all 11 closures, core/optional boundaries and inventoried seams |
| `npm run sizes` | PASS; actual measurements recorded in ignored artifacts |
| `npm run test:browser` | PASS; **9** Chromium cases, including new mixed prepared-font/context proof and unchanged SVG raster tolerance |
| `npm run test:legacy` | **Known inherited FAIL**, raw 0 passing/1 failing (`container` toString error); no legacy remediation or passing-legacy claim |
| `npm run test:legacy:comparison` | PASS equivalence; isolated full corpus remains **18 pass/1 pending/6 fail**, identical recorded output bytes/hash; this is not a passing raw legacy gate |
| `git diff --check` | PASS |

New real PDF proof (`npm test`): `artifacts/mixed/mixed.pdf` has six ordered pages
with different fixed-page dimensions and two flow sections including an empty
one. qpdf parses it; Poppler extracts HEADER → ordered L1–L9 → final Page N/6.
72-DPI PPM checks separate red body ink from blue reserved-footer ink. A valid
native PDF mutant moving the footer into the body is rejected by the spatial
oracle. The showcase download separately extracts every Page N/total, including
both fixed pages; all preview/download bytes equal Node's actual output.

Final measured bytes (not regression completion claims): core bundle 49,793
(gzip 15,107), VDOM 68,367 (19,282), measurement 25,504 (7,893), root layout/flow
143,072 (39,530), standalone tables 121,211 (34,268). The historical fixed CMR
remains 5,779 bytes with its existing hard digest assertions passing. The optional
font browser proof's >500-kB Vite warning remains visible; no tolerance/budget was
changed to silence it. The caller's known SVG black-frame intermittency did not
occur in the final E run; no SVG retry or tolerance modification was needed.

Earlier development runs exposed a genuine document-lowering dependency leak,
the old five-chunk expectation, declaration portability and size-limit violations.
They were fixed and the full commands above rerun against the final runtime scope;
none was waived or skipped. The raw inherited legacy failure is still explicit.

## Code-principles self-check

- Correctness: phase separation, counts, operation ownership, immutable captures,
  source diagnostics and independent PDF/raster negative controls exercised.
- Defaults/exceptions: **no new approved exception, unsafe any, broad waiver or
  lint suppression**. Caller-authorized inherited legacy failures/source audit
  findings remain out of scope, not silently repaired or described as passing.
- Responsibility/size: touched native files remain cohesive and ≤400 lines;
  functions ≤49 effective lines and nesting ≤3, enforced by the unchanged gate.
  The new E tests were split rather than exempted from the same limits.
- Comments: only capability/ownership/invariant intent, no mechanical narration.
- Risk-based tests: 17 new native tests plus two site tests, one real browser proof
  and packed-consumer positive/negative typings. Existing A–D protections all run.
- Lint/tests: native gates pass as recorded; preserved raw legacy failure and
  baseline-equivalence result are explicitly distinguished.

## Audit handoff and delivery checks

Tracker state was not mutated (explicitly forbidden). Assignment status:
**implemented, ready for independent Auditor; not verified**. F/G remain separate.

Read/check the actual delivery with:

```sh
pwd
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git diff ac60f80675a2042f2f6043bae51b541b85e7251f..HEAD --name-only
git diff --cached --name-only
git diff --name-only
git ls-files --others --exclude-standard
git diff --check
git status --short
```

Committed and staged scope: **empty**. The cumulative worktree retains all 60
modified tracked paths; every E change is unstaged or untracked, not committed.
Use the E manifest to separate its delta from the independently verified A–D
uncommitted baseline rather than auditing only `git diff` (the entire layout
package and many foundation files are still untracked).

Auditor should independently verify hidden-binding ownership/closure, captured
provider environments on reused slots, global quotas across fixed/two-flow
documents, empty/first/all/last decoration accounting, native and semantic final
overflow without feedback, registry parity/closure boundaries, portable data and
declarations, the six-page PDF/raster mutant, actual mobile/chunk cancellation and
preservation hashes. Existing legacy failures and SVG intermittency are inherited
risks, not grounds for an implementation-side verification claim.
