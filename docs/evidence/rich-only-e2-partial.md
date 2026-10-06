# E2 native plain removal — incomplete handoff

Historical partial snapshot. The continuation results and current delivery status
are recorded in [rich-only-e2-completion.md](rich-only-e2-completion.md); the failures
below remain preserved as evidence of the original stopping point.

Objective: remove native plain input end-to-end, without compatibility normalization.
Issue: N/A. **E2 is incomplete, not implemented or independently verified.**
Parent Builder is integration owner; a fresh continuation assignment is needed
before completion audit. No tracker mutation is authorized or performed.

## Actual delivery state

- Worktree: `/home/sprawl/projects/updf/trees/rich-only-text`.
- Branch: `feature/rich-only-text`.
- Base and unchanged HEAD: `ad0529e1f579fdff2ea7c9b72e9a7386bdc14e03`.
- Entry: 58 modified and 5 untracked inherited E1 files, independently audited
  according to the assignment. All untouched inherited files remain unchanged.
- E2 changes overlap inherited core measure/validate/resources, text service,
  playground PDF and boundary inventory. The inherited untracked temporary
  `packages/text/src/native-validation.ts` was intentionally removed for E2.
- Entire delivery remains unstaged/untracked; no commit, staging, push, PR,
  delegation or other-worktree edits. Legacy renderer/certification is untouched.

## Completed source removal

- `TextNode` leaves core types, public exports and `NodeDefinition`.
- `MeasuredText` and native-only `MeasuredLine` leave plans/resources exports.
  Public `TextMeasurement.lines` and its line types remain.
- Native `text` leaves VDOM tags/props; `TextProps`/`TextChildren` exports leave.
  Native text concatenation (`textContent`, `textStep`, `textContainer`,
  `TextOutput`) is deleted, with its imports and native plain quotas/origins.
- Core plain validation, measurement, content, resource traversal and ink
  branches are deleted. Unknown native `text` fails TYPE at its `/type` path.
  Rich positioned schema remains x/y/width/height/paragraphs, version 1.
- Text service has seven callbacks: measure, validate, rich, inline,
  validateStyle, resolveStyle and lineBox. Capture rejects removed/unknown
  keys, retains own-field checks and original receiver/callback ownership.
- `fixed`, `fixedInk` and output validators are removed. Full-service validate
  consumes canonical rich measurement data only. `fixed-text.ts` and temporary
  `native-validation.ts` are deleted; unused `metrics()` fixed wrapper is deleted.
- Layout native VDOM conversion and generated-output scan lose plain branches.
- Generic PDF text painting, font-provider `collectText`, opaque run/resource
  composition, rich paragraph/Span layout and authoring defaultFont remain.
- Six runtime capabilities and runtime fixed/rich modes remain for E3, as assigned.
  No runtime simplification or cost/size claim is made.

## E2 file manifest (in addition to inherited E1 scope)

- Core: `src/{types,index,resources}.ts`,
  `src/core/{content,document-resources,ink,measure,plan,text-output,text-service,validate}.ts`,
  `src/vdom/{create,index,native,types}.ts`;
  new `test/rich-only-native.test.ts`.
- Text: `src/{service,metrics}.ts`, deleted `src/fixed-text.ts` and inherited
  untracked `src/native-validation.ts`; `test/text-runtime.test.ts` migrated.
- Layout: `src/{native-vdom,output-scan}.ts`.
- Apps: `browser-fonts/flow-proof.ts`, `cmr/src/{cmr,cmr-tree}.ts[x]`,
  new `cmr/src/cmr-paragraph.ts`, `layout-playground/src/pdf.ts`,
  `node/src/{font-proof,heading,hello,optional,painting-document}.ts[x]`,
  `showcase/src/{branding,chart,fixed-pages,painting,text}.ts[x]`.
  CMR paragraph building is domain authoring, not a public plain-props adapter;
  resources remain external composition. No legacy baseline offsets are added.
- Scripts: `boundaries.ts` removal inventory; new
  `consumer/native-rich-proof.ts`; this handoff evidence.

## Required remaining work / blockers

1. Migrate test fixtures and all native consumers. Main shared entry points:
   `packages/layout/test/fixtures.ts`, `tests/fixtures/fonts/font-fixture.ts`,
   `tests/fixtures/chart.ts`, core render/context/VDOM/resource-provider/text-paint
   tests, host-runtime/service tests, mixed document/PDF and inline/browser proofs.
   Old tags and `.lines`/plain fields must become canonical paragraph/fragments
   assertions; do not delete ownership, quota, glyph or corruption coverage.
