# Engineer Step2 PASS2 optional SVG / integrated evidence

## Two remaining audit blockers corrected (current handoff)

**Implemented, not independently verified.** Independent audit previously requested
changes despite the passing76-test gates. Only the two assigned blockers were
corrected; the seven earlier corrections and all existing files are retained.
Integration owner: Engineer; no delegation, tracker, staging, commit, push or
publish action. Root/legacy/roadmap/monorepo files are untouched.

Changed existing owned files only:
`svg/css.ts`, `svg/transform.ts`, `svg/compile.ts`,
`test/svg-audit.test.ts`, `test/probes/css-budget.ts`, and this evidence file.

- Declaration parsing now finds the first colon once, trims disjoint name/value
  slices and checks the anchored property-name alphabet. It preserves strict
  supported CSS, empty declarations, whitespace and quoted-none discard semantics.
  No overlapping whitespace/value regex quantifiers remain: each scan is linear
  in declaration length. A child-process regression beside the malformed-comment
  probe exercises the actual900062-byte source under1MiB, with900000 internal
  spaces and trailing nonspace. It rejects with structured SVGError/PAINT
  `Unsupported color grammar`; the existing diagnostic code is intentionally kept.
  Final observed child test166ms (includes startup), versus a10s safety timeout;
  timing is evidence, not a fragile millisecond threshold or general sandbox claim.
- Stylesheet unconsumed-tail diagnostics use the boundary map; transform parsing
  receives attribute boundary maps from all three compile callsites and maps its
  unconsumed tail. The reported stylesheet entity/CDATA cases now span55..58 and
  62..65 respectively; the reported rect transform spans89..92, each slicing `???`.
  Exact frozen-span assertions cover direct compilation and Svg lowering, including
  mixed entity/CDATA/comment gaps and root/g/rect/nested-svg transform failures.
  Conceptual `/tree` remapping remains correct. No extra TSX fixture was needed:
  the runtime component/lower boundary is tested directly and existing TSX type
  and packed execution gates are rerun. CSS body map slices are now frozen too.
- Inspected all SVG `start:` and `.start +` occurrences. No decoded-offset
  arithmetic remains in CSS/transform diagnostics. `source.range` retains its
  centralized identity fallback for callers without maps; XML scanner offsets
  are original-source offsets. Source concatenation's preexisting fallback is
  only for missing fragment map entries; parser fragments supply complete maps.

Exact validation commands from package cwd
`/home/sprawl/projects/updf/trees/declarative-cmr-poc/experimental/declarative`:

| Command | Final result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass, production files<=400/functions<50/nesting<=3 |
| `npm run build` | pass, ESM/declarations |
| `npm test` |79 pass,0 fail;76 retained +3 new regression cases |
| `npm run build:core`, `npm run build:vdom`, `npm run build:fonts`, `npm run build:browser` | all pass |
| `npm run build:fontkit`, `npm run build:font-browser`, `npm run build:geometry`, `npm run build:svg` | all pass |
| `npm run test:browser`, `npm run test:font-browser`, `npm run test:svg-browser` | all three actual Chromium gates pass |
| `npm run test:consumer` | packed prod-only declarations/TSX/execution pass; Fontkit/React absent |
| `npm run check:graphs` | pass:25/22/5/64/69/106/10/28; SVG remains isolated |
| `npm audit` |0 vulnerabilities |
| `npm run sizes` | SVG source44409, bundle39879/gzip12229; other measurements unchanged |

The initial integrated run passed typecheck/lint/build but had77/78 tests passing:
the new child probe incorrectly expected SVG_STYLE instead of the existing PAINT
color diagnostic. The assertion was corrected, runtime behavior was not changed;
the full integrated sequence above was then rerun successfully. Dependency install
and standalone proof CLIs were not rerun: no dependency/serializer/fixture changes;
integrated raster/PDF/browser/consumer gates exercise the relevant risks.

Final worktree checks from `/home/sprawl/projects/updf/trees/declarative-cmr-poc`:
`pwd`, `git worktree list`, `git branch --show-current`, `git rev-parse HEAD`,
`git diff --stat`, `git diff --cached --stat`, and
`git diff --quiet 7782bb3ba468a721ef7bd68fedd19b8f6c029d16` confirm branch
`feature/declarative-cmr-poc`, base/HEAD unchanged at that revision and no committed,
staged or tracked-unstaged delta. `git ls-files --others --exclude-standard --
experimental/declarative | rg -c .` returns154; the same command scoped to roadmap
returns12. Actual delivery remains142 owned untracked files +12 foreign roadmap.
`git diff --check` and the untracked text whitespace command documented below pass.

