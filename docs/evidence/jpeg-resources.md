# JPEG final Slice B + full current-docs sweep — qualified audit evidence

2026-10-06. Objective: close JPEG package/bundle/PDF delivery proofs and sweep all
current docs against actual source. Related issue **#33**; no tracker mutation or
claim that broader raster/PNG/alpha acceptance is complete. **The prior integrated
source scope was independently verified under SOFTWAREENV; not released or
deployed.** The original Engineer validation below retains both the default browser
failure and qualified software-renderer result; neither is rewritten as a default
gate pass or a root-cause fix.

## Independent audit and final docs-only correction

The subsequent independent full audit verified the prior source scope under
SOFTWAREENV, including 865 tests, 12 installed consumer closures, 11 package licenses
and the 51-file current-doc sweep. SOFTWAREENV is the software-renderer qualification
recorded below, not an assertion waiver or a fix for the default browser failure.

Final review advisories corrected only `docs/architecture/packages.md`, `readme.md`,
`docs/roadmap/current.md` and this evidence file: JPEG's public-only core boundary
(no `core/internal` allowlist), stale #33 tracker-status wording, and audit/evidence
qualification. JPEG v1 does not support PNG/alpha or arbitrary JPEG; broader raster
acceptance is not claimed. No tracker transition, runtime/source/fixture/dependency
or gate change was made in this docs-only assignment. These corrections await a
fresh parent docs audit; the prior independent source audit is not a new docs audit.

The original delivery provenance and hashes below describe the previous integrated
scope. `artifacts/jpeg-resources/provenance.json` is stale for these four Markdown
files; it was not regenerated and is not a new source-hash attestation. The requested
current-doc checker refreshes only `current-docs.json` Markdown hashes/local-link
results, not source provenance or full-audit evidence. All runtime code is unchanged.

Docs-only validation in the worktree: `npm run format:check` passed (791 files,
no fixes), `npx tsx scripts/check-current-docs.ts` passed (51 maintained Markdown
files, scoped local-file links), and `git diff --check` passed. No new source tests
or lint/typecheck/runtime reruns were needed for these prose-only corrections;
the original Engineer gate results below remain historical evidence.

## Revision, ownership and scope

- Worktree/cwd: `/home/sprawl/projects/updf/trees/jpeg-resources`.
- Branch: `feature/jpeg-resources`; base and HEAD:
  `bb8395b07be4586ea3be181625de1e71ed301d37`, the open PR #65 rich-only head.
  No PR #65 merge or new PR was performed.
- Parent Builder owns parent integration; this Engineer owns B integration/gates.
  Inherited A: **31 modified tracked + 29 new files**, preserved. A owns parser,
  native/generic XObject implementation and its tests; B made no parser/core/layout
  runtime edits. B owns tooling, package closure/license/README integration and docs.
- Delivery: **68 unstaged tracked modifications + 41 untracked files = 109 paths**,
  including inherited A. No staged or newly committed files; no push, tracker,
  nested delegation, merge, Pages/settings/workflow dispatch or docs-site generation.
  No showcase redesign or JPEG demo: the bounded runnable Node example is sufficient.
- Acceptance completed: installed JPEG-only/mixed closures; both Node loaders/orders
  and portable declarations/JSX; exact new runtime exports; browser parsed/retained
  isolation; 11 licenses; rich-only baseline cost/PDF preservation; JPEG DCT/reuse/
  orientation proofs; current-doc sweep. The subsequent independent audit outcome
  and bounded docs-only corrections are recorded above.

### B file manifest (in addition to untouched inherited A implementation)

New: `packages/jpeg/LICENSE`; `docs/jpeg-images.md`, `docs/fixture-provenance.md`,
this evidence file; `scripts/check-current-docs.ts`, `scripts/jpeg-example.ts`;
`scripts/consumer/jpeg.ts`, `jpeg-provenance.ts`, `jpeg-cost-proof.ts`,
`jpeg-cost-report.ts`; `tests/consumer/jpeg-graph.test.ts`,
`tests/consumer/types/jpeg-template.tsx`.

Tooling modified: `scripts/packed-consumer.ts`, `check-licenses.ts`, `graph-check.ts`,
`sizes.ts`; `scripts/consumer/cost-inputs.ts`, `dual.ts`, `graphs.ts`, `runtime.ts`;
`tests/consumer/declarations.test.ts`, `documentation-hover.test.ts`.
Within inherited untracked JPEG scope, B updates `package.json`'s LICENSE inventory
and README's complete public inventory; all JPEG production/test code is unchanged.

