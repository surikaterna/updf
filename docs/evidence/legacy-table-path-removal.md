# Legacy layout table path removal

## Bounded delivery

Base/HEAD: `b70da49ace00c19a8e570b4fc783806dffd6931c`, branch
`feature/flow-admission`, worktree `/home/sprawl/projects/updf/trees/flow-admission`.
Issue N/A. This removes the private, already-unexported layout table pipeline;
it is not the full flow-admission migration or either FINAL closure audit.
Protected A/B1 source, tests, contract and evidence remain byte-identical.

Deleted all nine `packages/layout/src/tables/` files: index, vdom, layout,
producer, validate, measure, paint, ink and types (574 production lines).
Removed exactly their eight runtime importer allowances from
`scripts/boundaries.ts`; types had no allowance. No new production source,
package/export changes, compatibility forwarding, canonical table changes,
numerical policy changes or generic Paginator helper deletions.

Repository source/import inventory found no live production consumer of this
subtree. One additional dead test fixture, `legacy-inventory.ts`, was used by two
integration tests and is retired alongside `transitional-table-proof.ts`.
The integrations now use the existing public-adapter `composableInventory`.
The canonical `table-proof.ts` already owns the prepared-font proof.
CMR/invoice production is unchanged (CMR is a native drawing consumer, not a
direct `@updf/tables` importer). Showcase and browser-fonts retain their actual
canonical imports. Historical architecture/evidence documents are unedited.

## Assertion-level coverage disposition

Paths in this table are relative to `packages/`; “ports” means the new
`tables/test/legacy-coverage.test.ts`, using real public tables in Document/Flow.
Existing canonical tests were run before and after deletion. Diagnostic paths
now use authored public content/props paths, not the retired `/table` grammar.

| Retired `layout/test/tables.test.ts` test | Retained behavior and destination |
| --- | --- |
| atomic rows, repeated header, row consumption | ports exact 11-row/3-page source ranges, frozen output/render; `tables/test/tables.test.ts` source ranges/atomic paging; integration extracted ordered unique rows and repeated headers |
| standalone/mixed TSX byte identity | canonical `tables.test.ts` ordinary JSX/data parity and mixed Document/Flow lower/render parity; old Tables.Document entry and tableIndex metadata are retired API-only assertions |
| header/first row move together, impossible pair | ports head/body advance after a 50pt block and fresh-page pair refusal with body source path |
| oversized rows never shrink/drop | ports minHeight refusal; canonical oversized-row test and both overflow policies |
| empty table/header/blank cells | canonical empty tables and head/foot-only body tests; ports exact blank-cell 10pt line; zero-geometry canonical placement uses source range 0..0 rather than legacy no-placement shape |
| wrapped cell max height/padding/grid/minimum | ports exact 36pt row and rendering; canonical box-style, borders and grid suites |
| per-key style inheritance/run override | canonical `box-style.test.ts` row/column/cell/Paragraph/Span merge, `text-style.test.ts` actual PDF colors/font sizes and `policy.test.ts` prepared fonts |
| exact fit/trusted page 21/service cap | ports exact 1/20/21 page counts and service LIMIT |
| strict shape/width/cell count/padding/unknown style | canonical strict descriptors/getter-zero-calls/row length/zero width; ports Infinity padding and unknown bold; legacy defaults grammar is intentionally not accepted |
| getter safety/run diagnostic source paths | canonical strict descriptor test; ports authored body character path through lower; `section-origins.test.ts` exact data/JSX head/foot font/character/geometry paths and spans |
| exact width overflow/derived narrow cells | ports exact ULP fixed overflow and padding-erased content rejection; canonical `widths.test.ts` exact infeasibility, before-callback ordering, very large/tiny/native certification |
| alignment/shared edges/full-width stroke geometry | ports existing Flow origins 0/20/40 on a 160pt page for a narrow 120pt table; canonical `grid.test.ts`, `borders.test.ts`, `border-pdf.test.ts` assert owned edges, endpoints, clipping and independent raster corruption controls; table-level align field is retired, not aliased |
| translated fractional origins/erased width | ports original 700pt translated fractional geometry renders and 2**55 + 1 erased-cell geometry rejects; canonical width and border PDF suites retain multi-scale native certificate checks |

