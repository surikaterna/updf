# Optional fonts/text extraction — historical extraction evidence

> **Historical only:** all revisions, qualifications, costs and audit results below
> describe the original extraction against `ba487704`, not current develop integration.
> They are preserved without rewriting prior audit outcomes. Current pending-merge
> results and the fresh `f347be43` comparison belong to
> [develop integration evidence](font-package-develop-integration.md).

Issue N/A. **Implementation reviewed; browser validation passes under an explicitly
software-rendered environment; default-GPU failure unresolved/CI risk.** Not published. Worktree
`/home/sprawl/projects/updf/trees/font-package-extraction`, branch
`feature/font-package-extraction`, base/HEAD
`ba487704860c3cf9a16b6aba90a8ae86285beff1`; delivery is entirely unstaged/untracked.
STEP1–3 inherited changes are included in integrated checks. STEP4 owns packaging
gates, graph/license/cost evidence, live docs and temporary-gate removal; no further
runtime implementation change. Core's build now cleans stale emitted files before
compiling. Parent Builder owns delivery integration. The final independent Auditor
reviewed the integrated 349-file scope and found no additional runtime findings.
This final evidence-only update leaves source/harness files unchanged: the earlier
whole-manifest hashes are now outdated, and no new overall manifest hash is claimed.
No delegation, staging, commit, PR or tracker mutation.

## Original Engineer implementation-run checks (2026-10-05)

These are the original Engineer's historical results, not the final independent
Auditor's outcomes. At that implementation handoff the work was **not independently
verified**. In particular, the original default-browser 11-test pass is retained;
it does not supersede the later independent default-GPU failure below.

| Exact command | Result |
| --- | --- |
| `npm run format:check` | pass |
| `npm run lint` | pass, Biome + ESLint 400/49/depth-3 |
| `npm run typecheck` | pass, includes sequential full `npm run build` |
| `npm test` | 770 pass, zero failures/skips/cancellations |
| `npm run build:browser && npm run test:browser` | pass, 11 tests; SVG corruption/negative controls passed without retry |
| `npm run build:showcase && npm run test:showcase` | pass, 57 tests |
| `npm run test:consumer` | pass, ten external real-tarball installs |
| `npm run check:graphs` | pass, source seams + twelve emitted browser graphs; inventories include narrow `/resources` and `/pdf` exports |
| `npm run check:licenses` | pass, full MIT in all ten actual package tarballs; no font/test assets |
| `npm run sizes` | pass; builds its own package prerequisites, bundles profiles and produces actual tarballs |
| `npm test -w @updf/layout-playground` | 12 pass |
| `npm run build -w @updf/layout-playground && npm run test:browser -w @updf/layout-playground` | pass, 5 browser tests |
| `git diff --check` | pass |

Consumer A installs core/kernel only: drawing renders, no fonts/text/Fontkit
installed. B adds text with the minimal typed host runtime fixture, still no fonts
or Fontkit. C adds fonts: explicit Helvetica and prepared Unicode render without
Fontkit; unused configured providers/resources emit no fonts. D adds the adapter:
missing optional peer fails with `ERR_MODULE_NOT_FOUND`; installing pinned
Fontkit 2.0.4 produces a fonts-owned resource and renders Cyrillic. Existing kernel,
layout/table, geometry, SVG/CMR and legacy closures remain tested. Declaration
consumers compile/execute in NodeNext and Bundler with no source aliases or ambient
Node/DOM/React types; the separate root consumer retains all 17 migration templates.

Initial formatting/import-order checks failed and were fixed. The new public-export
inventory exposed a checker trailing-comma parsing bug; fixed with a regression,
without expanding the expected export set. The strict tarball guard then found
seven obsolete emitted core text modules (28 JS/declaration/map files): core now
cleans `dist` before building, and the guard rejects their return. All integrated
gates were rerun after that fix. The intentionally invalid arithmetic
negative control prints an esbuild diagnostic during passing root tests. Vite warns
about the large optional font-browser chunk; not a failed gate. No checks were pending
at that implementation handoff.

