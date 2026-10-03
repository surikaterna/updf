# Slice F — composable tables delivery

Private/unreleased, **implemented for independent audit, not verified**. A–E are
independently verified per the caller. G cleanup/removal and #33 images are next,
not delivered. The earlier bounded prerequisite is archived verbatim in
[architecture-tables-prerequisite.md](architecture-tables-prerequisite.md).

Worktree/cwd: `/home/sprawl/projects/updf/trees/measured-flow-tables`.
Branch: `feature/measured-flow-tables`. Base = HEAD:
`ac60f80675a2042f2f6043bae51b541b85e7251f`. Integration owner: Engineer; no delegation.
Tracker N/A. No staging, commit, push, PR, merge, deployment, Pages activation or
tracker mutation. The manual workflow still runs only on explicit dispatch; its
existing build command now builds core → layout → tables → showcase through the
updated root script, without deployment/settings changes.

## Actual scope and contract

- New MIT © 2026 Surikat AB private `@updf/tables` `2.0.0-poc.0`, explicit ESM/types
  root export and exact core/layout dependencies. No SVG/Fontkit/React/Node dependency
  or private core/layout imports. Public namespace Table.Head/Body/Foot/Row/Cell/
  HeaderCell and readonly `table()` data descriptor use one adapter and one local
  `tableExtension` installation. No separate layoutTable/layoutTableFlow new roots.
- Public generic layout author bridge: owned component/part identities, captured
  content scopes, relative diagnostic suffixes and fixed-height deferred decoration
  reservations. Nearest provider snapshots survive data and JSX transport. Current
  sealed renderer bindings overlay captured author scopes only during an emission;
  no public binding setter, mutable current page or font/serializer-plan escape.
- Explicit global point column widths; atomic row packing; multi-row section unit
  reservations; first/all head and last/all foot; meaningful empty head/foot and
  zero-geometry empty tables. Generic source extents/ranges/keys report body
  consumption, including zero body progress for an empty table. Paginator changes
  are generic metadata/error-origin transport only: **no selection math/cursor/page
  allocation change, table branch or producer import**.
- Public same-operation cell stack measurement, inherited supported text styles,
  C padding/gap/closed-height/hidden overflow, max natural cell height and row
  minHeight. D's Paragraph/Span/inline line engine remains the only text wrapper.
  Native grid/background ordering and contained/shared edges retain the historical
  63-edge inventory raster oracle. Complementary clipped half-strokes join separate
  reserved regions without double-thick visible edges; no numeric tolerance change.
- Operation-wide adapter source ledgers and semantic extension caches. Immutable
  descriptors share measurement across cell compilers; ancestry is part of the
  cache key so cached root tables cannot bypass nested-table validation. Scoped
  executable content gets occurrence ownership rather than stale-provider reuse.
  Raw paragraph caches remain compiler-local; measurement contexts close in finally.
- Actual `tables.tsx` showcase migration: multiple paragraphs, ordinary chart
  component and separately lazy application SVG block/inline badge adapters;
  bounded rows/wrapping/width/repeated-head/minHeight/oversize/content-preset controls,
  authored totals footer, real source, preview/download and generic row metrics.
  Text/chart selection has no SVG closure. Existing E mixed showcase remains.
- Root build/format/lint inclusion, seventh actual packed closure, standalone new
  table browser bundle and graph/size/license assertions. No new JSX runtime,
  Changesets infrastructure, image claims, global plugins or customer artwork.

The concrete contract is [tables.md](../tables.md) and the package README.

## Migration and protected history

