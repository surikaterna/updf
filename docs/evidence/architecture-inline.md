# D — unified Paragraph/Span, inline adapters and content measurement

Status: **implemented for independent audit, not verified**. The caller reports
A/B/C independently verified and authorizes D only. Engineer is integration owner;
there was no nested delegation, tracker mutation, staging, commit, push, PR, merge,
publication or deployment. No new issue/tracker state was invented.

## Actual delivery and preservation

- cwd/worktree: `/home/sprawl/projects/updf/trees/measured-flow-tables`
- branch: `feature/measured-flow-tables`
- base = HEAD: `ac60f80675a2042f2f6043bae51b541b85e7251f`
- Entry dirt: **60 tracked unstaged modifications / 147 untracked files**, no staged
  delivery. This includes the caller's independently verified A/B/C and older work.
- Pre-D capture: [architecture-inline-baseline.json](architecture-inline-baseline.json),
  **490 actual paths**, byte lengths and SHA-256; captured before production edits.
- D-only comparison: [architecture-inline-delta.json](architecture-inline-delta.json).
  Review this delta, not just the inherited Git diff against HEAD. It hashes changed
  and added files, excluding itself, and explicitly accounts for `rich.ts` → `rich.tsx`.
- Final full scope: **60 tracked unstaged modifications / 174 untracked files**,
  zero staged files, zero new committed revisions. No delivery mutation was authorized.
- All **131 historical/protected C-audit paths** remain byte-identical: original
  evidence/baselines, preserved legacy, font fixtures, historical roadmaps and Pages
  workflow. The complete pre-D historical evidence collection is also unchanged.

The paginator, dyadic certificates, local-ULP arithmetic, glyph metrics, fixed-text
engine, core rich measurement function and prepared-font measurement remain
unchanged relative to the D capture. **Do not claim all core source hashes unchanged:**
`measurement/wrap.ts` adds atomic-token boundaries and `measurement/lines.ts` adds
an opt-in auto-height/em-strut envelope. Existing text-only defaults retain their
old branch/math and all 266 earlier native tests pass. `measurement/validate.ts`
adds a style-validator seam using the existing style/font checks; existing validator
bodies are not rewritten. New native-ink and mixed-inline helpers are isolated.
Source/operation/VDOM bridge changes and their exact hashes are in the D delta.

## Implemented scope and API choices

See [the actual D contract](../inline.md) and package README for full examples.

- Root data `paragraph`/`span`, readonly distinct block/inline unions, imported
  `Paragraph`/`Span`/`Block` and `/vdom` `Document`; same core JSX factories/runtime.
  No author-facing plain/rich kind, synthetic Unicode or serialized rich-run UI.
- Whole-base Span inheritance, sibling restoration, no wrap opportunities at Span
  boundaries; defaults Helvetica10/black/line12/left/collapse/error. Scalar wrapping,
  LF/trailing blank lines, supported font profiles and original UTF16/source paths.
- Public `measure(content, constraints, options)` returns deeply frozen portable
  natural size, lines, baseline, text/visual metadata and native ink bounds. It
  returns no serializer/painting plan or resource bytes. Natural Block measurement
  uses actual capacities rather than an invented extreme page size.
- Core-owned generic recipe/normalization bridge, deferred h snapshots, B provider/
  progress frames, early real-role checks and closure on success/failure. Frozen
  data capabilities cannot mint mutable, callback-bearing or cyclic values.
- Generic `defineInlineAdapter`/`inline` parallel to C's default block adapters,
  sharing the owned local extension set. Operation-bound native ink measurement,
  atomic items, explicit ascent/descent and checked native emission. Baseline
  alignment is supported; optional top/middle alignment is not implemented.
- Actual native visual ink replaces declared estimates after bounds verification.
  Provisional semantic-capture quotas check aggregate output before defensive copy;
  failed captures roll back, repeated immutable measurements are reused and emitted
  occurrences remain separately charged. Empty visual arrays emit no phantom node.
- Native text fragments use real font metrics and ink-neutral nominal-box padding/
  clips for side bearings/em boxes. Genuine overflow and insufficient explicit
  lineHeight still error. Tight zero-margin mixed-font PDFs exercise that distinction.
- Application-owned optional SVG adapter uses `compileSVG` and native painting;
  neither package root/declaration acquires the other's dependency. No package or
  lockfile change, so no dependency-changing `npm ci` was required. Graph checks
  retain core → layout exclusion and reject native document lowering in layout
  data roots while permitting the approved small semantic bridge.
- Real lazy TSX showcase, theme provider, native green badge, width/font/alignment/
  whitespace/long-word controls, exact raw source and Node/Chromium outputs. SVG,
  tables, Fontkit and React stay outside its initial/Paragraph closure. The explicit
  browser-font proof includes the optional SVG compiler with positive graph controls.
- Shared compiler normalization also makes authored prose usable in the existing
  mixed table body and closes standalone wrapper contexts. **Cells and row protocols
  are unchanged; no F table model/package or implicit cell paragraphs were added.**

