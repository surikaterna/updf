# Rich-only measurement — E1 implementation handoff

Issue: N/A (assigned E1 slice; no tracker mutation authorized). Implementation,
not independent verification. Parent Builder is integration owner.

## Delivery state

- Worktree: `/home/sprawl/projects/updf/trees/rich-only-text`.
- Branch: `feature/rich-only-text`.
- Base and unchanged HEAD: `ad0529e1f579fdff2ea7c9b72e9a7386bdc14e03`.
- Clean on entry; every current dirty file is this Engineer's E1 scope.
- All changes are unstaged/untracked. No stage, commit, push, PR, publication,
  tracker mutation or other-worktree edit was performed.

## Completed acceptance

`RichTextInput` contains only readonly `width: number`, optional `height: number`,
and readonly `paragraphs: readonly ParagraphDefinition[]`.
`TextMeasurementInput = RichTextInput`; `PlainTextInput` is removed from source
types/exports. No `kind`, plain form, adapter or compatibility flag remains in
measurement. Canonical styles require explicit font, fontSize and color.

Both factories share the rich-only measurement closure. Standalone factory options
accept only runtime; service defaultFont remains meaningful for layout/flow style
resolution and temporary native fixed nodes. All six runtime callbacks and all
nine service methods remain. Own optional undefined values are rejected.

Bare roots reject TYPE; former discriminators (including rich) and top-level
text/font fields reject KEY at their field paths. Consumers in core rich-node
measurement, inline/layout/table flows, component tests, apps, declaration
templates, dual-format consumers and cost profiles author canonical paragraphs.
The one-run shorthand is test-only, not a public production input form.

Rich empty-list/empty-paragraph semantics, LF paragraph index, UTF-16 spans,
code-point quotas, preflight/accessor checks, relative exact-fit arithmetic,
resource budgets and output ownership remain covered. The source-depth fixture
now checks the actual structured depth (4 passes, 3 fails), rather than a flat DTO.
Risk-based additions cover strict forms across Helvetica/prepared/host sources
and both factory measurement paths, exact seven-container quotas, supplementary
spans, undefined/accessor rejection, and packed negative declaration cases.

## Intentionally pending E2/E3

Native `type: text` rendering is unchanged. Its internal validation now receives
the actual native node, not a former measurement DTO; the native-only validator
and fixed-text helper remain until E2. This is an unpublished safe intermediate,
not full rich-only rendering completion. Playground measurement now reports rich
metadata while export still emits native fixed nodes; its reconstruction check
is not a claim that rich and fixed baselines are identical.

One-run measurement deliberately uses rich envelope/baseline and empty-paragraph
semantics, rather than old plain geometry. The focused measurement test asserts
baselines 8.75/20.75, LF indices [0, 0], and one empty-paragraph line explicitly.
No appearance golden or threshold was blindly replaced.

Cost profiles now use equivalent rich workloads on both sides. Historical
discriminators occur only in test-cost baseline calls; old plain DTO parity is
marked an accepted contract change, not passed parity. The historical PDF raster
controls remain intact. Full cost/size proof is deferred to E3, not claimed here.
To generate profiles against an older separated-package library use
`npx tsx scripts/sizes.ts BASELINE_ROOT current OUTPUT discriminated`; historical
pre-extraction `baseline` mode also authors rich workloads.

## Validation

Commands run in the delivery worktree unless explicitly noted:

| Command | Final result |
| --- | --- |
| `npm ci --ignore-scripts` | Pass; worktree-local dependencies installed, lock unchanged |
| `npm run format` / `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome plus AST 400-line/49-line/depth-3 principles gate |
| `npm run typecheck` | Pass, including the full root build and legacy compile |
| `npm test` | 818 passed, 0 failed/skipped/cancelled (predecessor had 815 tests) |
| `npm run test:consumer` | All ten external tarball closures, NodeNext/Bundler and dual CJS/ESM passed |
| `npm test -w @updf/layout-playground` | 12 passed |
| `npm run build -w @updf/layout-playground` | Pass |
| `npm run build:browser` | Pass; Vite reports its large browser-fonts chunk warning, no size claim |
| `npm run build:showcase` | Pass, including showcase typecheck |
| `npm run test:showcase` | 67 passed |
| `npm run test:browser` | 11 passed |
| `npm run test:browser -w @updf/layout-playground` | 5 passed |
| `npm run check:graphs` / `npm run check:licenses` | Pass |
| `git diff --check` | Pass |
| `npx tsx scripts/consumer/rich-only-proof.ts /tmp/opencode/rich-only-e1-baseline` | Pass: 1,030 immutable source files, 18 rich DTO/error comparisons, 2 native byte comparisons |

The baseline was captured before edits using git archive of the exact base:
`/tmp/opencode/rich-only-e1-ad0529e.tar`, SHA-256
`6a7a346b07a0a8e58a986f4cae6503b0271d0e4d942936dbdb473b0fc78525ca`.
It was extracted to `/tmp/opencode/rich-only-e1-baseline`, installed with
`npm ci --ignore-scripts`, and built with `npm run build`; no baseline suite or
final bundle-size benchmark was needed for this focused proof.

Final logs: `/tmp/opencode/rich-only-e1-final-test.log`,
`rich-only-e1-showcase.log`, `rich-only-e1-browser.log`, and
`rich-only-e1-playground-browser.log` in the same temporary directory.
Early attempts exposed two remaining standalone-default fixtures and a new
boundary allowlist entry, fixed before final checks. One test attempt raced with
my rebuilding dist files; the stable sequential run supersedes it. The first
combined showcase command timed out; the dedicated 300-second run completed.
No failed gate or known running check is abandoned/waived.

## Code principles and next owner

All universal checklist items self-checked: correctness and strict defaults;
cohesive production files below 400 lines; functions below 50 and nesting at most
3; intent/invariant comments; risk-based tests; lint and tests passing.
No approved exception or new suppression. No Changesets workflow exists here.

Auditor should inspect the complete unstaged/untracked diff against the base,
especially native-only validation versus public measurement rejection, strict
declarations/closure capture, source quota accounting and rich-vs-rich predecessor
proof. E2 native constructors/rendering and E3 runtime simplification/final cost
proof are fresh assignments after this independent E1 audit.