Universal checklist: correctness tested; defaults followed; cohesive production
files and function/nesting bounds lint-enforced; comments explain intent; tests
proportional to both denial-of-service and diagnostic-mapping risks; lint/tests
pass. No new approved exception or Changeset (no Changesets workflow). Tracker N/A,
unchanged. Auditor next independently rechecks these two fixes against the actual
untracked delivery, preserving the prior seven corrections. Strict SVG subset and
non-sandbox limitations remain as documented, not new waived blockers.

## Current re-audit revision: all seven requested corrections implemented

**Implemented; ready for re-audit, not verified.** The independent SVG audit
requested changes on the earlier149-file scope. This correction does not start
monorepo/root work or alter foreign roadmap files. Current154 untracked files:
142 owned +12 foreign roadmap; HEAD/branch/cwd remain identical below, no tracked
staged/unstaged or committed delta. Five new owned files:svg/{source,comments}.ts,
fixtures/svg-reference/foreground.ts, test/svg-audit.test.ts and test/probes/css-budget.ts.

1. Root order: root transform is outside viewport/viewBox, inside caller clip/
   placement. Native rotation proof also exposed outer SVG's initial viewport-center
   transform origin; fixed50%/50% conjugation. Native translation/rotation/alignment/
   scale/position cases added. The reported100px, viewBox10, translate5 case now
   emits viewport matrix translation5, not50.
2. Dash: positive signed remainder is used directly; add period only for negative
   remainders and validate finiteness. MAX_VALUE periods/positive and negative
   half-period offsets serialize without NaN/ordinary Error; overflowing sums
   fail structured GEOMETRY through existing finite checks.
3. Colors: Object.hasOwn guards palette lookup; constructor/__proto__/toString/
   hasOwnProperty fail direct and unused/matched class rules, not function/object RGB.
4. Style: normal/CDATA XMLText fragments concatenate into one logical stylesheet,
   with comment gaps retained in source coordinates. Mixed fragments/comments/
   entities now parse the same red declaration as native SVG.
5. Spans: each decoded character plus EOF has an original absolute UTF16 boundary
   map; CSS body slices retain that map. `fill:&#114;ed; stroke:'none'` warning
   slices the actual quoted-stroke source, not entity text. Generic DocumentError
   constructor/VDOM remappers retain typed frozen source spans without SVG imports.
6. CSS: one forward quote-aware comment scan rejects the first unterminated opener,
   no unanchored global regex/backtracking/rescan. A900k `/* ` opener input rejects
   with specific SVG_STYLE in a child with a10s safety timeout; observed final
   test163ms includes process/tsx startup, not a fragile millisecond acceptance gate.
7. Visual gate: old interior-only metric was genuinely blind for edge-band-only
   strokes. It is retained for filled interiors but augmented by all-foreground
   symmetric1px hue/coverage matching and ink mass. Same-bbox/zero-old-interior
   red->blue/black2px strokes,1px wrong-black strokes, removed central cross,
   moved internal geometry and opacity loss now fail. One-pixel placement remains
   permitted. No whitespace/background denominator is used for foreground metrics.