Docs modified: root `readme.md`; `apps/{layout-playground,node,showcase}/README.md`;
`packages/core/{API,README}.md`; `packages/{fontkit,fonts,layout,tables}/README.md`;
`docs/architecture/{composable-layout,layout-kernel,packages,resource-providers}.md`;
`docs/{authoring-migration,blocks,documents,inline,measurement,native-api,native-packaging,showcase-ux,tables,text-styles}.md`;
`docs/migration/fonts-text.md`, `docs/deployment/github-pages.md`, `docs/roadmap/current.md`.
The original script-generated `artifacts/jpeg-resources/provenance.json` recorded
**every** delivered path, byte length, SHA-256 and actual Git status for the prior
scope, not just this B grouping; it is not current for the docs-only corrections.
Generated PDFs, bundles, tarballs, reports and build/site output stay ignored.

## Current contract reviewed

JPEG's only direct dependency is core; a core install also includes the whole
kernel, even though drawing runtime retains only arithmetic. JPEG-only consumers
install core/kernel/JPEG, not fonts/text/Fontkit/PNG/decoder packages. Mixed consumers
explicitly install fonts/text and their paired runtime/provider. Core has no JPEG
parser import. New runtime exports are exactly `prepareJpeg`, `jpeg`, `jpegProvider`;
`JpegResource`/`JpegMetadata` and core `XObjectNode`/`XObjectSite` are type-only.

The [exact package profile](../../packages/jpeg/README.md) is unchanged: 8-bit
baseline grayscale or JFIF YCbCr 444/422/420, one all-components scan, permitted
tables/COM/JFIF only; 8 MiB/64M-pixel limits; no EXIF/ICC/Adobe/progressive/CMYK/PNG.
Structural/entropy-framing checks are **not entropy decoding or a hostile-image
sandbox**. Intrinsics accept genuine cross-realm nonshared-backed Uint8Array,
reject shared/spoof/Proxy sources without caller traps and copy once privately.
Pixels never become PDF points automatically. Native boxes stretch explicitly;
rotation/reflection/clipping use existing generic painting. Images stay atomic.

Generic binding ID/foreign-handle errors deliberately changed to `RESOURCE`,
including font-only maps. Font-specific diagnostics remain unchanged. Docs no
longer broadly claim all errors stayed unchanged. TextRuntime has five callbacks,
full TextService seven methods, standalone TextMeasurer one method; measurement
is paragraphs-only with no `kind`, plain input or native `text` compatibility tag.

## Fresh baseline and bundle costs

Fresh isolated archive: `/tmp/opencode/jpeg-bb8395-baseline-b`, extracted from the
exact base above and installed with `npm ci --ignore-scripts`. Provenance checks
all **1,043 tracked blobs** against Git (inventory SHA-256
`20a4686a258945a5af5562b189337c7894d25c8184858c4127363deafdecbcfd`), isolated
workspace links and matching tools. Node **24.21.0**, TypeScript **5.9.3**, esbuild
**0.28.2**, Vite **7.3.6**, Biome **2.4.13**; browser condition, ES2022, minified ESM.
Every existing baseline/current profile uses identical input source and canonical
rich contracts, not the obsolete discriminator or pre-extraction `f347be4` baseline.

| Consumer JS | Base raw/gzip | Current raw/gzip | Delta raw/gzip | Current parsed/retained modules | Package closure |
| --- | ---: | ---: | ---: | ---: | --- |
| Drawing | 32,248 / 11,255 | 33,744 / 11,675 | +1,496 / +420 | 38 / 37 | core, kernel |
| Helvetica rich | 54,110 / 18,783 | 55,616 / 19,229 | +1,506 / +446 | 85 / 59 | core, kernel, fonts, text |
| Prepared rich | 58,383 / 19,981 | 59,889 / 20,446 | +1,506 / +465 | 85 / 59 | core, kernel, fonts, text |
| Font measurement | 24,264 / 8,570 | 24,285 / 8,586 | +21 / +16 | 76 / 38 | core, kernel, fonts, text |
| Host measurement | 20,713 / 7,187 | 20,735 / 7,199 | +22 / +12 | 65 / 31 | core, kernel, text |
| Explicit Fontkit rich | 431,646 / 173,428 | 433,155 / 173,922 | +1,509 / +494 | 130 / 100 | core, kernel, fonts, text, adapter + Fontkit closure |
| JPEG only | N/A | 40,394 / 14,183 | N/A | 47 / 44 | core, kernel, JPEG |
| Mixed prepared font/JPEG | N/A | 66,221 / 23,113 | N/A | 92 / 66 | core, kernel, fonts, text, JPEG |

