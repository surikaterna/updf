# Layout numerical ownership and paginator origin reuse

## Scope and source policy

Tracker: N/A. Worktree: `/home/sprawl/projects/updf/trees/layout-placement`;
branch: `feature/layout-placement`; base/HEAD:
`c48b5a3032b31dbf45f5024934fd49071ab6a30b`. The worktree was clean before
dependency installation or editing. Only this assignment's paginator, two test
files and two documents are delivered, uncommitted. No staging, commits, tracker
mutation, cherry-pick, or dependency on open/unmerged PR #84 or #68 occurred.

The [ownership matrix](../architecture/layout-numerical-ownership.md) classifies
existing production operations under the unchanged
[numerical policy](../architecture/numerical-policy.md). This is private origin
consolidation, **not a fractional-fit fix**. SVG false-deferrals, strict native
ineligibility, and remaining contract decisions are explicitly retained.

The production change adds a private `y` argument to `recordFragment` and `place`.
Ordinary recording stores the actual pre-paint origin instead of recertifying it.
Controls explicitly retain one native certification and the old default diagnostic
path. `bodyStart` still certifies relative parts; overlap checks, final geometry,
callback and state/budget publication order remain. Public adapter output is
copied into private fragments with captured numeric heights, not handed back to
public callbacks for painting. No runtime freeze protection was removed.

## Clean-base characterization, then after comparison

Before production edits, `npm ci && npm run build` passed using Node `v24.21.0`,
esbuild `0.28.2`. npm noted the esbuild postinstall was not allowlisted; installation
and all actual builds succeeded without modifying install policy or the lockfile.

An ignored temporary probe (`artifacts/layout-placement/probe.ts`) imported the
normal `tests/fixtures/text-options.ts` layout/render services. It laid out these
public `h(Block/Row/Column, ...)` cases on a 100-by-20 page with zero margins:

- Direct: two empty Blocks, heights `4.9` and `0.1`.
- Nested: a natural Block containing heights `1.2` and `1.1`.
- Row/Column: Row with two Columns, first containing `1.2`, `1.1`, second `2`.
- Decorated: Block with padding `1` and black border width `1`, containing height `2`.

Each leaf Block used `backgroundColor: [0.2, 0.3, 0.4]`, so the PDFs contain real
paint. Commands `npx tsx artifacts/layout-placement/probe.ts before` and, after
rebuilding, `npx tsx artifacts/layout-placement/probe.ts after` captured JSON
documents, full placements, PDF length and SHA-256. A Node `assert.deepEqual`
comparison of the two `fixtures` arrays passed: exact document, placement,
metadata, byte length and PDF-hash parity in all four cases.

| Case | PDF bytes | Identical before/after PDF SHA-256 |
| --- | ---: | --- |
| Direct | 697 | `4a3b727cc4a0d36d579e928f20aa103ee2c604ab95099a39fff5b309bea4ae05` |
| Nested | 699 | `741aec28835154d6edb74c6a6a9b5fcdfd139ed5ce0562de41b0fb2a28cbaa8b` |
| Row/Column | 837 | `8d26d739a44eebaba3b2181a239b7d676c1486d1e412695a650568aeb8f57732` |
| Decorated | 900 | `d4a37474953870594705b9f9be9f4b5f48540f710cdf59326c2bb76da78c1a67` |

The first three new paginator tests also passed against the unchanged base build
before the production edit: exact paint/placement origins, metadata, callback
trace, selected-only state continuation, separate speculative/live charges, and
paint/quota failure with no retry or placement/node publication. The fourth test
adds source-suffix diagnostics for fresh deferral. All fixtures are ordinary
private producer records; no malicious-public-callback mutation scenario is
invented. The portable regressions do not depend on the temporary probe or local
baseline JSON. An initial probe failed on unsupported `style.background` and was
corrected to `backgroundColor` before capture. A translated test with a five-point
body hit the existing conditioning guard; the valid 40-point body replaced that
fixture, not the guard.

Before-change existing characterization command (35 passed):

```sh
npx tsx --test packages/layout/test/roundoff.test.ts packages/layout/test/generated-interval.test.ts packages/layout/test/fractional-reservation.test.ts packages/layout/test/auto-margin.test.ts packages/layout/test/row-boxes-production.test.ts packages/layout/test/column-boxes-flow.test.ts tests/integration/fractional-reservation.test.ts
```