## Final independent review and browser outcomes (2026-10-05)

The full independent Auditor reviewed the integrated 349-file implementation and
reported no additional runtime findings. Its independent checks were:

| Exact command | Independent result |
| --- | --- |
| `npm run format:check` | pass |
| `npm run lint` | pass |
| `npm run typecheck` | pass, including build |
| `npm test` | 770 pass |
| `npm run test:consumer` | pass, ten real-tarball consumers |
| `npm run check:graphs` | pass, twelve graphs |
| `npm run check:licenses` | pass, ten tarballs |
| `npm run build:showcase && npm run test:showcase` | pass, 57 tests |
| `npm test -w @updf/layout-playground` | 12 pass |
| `npm run build -w @updf/layout-playground && npm run test:browser -w @updf/layout-playground` | pass, 5 browser tests |
| `npm run sizes` | pass; cost table reviewed and reproduced |
| `npx tsx scripts/sizes.ts /tmp/opencode/updf-font-baseline-ba487704 baseline` | pass |
| `npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/updf-font-baseline-ba487704` | pass, baseline/current cost and PDF proof |
| `npm run test:browser` | **fail: 10/11 pass**, default-GPU native SVG logo capture |
| `BROWSER_CHROMIUM=/tmp/opencode/issue41-chromium-software.sh npm run test:browser` | **pass: 11/11**, one bounded independent run, 22 seconds, no retry |

The default-GPU failure is at `tests/svg-reference/browser.test.ts:93`: the native
SVG logo capture was all black, with `interiorMismatch1 = 231356` and bounding-box
delta 16. Preserve the failure archive at
`/tmp/opencode/svg-capture-failure-ba48770`. The exact root cause remains unknown.
No font/PDF regression was demonstrated; independent Poppler rendering of the
actual PDF was good. Explorer's one controlled `--disable-gpu` capture passed,
supporting an environment hypothesis, not proving the cause or a fix.

The bounded independent browser run used the **same Chromium 152.0.7977.82**,
unchanged assertions and negative controls, with no source/harness changes and no
retry. The wrapper's exact contents were:

```sh
#!/bin/sh
exec /usr/bin/chromium --disable-gpu "$@"
```

Its SHA256 was
`d99c09d9127acbd14ccb51f9296128ea491970aefbeb49de35492f18284919de`.
To reproduce, create an executable file outside the repository containing those
two lines (with a trailing newline), then from this worktree run:

```sh
BROWSER_CHROMIUM=/absolute/path/to/chromium-software.sh npm run test:browser
```

The audited command used `/tmp/opencode/issue41-chromium-software.sh`. This is an
explicit environment choice, not a policy waiver or evidence that default-GPU
validation is fixed. Browser validation passes in that software-rendered environment;
the default-GPU failure remains unresolved and a CI risk. No unqualified all-gates-green
or root-cause-resolution claim is made.

## Reproducible cost comparison

Baseline is an isolated `git archive` of the exact HEAD above, extracted under
`/tmp/opencode/updf-font-baseline-ba487704`, then `npm ci --ignore-scripts --no-audit
--no-fund` **in that archive**. Its workspace links/dependencies stay isolated and
have no new fonts/text packages. From the current worktree:

```sh
npm run sizes
npx tsx scripts/sizes.ts /tmp/opencode/updf-font-baseline-ba487704 baseline
npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/updf-font-baseline-ba487704
```

Node v24.21.0, npm 11.19.0, TypeScript 5.9.3, esbuild 0.28.2, Vite 7.3.6,
qpdf 12.4.1, Poppler 26.08.0, Chromium 152.0.7977.82. Both profiles use the same
producer/toolchain: minified browser ESM, ES2022, exported consumer operations,
same text/geometry/fixture, API composition adapted only for extraction. This is
**not** a comparison of whole core export barrels. JSON includes inputs and module
closures under `artifacts/font-extraction/{baseline,current}/report.json`.

