# GH#53 — terminal normal-flow Block auto top margin

## Delivery state

Engineer implementation, ready for independent audit; **not independently verified**.
Issue: <https://github.com/surikaterna/updf/issues/53>, currently OPEN. This local
implementation does not establish merge or independent-audit status. Integration
and release remain pending.

- Worktree/cwd: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Assigned base and unchanged HEAD: `35318c48598dc414254a0a7abc657d699174fa15`.
- Initial tree was clean. All changes below belong to this assignment.
- Before delivery, there were no new commits, staged changes, pushes, PRs, nested
  delegation or Git discards. Changes were kept in the exact manifest below.
- Generated artifacts/build outputs are ignored, not delivery files.

## Exact source manifest

Modified tracked files:

```text
apps/browser-fonts/flow-numerical-proof.ts
docs/blocks.md
docs/documents.md
docs/text-styles.md
packages/layout/src/block-compiler.ts
packages/layout/src/column-sizing.ts
packages/layout/src/container-producer.ts
packages/layout/src/container-types.ts
packages/layout/src/content-line-containers.ts
packages/layout/src/content-measure.ts
packages/layout/src/content-normalize.ts
packages/layout/src/mixed-layout.ts
packages/layout/src/paginator.ts
packages/layout/src/protocol.ts
packages/layout/src/row-compiler.ts
packages/layout/src/row-producer.ts
packages/layout/src/row-types.ts
packages/layout/src/sizing.ts
packages/layout/src/stack.ts
scripts/boundaries.ts
scripts/packed-consumer.ts
scripts/style-consumer-cost.ts
tests/consumer/types/composable-tables-template.tsx
```

New/untracked files:

```text
apps/browser-fonts/auto-margin-proof.ts
docs/evidence/auto-margin53.md
examples/auto-margin.tsx
packages/layout/src/auto-margin.ts
packages/layout/src/content-role.ts
packages/layout/test/auto-margin-boundaries.test.ts
packages/layout/test/auto-margin-context.test.ts
packages/layout/test/auto-margin.test.ts
tests/consumer/types/auto-margin-template.tsx
tests/integration/auto-margin.test.ts
```

No core normalization, bounds, geometry, native painting, table production code,
dependency manifests, historical cost artifacts, or showcase sources changed.
No #54 positioning, #55 iterative alignment, #56 distribution or general margins.
The role helper extraction keeps the near-400-line normalizer cohesive and bounded.
Row producer metadata only carries the no-clipping invariant through Columns;
it does not establish an alignment region or change Row alignment.

## Completed contract and implementation

- Public `BlockStyle.marginTop?: "auto"`; explicit `keepTogether: true` required,
  including height-atomic Blocks. RowStyle/ColumnStyle explicitly omit the field.
  Paragraph/Span and existing table/column/row/cell styles remain excluded.
- Known value/keep-policy and wrong-role guards precede descendants. Invalid
  values, numeric/null/present-undefined margins reject `VDOM_HIERARCHY` at the
  actual authored `/style/marginTop`. Accessors reject without being invoked.
  Unknown styles retain the existing strict schema rejection.
- Complete normalized body sequences are checked before compiler measurements or
  fragment callbacks. Direct Flow conversion now receives the whole body, not one
  sibling at a time. Arrays, Fragments, ordinary wrappers and providers are
  transparent; null/boolean/no-output wrappers disappear. Empty Paragraphs,
  zero Blocks/spacers and PageBreak remain real siblings. Leading breaks are
  allowed under existing container rules; following siblings or multiple auto
  Blocks reject, even with zero height. Header/footer slots are not body siblings.
- Origins are private occurrence WeakMap entries, not public author props.
  Native data receives whole-body/tree preflight before measurements too.
- Direct Flow body has an explicit nominal alignment height from the template,
  after margins and header/footer reservations. Comparison capacity stays under
  the existing certified arithmetic policy; it is not used to enlarge auto space.
- Explicit-height Block content uses its resolved border-box height minus its
  own padding/borders. Outer Block decorations are outside that border box and
  are not subtracted twice. Natural/kept/min-only/max-only Blocks have zero auto
  space. Row/Column add none; nested explicit-height Blocks can establish their
  own region. Unpaginated root height constraints are limits, not layout heights.
