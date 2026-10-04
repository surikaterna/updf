# #43 bounded inline backgrounds — Engineer evidence

Objective: implement canonical RGB `Span.style.backgroundColor` on settled #49/#42
contracts, without reflow, ambient box inheritance or a second paragraph decorator.
This is implementation evidence, **not independent verification**.

- Cwd/worktree: `/home/sprawl/projects/updf/trees/authoring-api`.
- Branch: `feature/authoring-api`.
- Clean starting base and unchanged HEAD: `26cb863bfe068f6c983a85e82419126ef0bde81b`.
- Ownership: Engineer owns the complete manifest below; no prior dirty files.
- Git scope: no new commits or staged files; 11 tracked modifications unstaged,
  six new files untracked. No delegation, tracker mutation, stage/commit/push/PR.
- Issue #43 remains **OPEN**. Slice **implemented**, ready for parent integration
  and independent Auditor; not verified, merged or delivered.

## Exact delivery manifest

Tracked modifications:

```text
apps/browser-fonts/flow-numerical-proof.ts
apps/showcase/src/rich.tsx
docs/text-styles.md
packages/core/src/core/layout-operation.ts
packages/core/src/measurement/line-height.ts
packages/layout/src/content-normalize.ts
packages/layout/src/content-paragraph.ts
packages/layout/src/content-producer.ts
packages/layout/src/text-style.ts
scripts/boundaries.ts
tests/consumer/types/text-style-template.tsx
```

New files:

```text
apps/browser-fonts/inline-background-proof.ts
docs/evidence/inline-background43.md
packages/layout/src/content-style.ts
packages/layout/src/inline-background.ts
packages/layout/test/inline-background.test.ts
tests/integration/inline-background.test.ts
```

## Acceptance evidence

| Contract | Implementation / evidence |
| --- | --- |
| Canonical role-aware property | Span accepts RGB backgroundColor; Paragraph explicitly excludes/rejects it. Existing Block/Cell property unchanged. Docs specify explicit Block wrapper, no duplicate decoration or ambient cascade. Packed NodeNext/Bundler examples compile supported highlights and reject string/undefined/alias/wrong-role styles. |
| Explicit inheritance and composition | Separate run-index metadata, not core TextStyle or visual callback style. Nested Span omission inherits, RGB overrides, siblings resume parent; object source order tested. RGB snapshots/structured channel paths, wrong keys, undefined, empty Span validation tested. |
| Measured geometry, not reflow | Rectangle x/width match measured x/advance, including retained spaces. Height and baseline-relative leading reuse the existing participant resolver with operation-owned fonts/raw ratios/absolute points. Visuals use declared ascent/descent. Tests assert mixed participant rectangle coordinates, identical line size/baseline/foreground ink and native foreground nodes. |
| Foreground isolation | All background nodes of a placed paragraph fragment precede all foreground nodes across its lines; each stateful materialized line coordinate resolves exactly once. Tight ink may overhang; no implicit block, glyph clip or ink-sized fill. Raster controls reject missing/wrong RGB and actual PDF backgrounds reordered above glyphs. |
| Wrap/whitespace/visuals | Adjacent spans, wrapped retained/collapsed spaces, LF/empty lines, empty spans, mixed prepared/built-in fonts, inherited foreground color and visuals covered. Browser numerical proof adds nested RGB highlights with prepared/built-in fonts, preserved spaces, wrapping, LF and tight height; data/JSX PDF bytes and result parity pass. |
| Bounds/resources | Highlight node/group counts and five commands per rectangle charged before allocation in candidate and final output, including measurement. Tests prove node/command exhaustion precedes paintLine allocation. Invalid inherited resources precede callbacks; highlights never enter callback TextStyle. Aggregate content ink includes fill; line/fragment ink remains foreground ink, documented. |
| Regression boundary | Existing Block/Cell background, #42 borders, #49 metrics/context/resource and fixed CMR byte/geometry/raster tests pass unchanged. Legacy, superscript/shaping/CSS expansion, dependencies, fixtures and reference tolerances intentionally unchanged. |
| Showcase | Actual displayed rich.tsx source adds adjacent yellow/blue RGB highlights, preserving explicit foreground colors. Full showcase source/download/Node-browser parity and preview tests pass. |

