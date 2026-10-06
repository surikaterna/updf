# E2 completion: canonical rich consumers

Objective: complete native plain removal and migrate remaining consumers, tests and
active docs without a plain-input normalizer, native alias or baseline shim.
Issue: N/A. **E2 implemented, ready for independent audit; not verified.**
This continues [the preserved partial snapshot](rich-only-e2-partial.md), not E3.

## Delivery and ownership

- Exact worktree: `/home/sprawl/projects/updf/trees/rich-only-text`.
- Branch: `feature/rich-only-text`.
- Base and unchanged HEAD: `ad0529e1f579fdff2ea7c9b72e9a7386bdc14e03`.
- Parent Builder remains integration owner. Entry inherited E1 audited changes and
  E2 partial changes; they were preserved. This continuation owns only the
  consumer/test/docs/script paths listed below, including shared inherited files.
- No production renderer/runtime/font-provider source changed in this continuation.
  E2's inherited native removal is still the delivery source; generic PDF text-slot
  operators, font ownership and provider collection are retained.
- All delivery is unstaged/untracked. Nothing staged, committed, pushed or discarded;
  no PR, tracker mutation, delegation or other-worktree changes.
- Final Git scope: 129 modified tracked paths, one tracked deletion
  (`packages/text/src/fixed-text.ts`), ten untracked paths; zero staged paths.
  `git status --short` supplies the complete inherited-plus-continuation manifest.
- Builds/artifacts are generated ignored outputs, not a new Git delivery scope.

## Continuation file manifest

In addition to the E1/E2 partial manifests, this assignment changed:

- `apps/layout-playground/test/{pdf-tools,pdf.test}.ts`.
- `readme.md`, `packages/core/{API,README}.md`,
  `docs/{documents,measurement,native-api,text-styles}.md`,
  `docs/migration/fonts-text.md`, this evidence and the partial-snapshot pointer.
- `packages/core/test/{context,foundation-audit,policy,render,resource-providers,text-paint,vdom}.test.ts`
  and `documentation-examples.tsx`.
- `packages/fonts/test/{font-resources,provider,runtime}.test.ts`.
- `packages/layout/test/{auto-margin-context,block-policy,cancellation,decorations,extensions,fixed-emission-transport,text-composition}.test.ts`
  and `fixtures.ts`.
- `packages/text/test/{host-runtime,measurement-context,measurement}.test.ts`.
- `scripts/consumer/{cost-inputs,cost-proof,dual-text,dual,fonts,runtime,rich-only-proof}.ts`,
  `scripts/{layout-kernel-baseline,style-consumer-cost}.ts`.
- `tests/consumer/types/{fonts,native}-template.ts`,
  `{mixed,vdom}-template.tsx`.
- `tests/fixtures/{chart,rich-input}.ts`, `tests/fixtures/fonts/font-fixture.ts`.
- `tests/integration/{block-clipping,cmr-unicode,cmr,font-render,inline-audit-r1,mixed-document,mixed-pdf,painting,pdf-regressions,text-paint-names}.test.ts`,
  new `tests/integration/cmr-rich-proof.ts`.
- `tests/showcase/authoring.test.ts`.

The existing untracked rich-input and rich-only-proof files were extended, not
replaced. Removed exports/tags appear only in explicit negative probes. SVG XML
`<text>` unsupported-feature probes and HTML/DOM text remain unchanged.

## Acceptance and semantic changes

- Native/schema fixtures and packed runtime/dual-loader/declaration consumers now
  author `richText` with explicit paragraph `defaultStyle.font` and runs. Test-only
  `richNode` accepts rich geometry/paragraph overrides, not legacy TextProps.
- Full service has seven callbacks. Receiver/callback capture tests use externally
  owned WeakMap state rather than an unsupported extra service key; getter,
  replacement and original-receiver assertions remain.
- Nonfinite intrinsic probes exercise both native rich service and standalone
  measurement. Oversized finite ascent rejects earlier at rich lineHeight with
  `FONT_INK`. Custom rich outputs still test page-coordinate subtraction and
  native-baseline addition overflow at retained fragment paths.
- Immutable/cycle/source-descriptor/million-sibling probes use explicit rich
  component nodes. Their configured quotas and first-sibling descriptor assertions
  are unchanged. No quota, tolerance or unsafe-output validation was weakened.
- The strict fixed-block one-ULP bounds probe uses a rectangle with exact height,
  rather than requiring rich text to follow the removed fixed-text rounding policy.
  All rich geometry/envelope/positioning probes remain independently exercised.
- Empty labels use canonical paragraphs; empty paragraph lists and explicit empty
  paragraphs retain distinct intended semantics. Native rich rejects children
  concatenation and missing paragraph content; old native text fails TYPE.
- Synthetic font-provider tests bind real retained rich fragment/run identities and
  retain literal/hex, typed name escaping, laziness, ownership and mutation probes.
  Expected PDF syntax includes the existing rich q/Q and RGB operations.
- Fractional inline controls now compare whole/segmented canonical native rich
  paragraphs as well as Paragraph/Span output, retaining exact raster assertions.

### Geometry and golden rationale

Playground projection y is a **line-box origin**, not Poppler's physical bbox top.
Expected PDF y is now `line.y + baseline - line.top - fontSize * 0.718` (Helvetica
physical Ascender). Rich uses the supported ASCII envelope ascent 0.775 em and
half of line leading, so 14pt/18pt has local baseline 12.85 and physical bbox top
2.798, while the conservative ink envelope begins at 2. The new unit test checks
both lines, baseline/origin/ink distinctions and unchanged reconstruction origins.
The existing 0.02pt y and 0.002pt x PDF tolerances and displaced/missing/duplicated/
ordering/atomic raster controls are unchanged. Preview already used rich baseline;
no renderer-placement or font-offset fix was needed.