| Retired `layout/test/table-boundaries.test.ts` test | Retained behavior and destination |
| --- | --- |
| resource snapshot/forged handles/closed context | ports actual prepared font snapshot despite caller map deletion, byte parity, RESOURCE rejection and retained context closure |
| run diagnostic remapping | ports authored body path; canonical `section-origins.test.ts` and `deferred-cells.test.ts` retain current occurrence, section, callback exception and span evidence |
| repeated header generated text caps | ports repeated 80-character header: unrestricted 4-page success and text quota LIMIT; canonical `mixed-section-emissions.test.ts` exact six-pass/five-fail whole-document text quota |
| cell text/block caps/readonly ownership/empty defaults | ports caller text mutation isolation without caller freeze and 4097/4096 quota failure; canonical strict shape/unused font validation, width source-work and whole-document aggregation tests. Passing an old result back to layoutTableFlowUnknown and missing old required defaults are retired grammar-only assertions |
| blank repeated header generated nodes | ports repeated 2000-newline head: same 10000-node limit allows 4 pages but rejects 8 pages with exact `Generated nodes limit exceeded (maximum 10000)`, code LIMIT and public path `/document/children/body/0`; unrestricted 8-page fixture succeeds |

No legitimate semantic coverage is intentionally dropped. Factory signatures,
the old required defaults shape, obsolete result counters and old VDOM adapter
invocations have no supported API to preserve; canonical source ranges/keys and
ordinary Document/Flow replace them. No shim is introduced.

The two foundation depth tests retain every non-table Flow/native byte-parity
and trusted/service assertion; only duplicated calls through Tables.Document and
layoutTableFlow are removed. The content-normalization wrapper/context test is
ported to public Document/Flow and retains its closed-measurement assertion.
Unrelated legacy flow coverage remains unchanged.

The table PDF integration retains qpdf checks, Poppler ordered text/font
extraction, the historical spatial grid/background oracle and missing/partial
edge negative controls. The composable integration retains weighted/scalar byte
and placement parity, source keys and the 63-edge raster oracle. Its unused
legacy.pdf write was not a comparison assertion and is retired explicitly.

## Boundaries, counts and validation

The existing integration boundary suite now asserts no old production source or
dist paths, no production deep imports and rejection of all eight removed seam
entries, plus canonical adapter presence and actual public consumers. Existing
packed runtime/declaration negative checks for removed layout table exports are
preserved. The normal packaging build removes its own dist before compiling;
the delivery verifier checks dist and the pack dry-run inventory for old paths.

Pre-deletion baseline: 131/131 old-table + canonical + affected layout tests.
Root B1 baseline was 1257; this slice removes 18 old tests and adds 11 canonical
port tests plus one boundary test: final expected root count 1251, a net drop of
6, with behavior mapped above rather than inferred from suite counts.
There is no new production code; the delivery verifier records actual new-test
LOC. All changes are uncommitted.

Exact final commands/results, manifests and the private namespace TMPDIR wrapper
are recorded in `artifacts/table-removal/HANDOFF.md`. Full root tests include CMR,
invoice/freight, qpdf, Poppler and raster integrations, not just unit mocks.
No performance, independent verification or whole-architecture closure claim.

### Audit correction history

The initial removal delivery manifest was
`91da812781ebed456355936a6c7b13d45b88c225de13d2f5cfb24e965e685cca`.
Independent audit requested changes: the original 6000-node assertion accepted
any LIMIT and actually failed source preflight (`Source nodes limit exceeded
(maximum 6000)` at `/0/children/0/children/1497/clip`), before output generation.
Its unrestricted four-page success did not prove generated-node accounting.
That original proof is invalid, not waived. The corrected controls in the table
above distinguish source admission from repetition-driven output growth. The
artifact handoff retains the original validation history and records the new
focused checks; prior full-gate passes alone did not establish this assertion.

Remaining work: production ordinary-flow dispatcher/producers, generic
Paginator fit/fits/advance/atomic users, canonical table source admission and
nested/generated-interval migration remain for fresh bounded assignments.
The frozen A/B1 engine is not wired into those remaining paths here. The two
user-requested FINAL closure audits remain pending after all old paths migrate.