| Actual consumer | Baseline JS | Current JS | Delta (%) | Baseline gzip | Current gzip | Delta (%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Drawing/render | 45,293 | 33,426 | -11,867 (-26.20%) | 15,826 | 11,537 | -4,289 (-27.10%) |
| Helvetica/render | 45,351 | 58,859 | +13,508 (+29.79%) | 15,855 | 20,049 | +4,194 (+26.45%) |
| Prepared Unicode/render, no decoder | 49,230 | 63,133 | +13,903 (+28.24%) | 17,014 | 21,289 | +4,275 (+25.13%) |
| Measurement with fonts | 20,353 | 53,910 | +33,557 (+164.87%) | 7,354 | 17,821 | +10,467 (+142.33%) |
| Optional Fontkit application | 422,544 | 436,407 | +13,863 (+3.28%) | 170,070 | 174,783 | +4,713 (+2.77%) |

Minimal host-only measurement is 49,820 JS / 16,265 gzip bytes. Baseline has no
structural host-runtime capability, so no equivalent host-only baseline/delta is
claimed. Its fixture has no fonts import; measurement with normal fonts is measured
separately above. Generic operation composition costs are visible, not hidden.

The actual optional package boundaries are proved, but font-using profiles grow,
especially measurement with fonts at **+142.33% gzip**. These results do not establish
the previous assumption that shared-core extraction yields a net saving for every
consumer. Optimization is a next decision, not a completed performance goal. The
cost table was independently reviewed and reproduced; this final docs-only update
requests no fresh measurement.

Actual npm tarball unpacked payload bytes (not filesystem allocation or npm cache):
core 503,088 → 399,545; kernel unchanged 153,529; fonts 71,330; text 114,475;
adapter 33,089 → 33,171. Core drawing install includes the **whole kernel package**:
656,617 → 553,074 (-103,543, -15.77%). Composed core/kernel/fonts/text is 738,879
(+82,262, +12.53% versus baseline core/kernel). Current tar.gz bytes respectively:
core 85,116, kernel 36,882, fonts 18,462, text 26,053, adapter 8,629; baseline
core 106,628, kernel 36,882, adapter 8,612. Font assets remain separate, unchanged:
TTF 410,712 raw / 213,360 gzip; metadata 373,653 / 33,339. No JPEG cost is claimed.

## PDF preservation and remaining risk

`cost-proof.ts` executes both actual consumer bundles. qpdf, pdffonts, pdftotext and
72-dpi Poppler raster prove matching drawing/Helvetica/prepared appearance and
extraction; Helvetica bytes match. Drawing/prepared bytes intentionally differ
after removing unused Helvetica. Measurement DTOs match. Direct baseline/current
CMR and Unicode CMR have identical extraction and exact raster hashes. ASCII CMR
SHA256 remains `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`;
Unicode changes from `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`
to `4d2b14b92120dc0ed7a7943f5d40d3c875b71b3db97726279e1ed589d1b7fc36`.
Root independent font regression retains embedded-program source-hash checks,
ToUnicode/CID structure, extraction, geometry/raster and corruption controls.
No blanket byte-equivalence claim is made. JSON/PDF/raster evidence is in the same
artifact directory. Historical evidence files remain revision-specific, not live guides.

The original Engineer's principles self-check reported cohesive files under 400 lines, functions under 50,
nesting at most three, intent-only comments, risk-based host/install/render and
boundary-negative tests, and passing implementation-run lint/tests. The independent
outcomes and unresolved browser risk are recorded above, not waived. No new approved exception. Existing
legacy/generated/historical exclusions remain. No Changesets setup exists.
The full independent implementation review is complete; the next bounded docs audit
should check that this evidence preserves the distinct browser outcomes and measured
text-cost increases without implying a GPU fix or completed performance goal.
No optimization, new quota, global registry, JPEG or unrelated showcase
modernization was attempted.