ASCII CMR used the removed fixed baseline `0.775 * fontSize`; canonical rich adds
`(lineHeight - fontSize) / 2` on each line (CMR lineHeight is 1.2 * fontSize).
Its new PDF SHA256 is
`cb826a04f161a18e472d9ed70aa9342be20356a91527eb90d1f46cfe1fc5a7bb`, replacing
`8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22` only in
current native regression expectations. Historical evidence/hashes and legacy
package/source/certification remain unchanged. Form rectangles, supplied labels,
font advances, ordering and page dimensions are unchanged.

The CMR golden is guarded by independent qpdf validity/page count, complete raw
word order, all word bbox positions/widths (1e-5pt), page dimensions and 144-dpi
visible ink in every expected label word. Physically displaced/missing-text PDFs
reject. Unicode CMR extraction, font physical bounds and tight raster checks pass.
Canonical rich before/after preservation also passes the immutable-base proofs.

Current cost script workloads are canonical rich for both sides. Old reports must
be regenerated; cost-proof rejects stale native plain profiles and its CMR path
feeds both engines the same current canonical AST. This is not a library forwarder
or historical plain appearance claim. No size/cost report or fair-baseline E3 claim
is made by E2.

## Final validation

All commands ran in the exact worktree above, sequential builds before dependent
checks. Logs: `/tmp/opencode/rich-only-e2-completion-*.log`. All checks finished;
there are no asynchronous handles to hand off.

| Command | Final outcome |
| --- | --- |
| `npm run format` | Pass |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome and full AST 400/49/depth-3 gate |
| `git diff --check` | Pass |
| `npm run typecheck` | Pass: full package/app/legacy builds then root tsc |
| `npm test` | **824 pass, 0 fail/skip/cancel** (partial snapshot: 712/820) |
| `npm run test:consumer` | Pass: ten clean tarball closures, runtime/dual loaders and configured NodeNext/Bundler templates |
| `npm run build:browser` / `npm run check:graphs` | Pass / pass on fresh outputs |
| `npm run test:browser` | Earlier fresh run 11/11; final default run 10/11 due black native SVG capture, retained below |
| `BROWSER_CHROMIUM=/tmp/opencode/issue41-chromium-software.sh npm run test:browser` | **11/11 pass**, one explicit software run |
| `npm run build:showcase` / `npm run test:showcase` | Pass / **67/67** |
| `npm run build -w @updf/layout-playground` | Pass |
| `npm test -w @updf/layout-playground` | **13/13** |
| `npm run test:browser -w @updf/layout-playground` | **5/5**, default Chromium |
| `npm run check:licenses` | Pass: actual ten-package tarball licenses |
| `npx tsx scripts/consumer/native-rich-proof.ts /tmp/opencode/rich-only-e1-baseline` | **30/30** exact rich PDF bytes, qpdf/text/bbox/72-dpi raster; output `/tmp/opencode/native-rich-e2-zJsdl6` |
| `npx tsx scripts/consumer/rich-only-proof.ts /tmp/opencode/rich-only-e1-baseline` | 1,030 immutable source hashes checked; **18** rich DTO and **2** rich native PDF comparisons pass |

### Browser infrastructure qualification — not silently waived

Preserved `rich-only-e2-completion-browser.log`: default Chromium 152.0.7977.82,
10/11; native SVG logo capture was solid black over the entire 640x400 canvas
including its white background. Nine application parity tests and analytic SVG
PDF corruption/area controls passed. A prior default fresh build/run in this
assignment passed all 11 tests. No suite source, thresholds or renderer changed.

The existing external wrapper is exactly:
`exec /usr/bin/chromium --disable-gpu "$@"`. Calibration on default and wrapper
each painted a white 20x20 canvas (1,600/1,600 white RGBA channels) and independently
captured the actual logo: both had white first RGB pixel, 113,079 white channels,
38,748 zero channels out of 768,000. This confirms intermittent capture failure,
not consistently malformed SVG or PDF placement. One software-rendered full run
then passed 11/11; its separate `browser-software.log` and executable flag are
preserved. No repeated default retry-until-green loop or code waiver occurred.
Auditor should retain this runner qualification and reproduce the software run;
default GPU stability remains an environment concern, not a claimed green final
default run.

## Code-principles and handoff

- [x] Correctness validated by complete root, packed, browser-qualified and PDF gates.
- [x] Strong defaults; no approved code-principles exception or new suppression.
- [x] Cohesive files and production <=400 lines.
- [x] Functions <50 lines; nesting <=3, enforced by actual AST gate.
- [x] Comments describe intent/invariants/tradeoffs only.
- [x] Risk-based tests added/updated for rich baselines/physical bbox, CMR golden,
  ownership, malformed rich numeric output, quotas and negative native declarations.
- [x] Lint and tests pass, with the explicit browser environment qualification above.

No Changesets workflow exists. Issue/tracker N/A; no lifecycle mutation authorized.
E2 is implemented, not independently verified. Auditor should inspect the entire
unstaged/untracked inherited-plus-continuation scope and verify no compatibility
alias/shim, meaningful baseline/golden oracle changes, resource/run ownership and
the runner qualification. Parent Builder decides audit/integration and delivery.

E3 remains separate: six runtime capabilities, fixed/rich runtime modes and final
host-fair size/cost proof are intentionally untouched. A discovered **pre-existing**
registry-name concern should be a separate linked follow-up if authorized:
`definePrimitive` lowercases names, while nativeTags contains mixed-case `richText`,
so `RichText` is not recognized by that override guard. No production fix was made;
native override regression coverage uses `Rect`. This does not restore the removed
native `text` tag or any public plain-input factory.