That includes native qpdf validation, `pdftotext` bbox/text equality and
`pdftoppm` raster equality against an independently translated native control.
After-change full tests also execute this integration check. No general PDF
visual equivalence is inferred beyond the checked fixtures.

## Paired browser-consumer cost

Both measurements used the actual built packages from this worktree (base first,
then changed source), not a PR #84 baseline, source alias, or reconstructed old
paginator. Consumer contents:

```js
import { layout } from "@updf/layout";
globalThis.layout = layout;
```

esbuild options for both sides: `stdin.resolveDir = process.cwd()`, `bundle: true`,
`platform: "browser"`, `conditions: ["browser"]`, `format: "esm"`,
`target: "es2022"`, `write: false`, `metafile: true`; run once with `minify: false`
and once with `minify: true`. Gzip uses Node `gzipSync(bytes)` defaults. The same
probe runs `build(options)` on that consumer, then reports `bytes.length` and
`gzipSync(bytes).length`. No timing/performance benchmark was run.

| Profile | Base raw | Changed raw | Delta | Base gzip | Changed gzip | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Unminified ESM | 302841 | 302860 | +19 | 69095 | 69096 | +1 |
| Minified ESM | 155202 | 155223 | +21 | 49641 | 49650 | +9 |

Paginator source: 9192 → 9241 bytes (+49). SHA-256 before:
`637c09f3742669d7198abad876946f4411fd0d4a7e3521fee2d4b6fc88c2799d`;
after: `b28f084e2795512d1259b00174640c4310490572494244ac241fda2d763fec1d`.
The added private arguments and explicit control certificate slightly increase
bundle size despite removing the ordinary repeated evaluation. No byte-saving
claim is made. Core-only source is unchanged; no paired core-only or SVG profile
was measured. The all-package `npm run sizes` packing ritual was not needed for
this focused paired cost check; packed consumer and graph gates still ran.

## Validation and portable regressions

Exact final gate outcomes are recorded below; logs and paired JSON are retained
under ignored `artifacts/layout-placement/` for the local audit, not test inputs.

| Command | Outcome |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including AST code-principles gate |
| `npm run typecheck` | Pass, including full workspace build |
| `npm test` | Pass, 1164 tests |
| `npm run test:consumer` | Pass, fourteen external tarball closures and declarations |
| `npm run build:browser && npm run check:graphs` | Pass, all twelve browser graph profiles |
| `npm run test:browser` | Pass, 15 tests |

Focused after-change command:

```sh
npx tsx --test packages/layout/test/paginator-origin.test.ts packages/layout/test/generated-interval.test.ts packages/layout/test/fractional-reservation.test.ts packages/layout/test/roundoff.test.ts packages/layout/test/width-resolver.test.ts packages/layout/test/budgets.test.ts packages/svg/test/*.test.ts
```

Pass: 70 tests. Existing generated-interval, fractional-reservation, roundoff,
width-identity and quota regressions were reused rather than duplicated. Existing
kernel arithmetic source-preservation and graph tests run in the full suite.
The scoped search for `EPSILON`, `class MetricSum`, `function sum(` and
`function exceeds(` under `packages/layout/src` found no local arithmetic owner.

`paginator-origin.test.ts` covers fractional and translated origins, auto margin,
zero height, controls before/after ordinary fragments, pages, source metadata,
width, pre/post paint publication and failure traces. The direct `y` dataflow in
the production diff and ownership document is the source witness for removal;
no brittle occurrence-count test or instrumentation framework was added.
`svg/test/numerical-fit.test.ts` deliberately asserts two-page behavior for the
native-certifiable `[4.9, 0.1]` / `5` and `[1.2, 1.1]` / `2.3` SVG cases. It
separately checks origin-zero native rejection for `[0.1, 0.2]` / `0.3` and
three `10.3` / `30.9`, plus translation-sensitive eligibility at 700.

## Principles and safe stopping point

Correctness and risk-based coverage checked; files remain cohesive and at most
400 lines, functions at most 49 lines, nesting at most three levels. No new
numerical policy exception or approved code-principles exception is used. Comments
describe contracts/intent. No Changesets configuration exists; none was introduced.

Status: implemented for this bounded scope, ready for independent audit, not
verified. Auditor should review actual uncommitted scope, certified-origin
dataflow, retained native/overlap/control diagnostic behavior, callback/state/quota
traces, and the explicit unchanged false-deferral limitation. Broader repair needs
separate contract authorization; it is not silently included here.