JPEG/mixed are **absolute** costs: base has no equivalent image API. Mixed
`pdf(fontResource, jpegBytes)` also exports `prepareFontResource` to create the
same-bundle owned font for executable proof; its preparation cost is retained and
included, not silently tree-shaken. Standalone measurement profiles actually call
the measurer; these are entry costs, not full-service costs or performance claims.
Both parsed and `bytesInOutput > 0` retained graphs are reported; type/module names
alone are not interpreted as implementation retention. Existing profiles parse
zero JPEG modules. No non-Fontkit profile parses Fontkit; no decoder/PNG cost is
invented. Exact Fontkit dependencies are listed in the generated summary.

Core drawing growth is generic XObject collection (+716 retained bytes), validation
(+330), unit-rectangle content (+188), XObject measurement (+152), operation (+49),
measure dispatch (+48), slot (+22), with binding/minifier offsets. JPEG parsing is
absent from that graph. Measurement's tiny delta includes the generic binding
diagnostic change, not JPEG parsing. gzip and shared entry costs are non-additive.

| Package | Base tar / unpacked bytes | Current tar / unpacked bytes |
| --- | ---: | ---: |
| kernel | 49,534 / 259,440 | 49,534 / 259,440 |
| core | 109,050 / 635,719 | 111,476 / 651,987 |
| fonts | 21,460 / 107,413 | 21,498 / 107,507 |
| text | 28,428 / 155,718 | 28,428 / 155,718 |
| Fontkit adapter (not its peer) | 10,692 / 52,710 | 10,737 / 52,791 |
| JPEG | N/A | 14,860 / 62,314 |

JPEG-only closure's package totals: **175,870 tar / 973,741 unpacked bytes**;
these include the whole kernel and are not consumer JS sizes. README/license bytes
are included in package costs. External assets, excluded from consumer JS:
JPEG **821 raw / 652 gzip**; regular TrueType **410,712 / 213,360**;
prepared JSON **373,653 / 33,339**. They are not production tarball assets.

## Full current-doc sweep

Reviewed **51 maintained Markdown files**, captured with hashes/local inline file
links in `artifacts/jpeg-resources/current-docs.json`: root README, all native
package README/API inventories, architecture/resource providers, measurement,
text styles, blocks/inline/rows/tables/documents, migrations, runnable app/business/
TUI/playground guides, fixture provenance, current legacy compatibility/tooling
guides, showcase and manual Pages instructions.
Corrections cover optional JPEG, ownership/units/source trust, resourceBytes,
rich-only/standalone APIs, explicit composition in document examples, package/license
counts, stale kernel lineage and false current deployment/demo claims.

Protected original roadmap bodies/index, geometry/SVG REUSE ledgers, font-fixture
README, legacy docs/source/assets and old evidence hashes remain unchanged. Their
dated claims are explicitly classified by the new [current fixture guide](../fixture-provenance.md)
and maintained roadmap/architecture pages. No certificate/golden hashes were rewritten.
An attempted protected README edit was caught by the preservation test, restored,
and replaced with this current guide. Local inline file links pass; **anchors,
external URLs, historical-document links and every Markdown snippet are not
exhaustively machine-checked**. No generated API/docs site was introduced.

## Original Engineer validation and reproducible evidence

Commands below run in the worktree unless an alternate cwd is stated. Full logs
are `/tmp/opencode/jpeg-b-*.log`; reports/bundles/PDFs are ignored under
`artifacts/jpeg-resources/`. All checks were synchronous and have completed.