- Shared `alignedRequest` fits the full decorated atomic height before callbacks,
  then selects at the actual offset. Margin and child height advance the private
  cursor separately; placement boxes exclude margin. Candidate budgets/states
  fork and only accepted candidates are adopted. No spacer node/source item or
  implicit page advance is introduced.
- Explicit-height unused trailing blank is replaced, not duplicated. Stack
  margin and child intervals enter the same compensated generated sequence;
  original child fragments/certificate ownership are retained, not copied.
  Measurement consumes the compiled content region and the same alignment helper
  and compensated prefix sequence, rather than a translated-y remainder formula.
- Flow partial-fit failure defers once and recomputes on the fresh body; fresh
  failure remains `LAYOUT_OVERSIZED`. Explicit parents retain constrained
  `VERTICAL_OVERFLOW`, not internal pagination. Ancestors cannot clip an aligned
  child or its explicit alignment parent to fit, including through natural/Row
  wrappers. Exact fit is zero auto space; zero-height children retain finite
  extent progress at the endpoint. Existing gaps and non-feature clipping stay
  unchanged.
- Final PageContext/FragmentContext callbacks retain captured providers and run
  once per emitted occurrence after pagination; page/node exhaustion precedes
  forbidden final callbacks. No repagination/preview was added.

The public TSX/data example is `examples/auto-margin.tsx`. Its 160pt page has
10pt margins, header 12, footer 18, body `[22,132]`; preceding 30, child 20 gives
60 auto points and summary start 112. The nested 100pt parent with padding 4,
border 1, gap 5, preceding 20 and child 15 places the child at 80, ending at 95.
Both positive geometries are asserted, alongside natural-parent zero alignment.

## Risk-based proofs

Twenty-two new npm tests cover terminality, wrappers/slots/native records,
explicit keep policy, excluded roles, strict unknown/undefined/null/numeric and
accessor controls, exact/zero/no-free-space, page transition/fresh oversize,
natural versus explicit regions, own decorations/gaps, fractional origins
0.1/43.1/55.2, measured line/ink parity, clipping negatives, snapshot/source
intervals, adapter callback count, repeated provider/owner contexts and budgets.

The integration test uses public TSX and data forms. Actual bytes equal an
independently positioned ordinary fixed control with summary y=112. qpdf checks
four actual PDFs; Poppler extraction asserts every word once, bbox and 144dpi
PPM are identical for actual/control. Two deliberately moved PDFs put the summary
over preceding body (y=32) and over footer (y=132). The independent containment
oracle rejects both and their actual rasters differ from the accepted document.
These are overlap-oracle negatives, not a claim that core checks sibling overlap.

Clean packed consumers exercise public TSX/data runtime and NodeNext/Bundler
negative typing, including Row/Column and existing table roles. The browser's
existing numerical proof now includes the auto-margin success and invalid-value
diagnostics; Node/Chromium results and layout/lower/render bytes match exactly.

## Final gates

Node `v24.21.0`; Chromium `152.0.7977.82 Arch Linux`; qpdf `12.4.1`;
Poppler `26.08.0`. All checks use the worktree and unchanged HEAD above plus
the complete unstaged/untracked source manifest. No checks remain running.

| Exact command | Final result |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS Biome error gate and code-principles ESLint |
| `npm run typecheck` | PASS; all workspace builds and root `tsc --noEmit` |
| `npx tsc --noEmit` | PASS after final test/packed fixture changes |
| `npx tsx --test packages/layout/test/auto-margin*.test.ts packages/layout/test/fractional-reservation.test.ts tests/integration/auto-margin.test.ts tests/integration/fractional-reservation.test.ts` | PASS 30/30, zero skips |
| `npm test` | PASS 614/614 (592 baseline + 22), zero skips; fixed CMR hashes/geometry and existing PDF negatives included |
| `npm run test:consumer` | PASS seven clean external tarball closures, NodeNext/Bundler typing/runtime ownership |
| `npm run build:browser` | PASS all 12 Vite build graphs |
| `npm run check:graphs` | PASS all graphs/internal-import inventory |
| `npm run test:browser` | PASS 10/10, zero skips, Chromium 152; #53 numerical proof included |
| `npm run build:showcase` | PASS; unchanged showcase sources, integrated runtime smoke |
| `npm run test:showcase` | PASS 54/54, zero skips |
| `npx tsx scripts/style-consumer-cost.ts after auto53` | PASS three matching consumer scopes/metafiles, no optional dependency leakage |
| `node --import tsx --input-type=module -e 'import { autoMarginExample } from "./examples/auto-margin.tsx"; console.log(autoMarginExample().result.placements)'` | PASS; `[22,52]` body, `[112,132]` summary |
| `git diff --check` | PASS |

