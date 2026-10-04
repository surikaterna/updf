# #42-B2 implementation handoff

Objective: finish #42's public table border policy on the audited #42-A Block
policy and #42-B1 final shared-grid seam. Implementation, not independent audit.

Worktree/cwd: `/home/sprawl/projects/updf/trees/authoring-api`.
Branch: `feature/authoring-api`.
Clean starting base and unchanged HEAD: `6b7f3b66de2f8566e10f14eeffc95c3b0a6929b6`.
Engineer owns all changes listed below. No changes committed or staged; tracked
changes are unstaged and new files untracked. No delegation, Git delivery or tracker
mutation. GitHub #42 remains **OPEN**; this slice is **implemented**, ready for Auditor
and parent integration, not verified or delivered.

## Exact manifest

Tracked, modified:

```text
apps/showcase/src/tables.tsx
docs/tables.md
docs/text-styles.md
packages/layout/src/shared-edge-paint.ts
packages/layout/src/shared-edge-regions.ts
packages/layout/src/shared-edge-types.ts
packages/layout/test/shared-edge-paint.test.ts
packages/layout/test/shared-edge-regions.test.ts
packages/tables/README.md
packages/tables/src/adapter.ts
packages/tables/src/edge-report.ts
packages/tables/src/measure.ts
packages/tables/src/types.ts
packages/tables/src/validate.ts
packages/tables/test/box-style.test.ts
tests/consumer/types/composable-tables-template.tsx
tests/showcase/tables.test.ts
```

New, untracked:

```text
docs/evidence/borders42-b2.md
packages/tables/src/borders.ts
packages/tables/test/border-fixtures.ts
packages/tables/test/border-pdf.test.ts
packages/tables/test/border-sections.test.ts
packages/tables/test/borders.test.ts
```

## Delivery and full #42 acceptance

| Acceptance / contract | Evidence |
| --- | --- |
| Reusable typed policy across supported roles | TableStyle extends layout BorderPolicy; column/row/cell use that schema. Shared `expandBorders` validates border-only projections; no duplicated edge validator. Packed NodeNext/Bundler consumers compile all roles, null/zero and invalid color types. |
| Defaults and layer composition | Each border shorthand expands before table → column → row → cell merge, like padding. All source layers validate, including overridden/unused values. Border fields are excluded from Paragraph defaults. New runtime and authored-origin tests. |
| Local geometry, not deferred-neighbor reflow | Each cell reserves its own resolved edge widths, then padding; omitted edges fall back to grid, null/zero reserves zero. PDF transforms assert a thicker opposing winner does not enlarge the neighbor's inset. Docs explicitly warn about ink in locally unreserved space. |
| Deterministic final shared paint once | Generic provenance is grid/explicit, with zero-width explicit suppression. Explicit positive wins; greater explicit width then upper-bottom/left-right owner wins ties, independent of report order. No positive: suppression beats grid, otherwise grid wins. Native PDF proves six total border fill primitives and exactly one red seam interval. Duplicate primitive negative PDF rejects. |
| Correct placement and corners | Logical boundaries stay undisplaced; shared paint centers there. Explicit exposed edges move inward by half width; grid-only historical full-width displacement/endpoints are preserved. Asymmetric outer-box and mixed-color numerical assertions; B1 grid assertions unchanged. Zero-width claims retain identity without irrelevant paint trims. |
| Bottom-only headings, totals, outer boxes, mixed grids | Existing #42-A heading/Block outer-box proofs remain passing; B2 adds bottom-only totals, asymmetric cell frame and mixed grid edges. Actual showcase demonstrates shared colored rules, null on the opposing side and totals edges; displayed source is the actual raw module and Chrome checks it. |
| Fragmentation and clipping | All four natural/deferred head-foot combinations on repeated and first/last-only multipage tables. Final-page-dependent deferred row style participates without changing body ranges. Short roots retain gaps. Actual clipped Table PDF exposes no phantom cut edge or outside-parent ink. Existing Block first-top/last-bottom and B1 clipping proofs remain passing. |
| Strict numerical/resource/context preservation | Explicit edges tested at 1e-6, 0.1 and 1e6 scales, nonzero origins, natural/deferred roots, using exact native arithmetic associations rather than epsilon. Nonrepresentable/oversized insets and claim limits reject. Prior 455-test coverage retained; 33 additional native tests give 488/488, including CMR bytes/raster, resources, context callbacks and native containment. |
| Not CSS | Public docs describe cell-owner defaults, non-inheritance, conflict/corner/clip/fragment rules and local-only insets. No CSS border-collapse/all, selectors, cascade or extra row/table layout boxes. |