| Command | Outcome |
| --- | --- |
| `npm run format:check` | Pass, 791 files |
| `npm run lint` | Pass, 796 Biome files + exact AST principles |
| `npm run typecheck` | Pass; fresh full build + root strict compilation |
| `npm test` | Pass **865/865**, zero skipped/cancelled |
| `npx tsx --test scripts/migration/migration.test.ts` | Pass **7/7**, protected originals unchanged |
| `npm run test:consumer` | Pass **12 clean installed scenarios**, both loaders/orders, NodeNext/Bundler JSX; includes JPEG-only/mixed qpdf/Poppler |
| `npm run check:licenses` | Pass **11 actual library tarballs**, full MIT and retained notices |
| `npm run build:browser` then `npm run check:graphs` | Pass **12 targets**, emitted ESM, no source aliases/CJS/JPEG leaks |
| `npm run test:browser` | **Fail 10/11**: known SVG analytic fractional-stroke raster criterion; original assertions/log retained |
| `BROWSER_CHROMIUM=/tmp/opencode/issue41-chromium-software.sh npm run test:browser` | Pass **11/11**, single allowed qualification; wrapper is `exec /usr/bin/chromium --disable-gpu "$@"`, same Chromium 152.0.7977.82, no assertion waiver |
| `npm run build:showcase` then `npm run test:showcase` | Pass **67/67**, no deployed/site-generation-docs claim |
| `npm run test -w @updf/layout-playground` | Pass **13/13** |
| `npm run build -w @updf/layout-playground` then `npm run test:browser -w @updf/layout-playground` | Pass **5/5** |
| `npx tsx scripts/jpeg-example.ts` then `qpdf --check artifacts/jpeg-example.pdf`, `pdffonts artifacts/jpeg-example.pdf` | Pass, 1,809-byte two-page PDF; no fonts, one shared JPEG stream |
| `npx tsx scripts/check-current-docs.ts` | Pass **51 files**, scoped local-file links |
| `git diff --check` | Pass |

Cost reproduction after fresh base archive/install:

```sh
npx tsx scripts/sizes.ts /tmp/opencode/jpeg-bb8395-baseline-b current artifacts/jpeg-resources/baseline
npx tsx scripts/sizes.ts . current artifacts/jpeg-resources/current
npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/jpeg-bb8395-baseline-b artifacts/jpeg-resources
npx tsx scripts/consumer/jpeg-cost-proof.ts
npx tsx scripts/consumer/jpeg-cost-report.ts
npx tsx scripts/consumer/jpeg-provenance.ts /tmp/opencode/jpeg-bb8395-baseline-b
```

All passed. Shared drawing/Helvetica/prepared/Fontkit rich PDFs preserve exact bytes,
72-DPI raster and extraction; measurement DTOs and canonical CMR proof preserve
their tested outputs. JPEG bundle proofs assert original bytes, deterministic image
count, qpdf, fonts/extraction and four asymmetric color samples (45-channel lossy
tolerance), with wrong-orientation negative control. A's full tests cover aliases/
pages, distinct preparations, source traps/caps, transforms/clips and atomic layout.
qpdf **12.4.1**, Poppler **26.08.0**, pinned ImageMagick fixture build as documented.
No hostile-entropy validity or downstream viewer budget guarantee is inferred.

Provenance also proves every existing lock record/registry integrity remains equal
to base; only `packages/jpeg` and `node_modules/@updf/jpeg` records are added.
Temporary-operation concern: an early archive extraction mistakenly targeted
`/tmp/opencode` directly and may have overwritten files there. No workspace/Git
discard was used; only the subsequently fresh isolated archive above is evidence.

## Code principles and Auditor handoff

Self-check: correctness and safe ownership validated; defaults followed; cohesive
files under 400 lines; functions under 50 lines/nesting at most 3; comments explain
intent/invariants; risk-based graph/installed-loader/strict type/hover/PDF tests;
format/lint/typecheck/full tests pass. No new code-principles exception. Existing
JSX/config conventions remain; no Changesets system or publication bump is added.
The default SVG browser failure is a disclosed environment qualification, **not a
green default gate**. Raw inherited legacy suite and whole dependency audit were not
rerun or declared green.

The independent full audit of the prior 109-path delivery is complete under the
qualification above. Next, the parent Auditor should review only these four docs
corrections against the unchanged source, check the public-only boundary and bounded
JPEG v1 claims, and preserve the distinction between old provenance and refreshed
Markdown-link evidence. Tracker remains unchanged by this assignment; no broader
raster acceptance is claimed. Publishing, PR creation and PR #65 merge require
caller decisions, not this handoff.