No known #43 acceptance work remains. Independent audit/integration and authorized
tracker/delivery disposition are outside this assignment.

## Commands and final outcomes

Node v24.21.0; existing esbuild 0.28.2 and Vite 7.3.6. Same cwd/base/HEAD above.
Full-gate tool calls use timeout **600000ms**; no asynchronous checks outstanding.

| Exact command | Outcome |
| --- | --- |
| `npm run format` | Pass; formatter only changed assigned files |
| `npm run format:check` | Pass |
| `npm run lint` | Pass Biome error gate and ESLint principles |
| `npm run typecheck` | Pass full package build and root tsc |
| `npm test` | **498/498 pass**, zero skips (base 488 + ten #43 tests) |
| `npx tsx --test packages/layout/test/inline-background.test.ts tests/integration/inline-background.test.ts` | Initial six unit/two raster tests **8/8 pass**; two later budget/callback tests pass in final full suite |
| `npm run test:consumer` | Seven clean tarball closures pass; public NodeNext/Bundler compile/runtime |
| `npm run build:browser` | All twelve builds pass; existing font-browser chunk-size warning remains |
| `npm run build:showcase` | Pass |
| `npm run check:graphs` | Pass all twelve graphs and narrow importer/export seam inventories |
| `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase` | **49/49 pass**, zero skips |
| `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | **9/10 pass**, zero skips; unchanged approved #50 SVG signature failure |
| `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:browser` | Additional environment: **10/10 pass**; does not replace #50 disclosure |
| `BROWSER_CHROMIUM=/usr/bin/chromium npm run test:showcase` | Additional run **49/49 pass** (showcase uses its own SHOWCASE_CHROMIUM/default selector) |
| `git diff --check` | Pass |

#50 exception: signature ink-mass delta `0.030079044159627057` at
`tests/svg-reference/browser.test.ts:131`; other reported mismatch/bbox metrics zero.
User-approved deferral; no skip, threshold, tolerance or fixture changes. Intermediate
compile/test/principles errors were corrected, not waived. Raster foreground oracle
disables Poppler antialiasing to compare exact opaque foreground masks independently
of background-dependent edge blending; actual obscuring PDFs fail that oracle.

## Scoped consumer cost

Commands: `npx tsx scripts/style-consumer-cost.ts before` on clean base, then
`npx tsx scripts/style-consumer-cost.ts after` on final production scope. Matching
dynamic inputs/options/toolchain and retained metafiles are in ignored
`artifacts/style49/{before,after,delta}-{textOnly,paragraphFlow}.json`.

| Same consumer scope | Before raw/gzip/modules | After raw/gzip/modules | Delta |
| --- | --- | --- | --- |
| Named core text-only | 39,498 / 13,973 / 38 | 39,498 / 13,973 / 38 | 0 / 0 / 0 |
| Document → Flow → Paragraph | 137,117 / 44,958 / 118 | 138,682 / 45,369 / 120 | +1,565 / +411 / +2 |

Added retained modules: inline-background.ts (metadata/validation/paint) and
content-style.ts (cohesive extraction to keep normalizer within principles).
No Fontkit/PDF.js/SVG/tables/React/selectors enter these consumer closures. These
are scoped bundle/module measurements, not startup/CPU/heap or universal minimums;
no arbitrary cap or optimization claim. No core-only overhead observed.

## Code-principles / Auditor handoff

Universal checklist self-check satisfied: correctness and strict validation;
documented defaults/role boundaries; cohesive production files <=400 lines;
functions <50 lines and nesting <=3 (ESLint); intent-only comments; ten risk-based
tests plus browser proof and packed negatives; lint/typecheck/native tests pass.
No new code-principles exception. Only approved validation exception is #50 above.
No Changeset: repository does not use Changesets.

Auditor should inspect unstaged **and untracked** scope, especially measured
advance/participant rectangle edges, nested metadata/resource ownership, stateful
line coordinate reuse, all-background-before-foreground order across tight lines,
count-before-allocation/output accounting, paragraph wrapper semantics and browser
parity. Parent owns integration; do not treat this Engineer evidence as verification.