Unchanged intentionally: Block policy/measurement, finalizer/transport and pagination
mechanisms, text defaults/line-height contract, resource ownership, legacy, CMR,
reference thresholds, dependencies and optional-feature boundaries. No deferred
neighbor measurement/reflow, row splitting or general table redesign.

## Final validation

Node v24.21.0, same worktree/HEAD above. Gates use existing package.json scripts;
terminal calls used timeout 600000ms. No asynchronous checks remain outstanding.

| Exact command | Final outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass Biome error gate and ESLint code-principles |
| `npm run typecheck` | Pass full package build and root tsc |
| `npm test` | **488/488 pass**, zero skips |
| `npm run test:consumer` | Seven clean tarball closures pass; NodeNext/Bundler declarations and runtime ownership |
| `npm run build:browser` | All twelve builds pass; existing font-browser >500kB chunk warning |
| `npm run check:graphs` | All twelve graphs and importer/export seam inventories pass, rerun after final browser builds |
| `npm run build:showcase` | Pass |
| `SHOWCASE_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:showcase` | **49/49 pass**, zero skips, rerun after final source change |
| `BROWSER_CHROMIUM=/home/sprawl/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome npm run test:browser` | **9/10 pass**, zero skips; only approved deferred #50 failure |
| `git diff --check` | Pass |

The browser command was run before and after the final zero-width-claim fix; the
same #50 signature failure remains at `tests/svg-reference/browser.test.ts:131`:
ink-mass delta `0.030079044159627057`, other reported mismatch/bbox metrics zero.
No skip, fixture, threshold or tolerance changed. User explicitly deferred #50.

Focused commands also run:

```sh
npx tsx --test packages/tables/test/*.test.ts packages/layout/test/shared-edge-*.test.ts
npx tsx --test packages/tables/test/borders.test.ts packages/tables/test/border-sections.test.ts packages/tables/test/border-pdf.test.ts
npx tsx --test packages/tables/test/border-sections.test.ts
npx tsx --test packages/tables/test/borders.test.ts
```

Final authoritative full suite supersedes intermediate fixture failures. Initial
checks caught obsolete type negatives, leaked internal claims in decoration data,
an overlong function and test fixture/type errors; these were corrected without
relaxing schemas, clips, numerical checks or code-principles enforcement.

Final graph counts: core 39, VDOM 51, fonts 7, measurement 23, flow 115, tables 135,
composable tables 135, React demo 91, Fontkit 113, font browser 245, geometry 56,
SVG 84. Final Vite table entry closure is 127.21kB raw / 35.30kB gzip. These are
full entry closures, not marginal costs, runtime measurements or optimization claims.
Graph checks preserve absence of Node/React/optional leakage in portable consumers.

## Code-principles and next owner

All universal checklist items satisfied: correctness and strict invalid-data checks;
defaults preserved except the assigned new policy; cohesive production files under
400 lines; functions under 50 lines and nesting within three levels (ESLint passes);
comments remain intent/invariant-only; risk-based tests added as listed; lint,
typecheck and native tests pass. No new code-principles exception. Only approved
validation exception: #50 above. No Changeset: repository does not use Changesets.

Auditor should review the full unstaged **and untracked** manifest, especially
positive-vs-suppression ranking, reversed owner ties, asymmetric corners, local
insets under thicker neighboring ink, current-page deferred styles and exposed clip
boundaries. Claims now represent four logical cell sides, including no-paint sides;
configured claim/node budgets remain authoritative and are tested, not waived.
No known #42 acceptance work remains in this slice. Independent audit, parent
integration and authorized tracker/delivery disposition remain outside this assignment.