The browser-fonts >500k chunk advisory and non-gating Biome cognitive-complexity
warnings remain visible; no lint threshold, test oracle, skip or suppression changed.
Early iterations had corrected fixture/type/format issues and one in-memory cost
loader failure. The original `tsx -e` example invocation selected CommonJS and
failed import-only package exports; the documented ESM invocation above passes.
Final results supersede these attempts; no failing final gate is waived.

## Fresh consumer cost baseline and final delta

Baseline text-only/paragraph Flow capture ran **before feature edits** at the
assigned clean HEAD, evaluating the existing cost script in memory with only its
output URL changed to `artifacts/auto53/`. Bare `esbuild` was resolved to its file
URL for that in-memory ESM execution. Historical `artifacts/style49/before-*`
was never overwritten. Reports include exact entry source, options, Node/esbuild
versions, module lists and metafiles; imports resolve to workspace sources.

The new fixed-geometry scope imports core only. Its baseline was captured with
`npx tsx scripts/style-consumer-cost.ts before auto53 fixedGeometry`; core source
was unchanged from the assigned base. The script now accepts an isolated output
prefix and optional single scope, retaining its historical default prefix.
All after reports assert matching input/options/tool versions against those fresh
before reports. Artifacts are local ignored evidence, not staged delivery files:

```text
artifacts/auto53/{before,after,delta}-textOnly.json
artifacts/auto53/{before,after,delta}-paragraphFlow.json
artifacts/auto53/{before,after,delta}-fixedGeometry.json
```

| Scope | Before raw / gzip | After raw / gzip | Raw / gzip delta |
| --- | --- | --- | --- |
| textOnly (fixed native text) | 39,498 / 13,973 | 39,498 / 13,973 | 0 / 0 |
| fixedGeometry (native rect + text) | 39,579 / 14,005 | 39,579 / 14,005 | 0 / 0 |
| paragraphFlow | 150,037 / 48,964 | 153,216 / 50,003 | +3,179 / +1,039 |

Paragraph Flow retains 134 modules versus 132 before: `auto-margin.ts` and
`content-role.ts` are added, none removed. This is **real flow-closure growth**,
not a claim that unused auto alignment tree-shakes out of the Flow consumer.
Fixed core scopes remain unaffected; no optional package or React leakage is added.

## Code-principles self-check and limitations

- Correctness/strict ownership/source admission validated by risk-based positives
  and negatives; original fragments retain certificate identity.
- Defaults followed; **no approved code-principles exception** or suppression.
- Production files remain cohesive and at/below 400 lines; functions below 50,
  nesting within the configured three-level limit (authoritative ESLint passes).
- Comments explain intent/invariants only.
- Tests added proportional to pagination/measurement/callback/PDF risk.
- Format/lint/typecheck/tests pass. No Changeset: repository does not use Changesets
  and these packages are private/unreleased.

The #51 restricted native-materialization acceptance remains mandatory. The
37 × 31.2pt semantic exact fit still rejects native clip endpoint
31.200000000000003 with core `BOUNDS`, including with zero auto margin. No blanket
ULP allowance, native clip-width change, page bounds relaxation or paint shrink.
Chromium 154/#50 SVG and prior #48 qualifications remain unchanged; this assignment
uses passing Chromium 152 and does not claim those separate issues resolved.
Ordinary components needed for wrapper expansion can run before terminality is
known. General/multiple/nonterminal/fragmentable auto margins remain unsupported.

No remaining implementation acceptance item under this bounded contract.
Auditor should review this actual working-tree manifest, complete-body callback
ordering, explicit versus natural region propagation, compensated margin/child
reservation and original certificate ownership, line/ink parity, no-clipping
guards, once-only late contexts, and the unchanged strict #51/page-edge controls.
Independent audit and any authorized integration/commit/tracker delivery remain.