Final integrated rerun (exact subtree package cwd): `npm ci --ignore-scripts`,
`npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, all
build:core/vdom/fonts/browser/fontkit/font-browser/geometry/svg scripts,
test:browser/font-browser/svg-browser/consumer, check:graphs, npm audit and sizes.
All pass:76 Node cases (69 retained +7 audit regression cases), all3 actual
Chromium gates, packed declarations/execution, no parser in core/VDOM/normal apps,
and0 vulnerabilities. SVG graph28 modules, other graph counts unchanged below.

Corrected comparison criterion (not the earlier interior-only claim below):
bbox<=1px;1px edge band/interior channel3/255 and0.5% old ROI threshold; **every
foreground** pixel also uses white-composited contrast strength and normalized
hue<=0.08 in a symmetric1px neighborhood. Contrast-weighted unmatched foreground
<=0.5%; total ink-mass difference<=3%.11 native reference cases all bbox0/interior0;
max foreground mismatch0.001114 (0.1114%), max ink mass0.022762 (2.2762%, signature).
The mass margin captures renderer antialias integration, not hue/missing geometry.
Reports, paired rasters and negative controls make the blind spot observable.

Final raw measured sizes: core/font/painting source67153, emitted55905,
declarations17931; core30689/gzip9924; VDOM29479/gzip8666; geometry11224/gzip4082;
SVG39617/gzip12174 (source43800); normal app225340/gzip72424; optional Fontkit
490851/gzip169054; font browser414787/gzip168182. PDF sizes/hashes unchanged.
Both CMR hashes remain the exact pinned values below; svg-proof.pdf qpdf/raster
rerun passes. Final text whitespace checks exclude foreign roadmap/binary TTF.
The detailed initial implementation evidence below is retained as historical
scope/gate context; its old file counts/tolerances/sizes are superseded here.

No new code-principles exceptions, unsafe any cast, ignore or runtime dependency.
All production files<=400/functions<50/nesting<=3 still lint-enforced; no font
algorithm rewrite. Auditor next rechecks these seven fixes and stronger gate
on142 owned files. Root/monorepo and tracker/delivery mutations remain unstarted.

## Initial PASS2 implementation evidence (historical, before changes_requested)

**Step2 implemented, ready for independent audit; not verified.** Native painting
PASS1 and the authorized strict optional SVG subset PASS2 are integrated. The prior
87-file font/VDOM POC was independently audited per caller, not this new delta.
Images/full SVG/shaping remain deferred. No monorepo/root README movement started.
No commits/staging/push/issues or nested delegation.

## Worktree / ownership / actual inventory

- Exact cwd `/home/sprawl/projects/updf/trees/declarative-cmr-poc`.
- Branch `feature/declarative-cmr-poc`; base/HEAD
  `7782bb3ba468a721ef7bd68fedd19b8f6c029d16`.
- Initial status confirmed121 untracked files:113 owned delivery plus8 foreign
  Diplomat roadmap files. Current149 =137 owned files plus12 roadmap files. The
  roadmap owner independently added4 drafts during this pass; the entire roadmap
  directory was excluded from editing/ownership. No root source/config changes.
- `pwd`, branch/HEAD, `git status --short --untracked-files=all`,
  `git ls-files --others --exclude-standard`, diff-stat/cached-stat checks confirm
  no tracked staged/unstaged or committed delta. Actual delivery is untracked;
  Auditor must inspect files, not empty tracked diff. No root/user node_modules
  touched. `git diff --quiet 7782bb3ba468a721ef7bd68fedd19b8f6c029d16 -- package.json package-lock.json src lib test`
  remains0; root README/monorepo files were not edited.

PASS2 new files (24):
- svg/{types,error,xml-lex,xml,numbers,transform,css,style,attributes,shapes,
  viewport,declaration,inspect,compile,index,tree}.ts and svg/REUSE.md
- examples/svg-fixtures.ts, examples/svg-proof.ts
- test/svg.test.ts, test/types/svg-template.tsx
- fixtures/svg-reference/{compare,browser.test}.ts
- fixtures/vite-react/vite.svg.config.ts

Changed owned files: source-span/SVG diagnostic types, minimal ancestor-clip
validation correction, public exports/build/ignore/lint/scripts, declaration and
packed consumers, graph/size tooling and README/evidence. PASS1 files and all61
runtime tests retained. No external dependency added. Existing license/assets kept.

## Implemented adapter contract and reuse

`/svg` only exposes compileSVG(source,target) -> frozen {node,diagnostics},
renderSVG(source,target) -> frozen native paintGroup and SVGError/types. Target
is numeric x/y/w/h; root target-space clip is outside source viewBox affine.
`/svg-tree` supplies pure Svg Component/createSVGTree via current typed h/lower;
no callback props, DOM types, global JSX, React or Fontkit. Core/VDOM/ordinary app/
Fontkit entry graphs never import SVG/XML/CSS/path-string scanners.

Supported subset: svg/g/path/rect (rounded)/line/circle/ellipse/polygon/polyline,
defs containing style only, text-only inert title/desc. XML fully consumed with
hyphen/colon names, namespace checks, quoted duplicate attrs, predefined/numeric
entities, comments, XML1.0 UTF8 header, CDATA styles. DTD/entity declarations,
non-XML processing instructions, scripts/events/references/use/images/SVG text,
gradients/filters/masks/clipPath and unknown visual attrs/styles fail closed.
No external/network/filesystem/entity resolution. Original UTF16 source spans
and logical mapped paths survive conversion failures.

Scalar lengths are finite unitless/px; points/viewBox/transforms are numeric.
No viewBox requires positive intrinsic width/height. meet/slice/none and all
Min/Mid/Max alignment positions implemented. Nested SVG has a locally owned
clipped viewport; a bounded ancestor contains any extension outside parent.
Transform matrix/translate/scale/rotate(+center)/skewX/Y, exact arities/full input,
SVG multiplication order and inherited parent composition. Full M/L/H/V/C/S/Q/T/
A/Z normalize through PASS1 reusable geometry, not a second path implementation.

CSS limited to simple .class selectors/comma alternatives, multiple class tokens,
equal-specificity source order, presentation -> class -> inline, inherited paint/
visibility and display:none. Normalized RGB/null/rgba plus width/rule/cap/join/
miter/dash/offset/fill/stroke opacity. Overall opacity other than1 **rejects**;
group alpha is not incorrectly distributed. Unsupported CSS/refs/directives fail.
The one narrow compatibility case, invalid `stroke:'none'`, is discarded with a
frozen warning; never normalized. Inherited/presentation stroke remains.
compileSVG exposes warnings for explicit acceptance; renderSVG throws on warnings.

Budgets before more allocation/expansion:1MiB UTF8 source (UTF16 span offsets),
64 XML depth,10000 elements/native output nodes,64 attrs/element,1000 class
selectors,128 transform-list operations,100000 commands total +4096/path.
Metadata/AST are copied/frozen without caller freezing/mutation. No arbitrary
operator or callback input. Remaining unsupported features are explicit, not skipped.

Read-only legacy inspection at base: svgFactory/Svg/SvgFromText/Style/shape adapters,
content/util/{parseXml,Lexer,transform,asStyle}, styles/{cssParser,Css,classRule},
PASS1 geometry/style mappings. Function-level ledger svg/REUSE.md records adapted
structures, corrections/replacement reasons and maintainability. Legacy default
fill:none/stroke:black/quote stripping is replaced with SVG default black/none and
native CSS discard semantics. No monolithic Context2d/hooks/state copied.
Lynx3 CMR logo was read only to inventory classes/viewBox/paths/translate and the
invalid quoted-none feature. No branded/customer artwork/signature copied; fixtures
are original unbranded shapes. Fontello full pinned MIT notice remains included;
no unknown project copyright holder/year invented.

Correctness refinements found/tested: inherited rounded-rect raw radius is copied
before separate clamps; CDATA span points to content; entity-generated ]]&gt;
is not confused with illegal literal ]]>; already-mapped SVGError spans/path are
not wrapped/doubled. Native clip validation permits a nested viewport extension
only under an already bounded ancestor, retaining root clip rejection. No font
pipeline/byte behavior changed; both old CMR hashes remain exact.

## Final integrated gates

From `/home/sprawl/projects/updf/trees/declarative-cmr-poc/experimental/declarative`:

| Exact command | Result |
| --- | --- |
| `npm ci --ignore-scripts` |129 bounded local dev packages; no new dependency |
| `npm run typecheck` |pass; strict flags retained |
| `npm run lint` |pass; production TS<=400/functions<50/nesting<=3 |
| `npm run build` |pass; optional SVG/tree ESM and declarations |
| `npm test` |69 pass,0 fail (61 retained +8 SVG cases) |
| `npm run build:core` / `build:vdom` / `build:fonts` / `build:browser` |all actual builds pass |
| `npm run build:fontkit` / `build:font-browser` / `build:geometry` / `build:svg` |all actual builds pass |
| `npm run test:browser` |real ordinary Chromium1 pass |
| `npm run test:font-browser` |real Fontkit/Unicode Chromium1 pass |
| `npm run test:svg-browser` |real native-SVG versus PDF seven-fixture comparison1 pass |
| `npm run test:consumer` |packed prod-only SVG/TSX/root/fonts/painting declarations + execution pass; Fontkit/React absent |
| `npm run check:graphs` |core25/VDOM22/fonts5/app64/Fontkit69/font-browser106/geometry10/SVG26; SVG absent elsewhere |
| `npm audit` |0 vulnerabilities |
| `npm run sizes` |actual raw/gzip counts below |

Type consumer adds positive SVG AST/TSX component cases and negative source
callbacks/missing dimensions/unit strings/undeclared children/readonly warnings.
Built declarations require no DOM/Node/React ambient types. New runtime tests:
XML namespace/quotes/entities/comment/CDATA/EOF; CSS precedence/multi-class/order/
inheritance; observable quoted-none warning; transforms/aspect matrices; every
shape family; visibility/display/zero geometry/rounded radii/nested clip; unsupported
features/references/events/directives; source/depth/node/class/command budgets.
No runtime font tests were removed or changed.

## Independent visual criterion / evidence

Native Chromium SVG image (Blob -> Image -> canvas on white) is compared to
Poppler PDF at144dpi, same dimensions (320-point fixture ->640 pixels). Original
SVG and emitted PDF are independent renderer inputs; no blind golden bitmap.
Criterion: bbox<=1 pixel, union antialias edges dilated1 pixel, per-channel
interior difference>3/255 counts mismatch, maximum0.5% remaining ROI. This allows
cross-renderer boundary antialiasing, not geometry/color drift. Results retained
in artifacts/svg-comparison.json: seven cases (logo, signature, meet/slice/none,
quoted-none discard, nested viewport) all bboxDelta0/interior mismatches0.
Compared non-edge pixels span37124..242664 per case. Each PDF passes qpdf.
Paired artifacts svg-native-*.png/svg-*.png were generated; representative raster
attachments read visually. Initial native image decode failed for fixtures without
xmlns as standalone image/svg+xml; fixture namespaces were corrected, not the
comparison tolerance. Adapter's omitted namespace compatibility remains documented.

`node dist/examples/svg-proof.js`, `qpdf --check artifacts/svg-proof.pdf`,
`pdfinfo artifacts/svg-proof.pdf`,
`pdftoppm -scale-to 1200 -singlefile -png artifacts/svg-proof.pdf artifacts/svg-proof`
all pass: one400x460 page,3595 bytes, original unbranded two-panel proof.
PASS1 paint proof and both CMR CLI generations also rerun. sha256sum:
- cmr.pdf:8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22.
- cmr-unicode.pdf:cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4.
Unchanged Fontkit/public export/browser byte equality and prior qpdf/extraction/
raster contracts retain their earlier full license/provenance evidence.

## Measured bytes

| Scope | Raw | Gzip |
| --- | ---: | ---: |
| Core/fonts/painting TS / emitted JS / declarations |66720 /55498 /17886 | — |
| Core bundle |30568 |9873 |
| VDOM source / bundle |26981 /29352 |8618 bundle |
| Optional geometry source / bundle |14331 /11121 |4034 bundle |
| Optional SVG source / bundle |39994 /37767 |11651 bundle |
| Ordinary React app |225245 |72392 |
| Optional Fontkit closure / font browser |490786 /414691 |169026 /168147 |
| SVG proof / paint proof / old CMR / Unicode CMR PDF |3595 /1628 /5779 /423448 | — |

SVG cost is explicit/optional; root/normal apps contain native painting but not
XML/CSS/path-string parsing. No full Fontkit internal tree-shaking claim or numeric
budget guess. Graphs/sizes/comparison reports are ignored generated artifacts.

## Principles / delivery handoff

Checklist complete: bounded explicit correctness/ownership, cohesive files,
source/function/nesting gates, intent comments, risk-proportional independent
comparisons, strict/lint/tests/builds pass. No new approved universal exception,
unsafe any cast or ignore. Existing local JSX declaration/snapshot reassociation
is unchanged/explained. Asset JSON/license/binary/docs are not production code.
Root legacy test remains independently confirmed baseline toString failure at
test/container.js:255:46 (it.only/Windows output); not rerun/waived as passing.
Root compile skipped because unchanged root source would regenerate lib.

Whitespace checks exclude foreign roadmap and binary TTF:
`git diff --check` and
`git ls-files --others --exclude-standard -z -- experimental/declarative ':!experimental/declarative/roadmap/**' ':!experimental/declarative/fixtures/fonts/LiberationSans-Regular.ttf' | xargs -0 -r -I{} git diff --no-index --check /dev/null "{}"`.
No whitespace diagnostics. Root protected diff is empty. No git/tracker mutations.

Auditor next reviews137 owned untracked files (not12 roadmap drafts), especially
SVG source spans/strict consumption/cascade/opacity/clip/composition, paired renderer
evidence and entry isolation/reuse/license. Step2 native+SVG scope is implemented,
not independently verified; root/monorepo restructuring awaits later orchestration.