E final PageContext/deferred page recipes, F new tables/cell content, G final public
replacement/removal and Image/#33 are intentionally not implemented. Unreleased
core plain/rich/richText and low-level measureText remain transitional internals
through G, documented as deprecated for new authoring, not a permanent facade.

## Final complete-source quality evidence

All commands below ran in the exact worktree/branch/HEAD above, Node v24.21.0.
The final source was complete before the successful broad chain; only delivery
notes/manifests were added afterward.

| Exact command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass: Biome and 400/49/depth-3 enforcement, no new suppression |
| `npm run typecheck` | Pass: all workspace builds and root strict type checking |
| `npm test` | **288/288 pass**, all earlier 266 plus 22 D risk-based additions |
| `npm run test:consumer` | Six clean actual tarball closures pass; new real TSX/data execution, NodeNext/Bundler, `types: []`, positive/negative declarations |
| `npm run build:browser` | All **11** builds pass; expected >500 kB optional font-proof warning retained |
| `npm run build:showcase` | Pass; lazy Paragraph/flow/table/block/SVG modules |
| `npm run check:graphs` | Pass; actual emitted JS and inventoried internal seams |
| `npm run sizes` | Pass; actual size evidence below, no size-budget-completion claim |
| `npm run check:licenses` | Six actual tarballs have full MIT ©2026 Surikat AB / retained notices, no font assets |
| `npm run test:browser` | **8/8 pass**, exact Node/Chromium D metrics/PDFs and all 11 SVG reference raster cases |
| `npm run test:showcase` | **17/17 pass**, exact TSX source/downloads, controls, errors, cleanup and graph boundaries |
| `npm run test:legacy:comparison` | Baseline equivalent; **not a passing raw legacy gate**, 18 pass / 1 pending / 6 fail, underlying raw exit 1 |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` | Preserved exit 1: 45 inherited vulnerabilities, 8 moderate / 10 high / 27 critical |
| `sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf` | Both original digests unchanged, below |
| `qpdf --check artifacts/cmr.pdf` and `qpdf --check artifacts/cmr-unicode.pdf` | Pass |
| `git diff --check` and `git diff --cached --quiet` | Pass; no staged changes |
| `node /tmp/opencode/updf-inline-delta.mjs` | D delta/preservation pass, protected131 unchanged; only the declared wrap/line adaptation changes the numerical inventory |

Actual raw/gzip bytes: core **49,793/15,107**; VDOM **66,432/18,705**;
measurement **25,504/7,893**; flow **111,951/31,501**; tables **114,230/32,297**;
SVG **40,740/12,462**; optional Fontkit **492,601/169,756**.

CMR: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`.
Unicode CMR: `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`.

PDF evidence in `artifacts/inline/` includes qpdf-checked prepared-text extraction,
PPM and PNG raster proofs for green badge/red SVG baseline placement, absent/moved
visual negative controls with text retained, tight mixed em boxes and actual negative
side bearings. Positive source roles are compiled TSX, not AST-only fixtures.
Policies, styles, immutability/capability forgery, getters, source spans, ownership,
wrapper lifetime/progress/provider environment and repeated quotas have native tests.

Intermediate checks exposed and corrected declaration recursion, a C data-boundary
regression, invalid extreme natural-measure capacity, graph assumptions predating
the semantic bridge, and function/file-size violations. The first negative-bearing
fixture used right alignment with genuine right ink overflow; it correctly rejected.
The centered valid fixture now covers negative side bearings without weakening ink
checks. The final full source passes the native, consumer, build and browser gates
above. Prior SVG reference all-black
failure followed by an unchanged passing retry remains disclosed in the preserved
foundation/flow evidence; no such failure recurred in D and no oracle was relaxed.
Legacy/full-audit failures are inherited limitations, not new approved CI waivers.

## Principles and independent handoff

- [x] Correctness validated with production authoring, measured/native emission,
  capability/role/lifetime/budget adversaries and real PDF/raster paths.
- [x] Defaults followed; **approved exceptions: none**.
- [x] Cohesive production files <=400 lines; functions <=49, nesting <=3.
- [x] Comments explain invariants, intent and non-obvious native-box tradeoffs.
- [x] Risk-based tests proportional to D's new authoring/adapter/bridge blast radius.
- [x] Authoritative lint/type/test/build/browser/consumer gates pass.

No Changesets convention exists; none was added. No issue/tracker mutation or
delivery state change was authorized. Local status is **implemented**, never verified.

Auditor should check `pwd`, `git branch --show-current`, `git rev-parse HEAD`,
`git status --short`, `git diff`, `git diff --cached --quiet` and
`git ls-files --others --exclude-standard`; audit the D delta plus the inherited
uncommitted delivery. Recompute hashes from the pre-D capture, allowing only the
explicit source rename and wrap/line adaptations. Independently challenge JSX
erasure/real roles, provider and operation closure, immutable capture/forgery,
current-origin caches, UTF16/Span diagnostics, native side-bearing/em containment,
atomic/oversized visuals, capture/occurrence quotas and optional dependency graphs.
Review actual native/Chromium/raster outputs and C regressions. E/F/G require the
next authorized slice; passing Engineer checks is not independent verification.
