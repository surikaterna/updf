# Final rich-only runtime and integration — E3

Objective: finish runtime cleanup and prove the integrated canonical-rich engine,
including the authorized E2 documentation/classifier audit leftovers.
Issue: **N/A**. **Implemented, ready for independent audit; not verified.**
E1/E2 evidence remains a revision-specific historical snapshot, not final pending work.

## Delivery and ownership

- Worktree/cwd: `/home/sprawl/projects/updf/trees/rich-only-text`.
- Branch: `feature/rich-only-text`; base and unchanged HEAD:
  `ad0529e1f579fdff2ea7c9b72e9a7386bdc14e03`.
- Parent Builder is integration owner. Entry inherited E1 audited and E2 runtime/
  consumer-verified work: 129 modified, one deleted, ten untracked paths.
- Final integrated scope: 139 modified tracked files, one tracked deletion
  (`packages/text/src/fixed-text.ts`), 14 untracked files; zero staged files.
  All work is uncommitted. No delegation, tracker mutation, stage, commit, push,
  PR, discard, publication, or other-worktree edit occurred.
- Exact final path manifest and SHA256 hashes of current source files are in
  `/tmp/opencode/rich-only-e3-cost/final-proof.json` (`status`, `sourceHashes`).
  `git status --short` is the authoritative review manifest.

E3 changed core's runtime contract/resources export inventory; fonts' runtime and
private glyph measurement; text's runtime capture/metric call; the layout native
classifier and stale inline-clip comment; corresponding runtime/capture/classifier,
packed declaration and artifact tests; host implementations in consumers; baseline
measurement/cost harnesses; and current README/API/measurement/migration docs.
New E3 files are `packages/layout/test/document-native.test.ts`,
`packages/text/test/runtime-path.test.ts`, `scripts/consumer/rich-cost-report.ts`,
and this evidence. All other untracked files are inherited and preserved.

## Final contract and preservation

- `TextRuntime` has exactly five declared callbacks: `validateResource`,
  `validateText`, `measure`, `lineMetrics`, `joinRuns`.
  `measure(resource, text, fontSize, path)` has no mode parameter or overload.
  `TextMode` and fixed policy are removed, not aliased. Packed TS negative probes
  reject both former exports/capabilities and the old five-argument call.
- Capture still requires all five own data callbacks, rejects getters/inheritance,
  binds the original receiver, and snapshots metric output. Metric diagnostics now
  use argument four as their source path. `lineMetrics` remains required by both
  factories and used by inline layout. Unrelated extra runtime own data properties
  remain unexamined as before; this is not a compatibility callback or mode branch.
  There is no new JS arity restriction; ordinary surplus JS arguments are not an API.
- Full `TextService` has seven methods: `measure`, `validate`, `rich`, `inline`,
  `validateStyle`, `resolveStyle`, `lineBox`. Standalone `TextMeasurer` has only
  `measure`; its factory options accept only `runtime`. `defaultFont` belongs only
  to full-service authoring style resolution. Paragraph `defaultStyle.font` is
  explicit, including native rendering. Neither factory accepts raw text input.
- Only `{ width, height?, paragraphs }` is accepted for measurement; native/JSX
  uses case-exact `richText`. Old forms/tags/discriminators reject; there is no
  production converter, alias, fixed service method or plain engine.
- Rich arithmetic is retained exactly, including Helvetica `fontSize - ascent`,
  prepared glyph ink union/scaling, empty ink, finite validation and fit rules.
  Only unused fixed glyph-result fields/calculations were deleted. Genuine public
  prepared font/glyph bounds metadata and static TrueType support remain.
- Opaque frozen run tokens stay in runtime-private WeakMaps. Joins require the
  same runtime, font resource identity and size; foreign/forged/empty/mismatched
  sequences reject. Existing glyph identities concatenate without reprofiling,
  CID allocation or exposed payloads. Resource aliases retain their identity rules.