The pre-F manifest is `architecture-tables-baseline.json`, captured before edits
(60 modified tracked / 206 untracked inherited files, excluding F's recorder).
`architecture-tables-delta.json` enumerates all changed/added/removed hashes and
the cumulative committed/staged/unstaged/untracked delivery.

Only `apps/showcase/src/tables.ts` is intentionally removed, replaced by the actual
`.tsx` module. The old C fixture is independently preserved in
`tests/fixtures/legacy-inventory.ts`; the existing legacy raster test changes only
its fixture import, not its 3-page/63-edge oracle or negative controls. A separate
converted public-adapter fixture checks the same oracle. The PDF operator bytes may
differ because of native grouping/clips; **geometry parity**, not a rewritten CMR
golden, is the migration proof. Fixed CMR source/bytes and numerical certificates
remain unchanged. No old evidence/roadmap/license/Fontello OFL is rewritten.

G still must remove `@updf/layout/tables`, `/tables/vdom`, layoutTable/layoutTableFlow
and the legacy implementation/proof adapters. They remain unreleased transitional
controls, not a permanent facade. The earlier public low-level measurement aliases
also remain G work. No G cleanup, release, publication or issue closure is claimed.

## Validation and risks

Exact commands (all from the worktree above): `npm ci --ignore-scripts`,
`npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run test:consumer`, `npm run check:licenses`, `npm run build:showcase`,
`npm run test:showcase`, `npm run build:browser`, `npm run test:browser`,
`npm run check:graphs`, `npm run sizes`, `npm run test:legacy`,
`npm run test:legacy:comparison`, `npm audit --omit=dev`, `npm audit`,
`npx tsx scripts/report-slice-f.ts`, `git diff --check`.

Final command outcomes and delivery counts are recorded in the final handoff and
the delta manifest. New public tests cover author-part ownership/lifetime, invalid
metadata/getters, zero source extent vs strict progress, data/JSX byte equality,
provider reuse, prepared-font aliases/style inheritance, shared chart caches,
numeric cell arrays, real deferred contexts, atomic oversize, nested-table/role/
schema rejection, clipping, cumulative service policy and the converted PDF raster.
Actual site tests include text/chart/SVG byte parity, lazy-chunk proof, qpdf all-row
order/multiplicity and once-last footer, and a known-color native SVG cell reference
against Chromium. Existing C/D/E/native font/raster tests remain enabled.

Final outcomes at unchanged HEAD:

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Pass; 486 packages; historical deprecation warnings |
| `npm run format:check` | Pass; 403 files |
| `npm run lint` | Pass; Biome 406 files and code-principles ESLint |
| `npm run typecheck` | Pass; full core/layout/tables/apps build and root `tsc --noEmit` |
| `npm test` | **342 passed**, no skips |
| `npm run test:consumer` | **Seven** clean external tarball closures, both NodeNext/Bundler, types and runtime |
| `npm run check:licenses` | Pass; seven actual tarballs; tables 39 files, full MIT, no font/test assets |
| `npm run build:showcase && npm run test:showcase` | Pass; production /updf/ build, **20 passed** |
| `npm run build:browser && npm run test:browser` | Pass; **12 builds**, **nine passed**, unchanged SVG reference tolerance |
| `npm run check:graphs && npm run sizes` | Pass; 12 graphs; new standalone tables 105,671 bytes / 29,439 gzip, no optional/legacy leakage |
| `npm run test:legacy` | Known raw container failure; 0 passing / 1 failing |
| `npm run test:legacy:comparison` | Equivalent historical baseline; 18 passing / 1 pending / 6 failing, not a raw pass |
| `npm audit --omit=dev` / `npm audit` | Zero production; known full audit 45 vulnerabilities |
| `npx tsx scripts/report-slice-f.ts` | Pass; all 158 pre-F protected paths, including all 133 inherited protected paths unchanged |
| `git diff --check` | Pass |

Core-only bundle remains **49,793 bytes / 15,107 gzip**; fixed CMR remains **5,779
bytes**. These values are not replacement goldens. Final cumulative delivery is
**61 modified tracked paths / 241 untracked files**, zero committed/staged paths.
The manifest hashes 35 changed baseline paths (including the F-owned recorder),
34 added paths excluding its own self-referential delta JSON, and the one explicit
`.ts` → `.tsx` showcase migration removal. All remaining inherited files retain
their pre-F hashes. Supplied font declarations are checked through the public
measurement context even when overridden/unused, with style/row/cell source paths.

Development failures were corrected, not suppressed: generic JSX factory typing,
captured-scope chains/final bindings, native-VNode transport regression, stroke join
containment, source-count semantics, unreachable consumer type negatives and
production chunk factoring. Graph tests now assert seven deliberate optional
chunks and the **new** table package/no legacy table closure; this is an approved
feature expectation change, not a relaxed numerical/raster threshold. No broad skip.

Known historical failures remain explicit: raw legacy container TypeError; isolated
full harness 18 passing/1 pending/6 failing, baseline-equivalent; full npm audit
45 vulnerabilities (8 moderate/10 high/27 critical), production audit zero.
The optional Fontkit >500 kB build warning remains. No audit fix, dependency update,
legacy repair or threshold weakening was attempted outside F.

Self-check: cohesive production files ≤400 lines, functions ≤49 lines, nesting ≤3;
no blanket `any` or table-private seam imports; comments explain invariants/tradeoffs;
risk-based public tests added; modern authoritative lint/type/tests pass. **No
approved code-principles exception.** Trusted callbacks/Proxies are not a CPU sandbox.

Auditor should review the actual manifest delta, public bridge/cache/source-ledger
lifetime and quota behavior, final-context overlay and deferred header/foot scopes,
row/grid geometry and the actual tarball/browser/site closures. Mark F verified only
after that independent audit; G and delivery authorization remain separate.
