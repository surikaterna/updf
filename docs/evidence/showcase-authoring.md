# Showcase authoring migration

The main reusable, flow, block, rich-text and mixed-document demos use the current
`@updf/layout` authoring API: `Document`, `Flow`, `Paragraph`, `Span`, and `Block`.
Uppercase JSX names refer to imported or application-defined components; lowercase
`text`, `rect`, and `group` refer to native drawing intrinsics. Capitalizing an
intrinsic is not an API migration.

The reusable template lazily loads layout and still produces two pages. The entry
remains core-only. Flow footers use final `PageContext`, with reserved region
heights; summaries report authored counts and actual layout fragments separately.
The block example groups a headline and adapter-backed chart with the current
`keepTogether` property. `Block.Header` and `Block.Footer` use `repeat={false}`
for first/last fragment decoration, respectively. API cleanup (#41) is not part
of this migration.

The compact block page is now 240 × 180 points (previously 240 × 160) so the
default chart plus headline and decorations fit when kept together. Oversized
charts still produce the existing fresh-body error; constrained hidden overflow
still clips without redacting extractable text.

Mixed flow regions use measured components. Its deliberately fixed cover and
appendix use native drawing through `fixed-pages.tsx`, whose full source is shown
alongside the main module. Native text and painting examples remain explicitly
low-level. Chart and SVG adapters are advanced application examples; this does
not introduce a built-in Chart, Svg, or Theme API (#47 remains future work).

No engine, dependency, CMR, or table behavior is changed. Browser tests compare
the executed source to the displayed source, Node/browser PDF bytes, final page
counts, controls, overflow, stale-result cancellation and last-good previews.
Changed demo bytes/styles are intentional; they are not compatibility fixtures.

Local implementation checks: showcase build/typecheck passed; all 49 showcase
tests passed (46 existing plus 3 authoring regressions). After rebuilding with
concurrent foreign layout edits, the focused 22-test measured-demo/browser-proof
suite passed. Scoped Biome/ESLint and root `tsc --noEmit` passed. `qpdf --check`
passed on template, flow, mixed, and rich PDFs. The browser-fonts proof build
retains its existing large-chunk advisory. These are implementation checks, not
an independent audit or a claim to rerun the previously audited native suite.