- Native plans contain only measured rich text. Generic PDF text paint/collection
  names, provider ownership, CIDs and serializer behavior were intentionally kept.
  Core still has no fonts/text implementation dependency; browser and ten external
  tarball closures check package seams, Node canonical CJS/ESM brand ownership,
  actual declarations and licenses.

Risk-based tests cover five-callback capture/missing/getter/inherited cases,
receiver/replacement/fourth-argument paths through both factories, exact runtime
keys, run owner/resource/size mismatches and existing prepared glyph identity joins.
The internal classifier rejects old `text` and accepts supported native tags;
this is test-only boundary proof, not a new public API. Text tarball guards reject
`fixed-text` JS/declarations/maps under portable, CJS and Node emitted formats,
including negative controls; actual packed outputs are inspected.

Source sweep found no removed types/policies/native tags in live implementation.
Remaining mentions are negative tests, explicit historical measurement producers,
and historical evidence. Layout fixed geometry/transport/width modes, XML text,
HTML text and private VDOM traversal modes are unrelated and intentionally retained.
The pre-existing `definePrimitive('RichText')` lowercasing/native-tag guard concern
remains out of scope; no new issue was created without authorization.

## Fair bundle/runtime-code cost evidence

Baseline is the archived **ad0529e** source at
`/tmp/opencode/rich-only-e1-baseline`, not the older pre-extraction/plain workload.
The preservation harness checks all **1,030** original Git blob hashes. Archive
SHA256 is `6a7a346b07a0a8e58a986f4cae6503b0271d0e4d942936dbdb473b0fc78525ca`.
Baseline/final workspace links and tool versions match: Node **v24.21.0**, esbuild
**0.28.2**, TypeScript **5.9.3**, Vite **7.3.6**.

Both sides author identical canonical-rich workloads; only the baseline producer
adds its required historical `kind: 'rich'` and six-callback host signature/policy.
Standalone measurement uses each side's supported narrow factory with no default
font. The synthetic host producer checks the intended source-path argument at
runtime. The old pre-extraction generation explicitly records host measurement as
unavailable, never as zero cost. No production compatibility code was introduced.

Minified browser ES2022 ESM JavaScript bytes / gzip bytes:

| Profile | Base JS | Final JS | JS delta (%) | Base gzip | Final gzip | gzip delta (%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Drawing | 33,586 | 32,248 | -1,338 (-3.98%) | 11,546 | 11,255 | -291 (-2.52%) |
| Helvetica rich PDF | 59,195 | 54,110 | -5,085 (-8.59%) | 20,164 | 18,783 | -1,381 (-6.85%) |
| Prepared Unicode rich PDF | 63,468 | 58,383 | -5,085 (-8.01%) | 21,406 | 19,981 | -1,425 (-6.66%) |
| Fonts standalone rich measurement | 27,979 | 24,264 | -3,715 (-13.28%) | 9,682 | 8,570 | -1,112 (-11.49%) |
| Fontkit rich PDF | 436,749 | 431,646 | -5,103 (-1.17%) | 174,885 | 173,428 | -1,457 (-0.83%) |
| Host standalone rich measurement | 23,956 | 20,713 | -3,243 (-13.54%) | 8,153 | 7,187 | -966 (-11.85%) |

These are net E1–E3 deltas, not E3-only or total-site speed claims. Reports include
actual emitted contributions, not input module counts. For example Helvetica
fonts/runtime contributes 2,221 -> 1,848 bytes and private fonts/measure 470 -> 311;
standalone fonts text/measure contributes 1,706 -> 622. Full service/inline modules
contribute zero emitted bytes to both narrow measurement profiles. Drawing imports
no fonts/text; host imports no fonts; optional Fontkit is absent elsewhere.
No CPU timing/allocation benchmark or performance guarantee is claimed.

Reports/bundles/tarballs are under `/tmp/opencode/rich-only-e3-cost/{baseline,current}`;
`final-proof.json` records tools, manifest/source hashes, absolute/percentage deltas
and emitted contributions. Cost PDF checks execute actual bundles, not merely sizes.
Canonical CMR ASTs are rendered with each engine's public configured providers;
ASCII/Unicode CMR PDFs, text and raster match exactly. Historical plain appearance
changes and E2's justified CMR golden/bbox distinctions remain documented in
[E2 completion](rich-only-e2-completion.md); no additional golden changed in E3.

## Final gates

All commands ran from the exact worktree above. Builds completed before dependent
checks, without dist/test races. Logs: `/tmp/opencode/rich-only-e3-*.log`.

| Command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts` | Pass; no dependency or lockfile change |
| `npm run format` / `npm run format:check` | Pass / pass |
| `npm run lint` | Pass: Biome plus actual AST 400-line/49-line/depth-3 gate |
| `git diff --check` | Pass |
| `npm run typecheck` | Pass: full builds and root tsc |
| `npm test` | **827/827**, no failure/skip/cancel |
| `npm run test:consumer` | Pass: ten clean tarball closures, runtime/dual loaders, NodeNext/Bundler declarations |
| `npm run build:browser` / `npm run check:graphs` | Pass / pass |
| `npm run test:browser` | **11/11**, default Chromium 152.0.7977.82 |
| `npm run build:showcase` / `npm run test:showcase` | Pass / **67/67** |
| `npm run build -w @updf/layout-playground` / `npm test -w @updf/layout-playground` | Pass / **13/13** |
| `npm run test:browser -w @updf/layout-playground` | **5/5**, default Chromium |
| `npm run check:licenses` | Pass: actual ten-package tarball licenses |
| `npx tsx scripts/consumer/rich-only-proof.ts /tmp/opencode/rich-only-e1-baseline` | 1,030 source hashes; **18** rich DTO/diagnostic and **2** exact native PDF comparisons |
| `npx tsx scripts/consumer/native-rich-proof.ts /tmp/opencode/rich-only-e1-baseline` | **30/30** exact bytes, qpdf, extracted text/bbox, 72-dpi raster |
| `npx tsx scripts/sizes.ts /tmp/opencode/rich-only-e1-baseline current /tmp/opencode/rich-only-e3-cost/baseline discriminated` | Pass: six fair baseline bundles and package/asset costs |
| `npx tsx scripts/sizes.ts . current /tmp/opencode/rich-only-e3-cost/current` | Pass: six final bundles and package/asset costs |
| `npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/rich-only-e1-baseline /tmp/opencode/rich-only-e3-cost` | Pass: four rich PDF profile bundles, fonts/host DTO workloads, ASCII/Unicode CMR |
| `npx tsx scripts/consumer/rich-cost-report.ts /tmp/opencode/rich-only-e3-cost` | Pass: tool/link provenance, emitted narrow graphs, sizes and final source manifest |

E2's intermittent all-black default SVG browser capture remains preserved as
historical runner evidence; E3's single default run passed without a software
wrapper, assertion/tolerance change or retry loop. Vite's inherited large optional
font chunk warning is informational, not a failed gate. Legacy source/goldens remain
untouched; its six historical whole-suite failures are not claimed green or newly
waived. The final root/packed gates include their existing legacy certifications.
No asynchronous checks remain running.

## Code-principles and handoff

- [x] Correctness and strict boundaries validated; no avoidable unsafe pattern.
- [x] Strong defaults; no approved exception or new suppression.
- [x] Cohesive production files <=400 lines.
- [x] Functions <50 lines and nesting <=3; actual AST gate passed.
- [x] Comments explain intent/invariants/tradeoffs only.
- [x] Tests proportional to runtime signature/ownership/artifact risks.
- [x] Lint, typecheck and required tests pass.

No Changesets workflow exists. No tracker state was mutated. Acceptance is complete;
Parent Builder should request independent Auditor review of the entire inherited
and E3 unstaged/untracked delivery, especially exact rich metric arithmetic,
five/seven/one callback contracts, private run ownership, packed artifact/declaration
guards and fair executable cost producers. This is implementation, not verification
or release/delivery authorization.