2. Migrate packed runtime fixtures (`scripts/consumer/fonts.ts` stops first),
   all affected declaration templates and dual loaders. No ten-closure or
   17-template completion claim: root compilation and packed consumers fail.
3. Update active user docs/API examples and export descriptions; inherited E1
   docs still describe temporary native plain support. Historical evidence stays
   historical. Existing E1 proof still contains a deliberately historical native
   plain comparison and is not an E2 gate; new proof covers rich versus rich.
4. Review/retire former plain geometry expectations meaningfully. Playground
   `test/pdf-tools.ts:68` expects bbox top 20 but canonical rich produces 22.798;
   its two PDF tests and one browser PDF-download test fail. No oracle threshold
   or per-font baseline fudge was changed. CMR exact anchors/digests, Unicode
   fields and legacy-native compatibility expectations still need migration and
   meaningful text/order/bounds/raster controls; no golden was replaced.
5. Rerun every required gate after completion. Current passes do not waive failures.

## Validation evidence

Commands run in the exact delivery worktree. Common builds completed before the
final suite/consumer/browser checks; an earlier playground run overlapped a build
and is superseded by the stable sequential playground result below.

| Command | Result |
| --- | --- |
| `npm run build` | Pass through all packages/apps and legacy compile |
| `npm run typecheck` | Fail after successful build: old native test/template declarations; log below |
| `npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext packages/core/test/rich-only-native.test.ts` | Pass, including obsolete-export/tag negative type probes |
| `npx tsx --test packages/core/test/rich-only-native.test.ts packages/text/test/text-runtime.test.ts packages/text/test/rich-only-contract.test.ts` | 13 pass, 0 fail/skip/cancel |
| `npm test` (final stable run) | 820 observed: 712 pass, 108 fail, 0 skip/cancel |
| `npm run test:consumer` | Fail in packed font runtime fixture: obsolete native tag TYPE at `/pages/0/children/0/type` |
| `npm run build:browser` / `npm run check:graphs` | Pass on fresh browser outputs |
| `npm run build:showcase` / `npm run test:showcase` | Pass / 67 pass |
| `npm run test:browser` | 6 pass, 5 fail: four unavailable proof outputs time out; Unicode CMR reports Unsupported node type |
| `npm run build -w @updf/layout-playground` | Pass |
| `npm test -w @updf/layout-playground` | 10 pass, 2 fail: bbox top mismatch described above |
| `npm run test:browser -w @updf/layout-playground` | 4 pass, 1 fail: same bbox mismatch |
| `npm run build -w @updf/layout` | Pass after output-scan branch removal |
| `npm run format` / `npm run format:check` / `npm run lint` / `git diff --check` | Pass; Biome plus actual AST 400/49/depth-3 gate |
| `npm run check:licenses` | Pass, actual ten-package tarball licenses |
| `npx tsx scripts/consumer/native-rich-proof.ts /tmp/opencode/rich-only-e1-baseline` | 30 rich-before/rich-after cases pass: identical PDF bytes, qpdf validity, text/bbox and 72-dpi PPM rasters |

The rich proof uses Helvetica/prepared fonts, all three alignments, LF, spaces,
empty runs and Unicode. Before library is the immutable base captured and
source-hash-checked in E1 evidence, not an old plain geometry control. Final
artifacts: `/tmp/opencode/native-rich-e2-gC5DA2`.
Logs under `/tmp/opencode/`: `rich-only-e2-final-partial-test.log`,
`rich-only-e2-partial-typecheck.log`, `rich-only-e2-consumer.log`,
`rich-only-e2-{browser,showcase,playground,playground-browser}.log`,
`rich-only-e2-{browser,showcase}-build.log`. All checks finished; none are pending.

## Code-principles self-check / next owner

Defaults, cohesive files, <=400 lines, <50-line functions, depth <=3 and
intent-only comments pass the automated gate. Risk-based tests were added for
strict removal paths, rich geometry/empties, seven-method ownership/capture and
canonical validation; no approved exception or suppression. Correctness is only
partially validated, and the required all-tests-pass checklist item is **not met**.
No Changesets workflow exists here.

Builder should assign remaining E2 migration/geometry work, preserving this
manifest and all inherited E1 changes, then request independent Auditor review
only after the complete acceptance/check matrix passes. E3 remains separate.
