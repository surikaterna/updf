# Layout content roles and ownership

Read this with [numerical policy](numerical-policy.md) and
[code quality](../code-quality.md). These are enduring ownership rules, not a
snapshot of open PRs. Inspect the actual base and its contributor instructions.

## Independent roles

- **Block versus inline** describes participation in flow. Inline content is
  measured/composed inside paragraphs; blocks participate in body fragmentation.
- **Atomic versus split** describes fragmentation, not the origin or trust of
  content. An unknown atomic adapter is not a built-in fixed native producer;
  its returned fragment height need not equal its natural height.
- **Row/Column layout mode** describes arrangement. Their staged kernel bindings
  should remain thin. The host owns content measurement, fragment policy,
  reservation budgets and native paint/materialization.
- Controls and assets are not all flow blocks: page breaks alter pagination,
  spacers reserve space, and resources have their own preparation/lifetime rules.

## Fixed native content

`fixed({ width?, height, children })` snapshots canonical `FixedBlock` data for
validated, known-height native content, including owned deferred block recipes.
Height and explicit width are positive finite; omitted width fills the host region.
Explicit width must fit exactly and is the reported width and native validation box,
not the available region width. No shrinking or available-width inference occurs.
There is no new public candidate
marker. Only the final built-in fixed producer object is privately registered.
Identity reuse retains registration; copies, wrappers, decorated producers,
Rows and containers do not inherit it. Do not infer eligibility from atomic
fragmentation or natural height, or propagate it across a parent tree.

For a **direct body fixed producer**, selection still performs candidate-local
budget reservations and validates progress, finite/nonnegative actual height and
metric occupancy first. The host then checks the exact native endpoint and
non-overlap at its existing cursor before paint or publication. A native refusal
on a used page discards the candidate and retries the same source offset on a
fresh page with ordinary page/header/footer accounting. A fresh refusal retains
the original geometry diagnostic; missing fresh fragments remain oversized.
There is no catch-and-retry after painting starts. Accepted native coordinates
are reused for painting and placement, not reconstructed by a second probe.
Relative paint-part certificates and overlap checks remain separate.

This is not nested admission. Nested fixed children, decorated content and
containers retain their existing behavior and limitations. `svgBlock` now compiles
authentic prepared geometry into `fixed({ width, height, children })`: direct SVG
therefore uses this admission path, fixing strict subtraction false-deferral for
certifiable native endpoints. Nested numerical edges can still fail the parent
certificate with `GEOMETRY`; this is not a promise of all nested fixed fits.

## Native inline versus advanced adapters

`nativeInline({ advance, ascent, descent?, nodes })` creates an owned `InlineVisual`
without extension installation or measurement callbacks. Advance is positive finite;
ascent/descent are finite nonnegative with positive total height. Native nodes use
local top-left coordinates; the host measures clipped/transformed ink and translates
it by ascent into baseline coordinates. Omitted descent is zero. Deferred block and
shared-edge recipes reject: inline has no block-occurrence lifecycle.

Native and callback inline sources share descriptor ownership, exact width/style
operation-local caches, validation/capture and emitted-occurrence accounting.
`defineInlineAdapter` plus `inline` remains the advanced dynamic callback path and
requires local installation, as does `defineBlockAdapter` plus `extension` for
dynamic block content. These are not required for known native snapshots.

`svgInline` compiles prepared geometry into `nativeInline` with advance=width,
ascent=height and zero descent. Both SVG helpers authenticate and preserve warning,
size and clipping semantics before layout takes ownership. **Breaking unpublished
API removal:** `svgAdapters` and both SVG adapter implementations are deleted, with
no compatibility tuple/alias. Other adapters (tables, charts, badges) still install.
SVG's `/layout` optional peer boundary remains parser/JSX-free.

## Three distinct numerical responsibilities

1. Shared `MetricSum`, `sum` and `exceeds` own approximate metric arithmetic.
   They do not certify native endpoints or change exact request/cache identity.
2. `@updf/layout-boxes/geometry` owns the native binary64 certificate.
   `tryMaterializedStart(axis, offset, extent)` returns the certified start or
   `undefined` using exactly `(axis.start + offset) + extent`, finite endpoints,
   start at/after axis start and end at/before axis end. Hosts still validate
   operand domains; negative extents are not newly rejected by this helper.
   `materializedStart` uses that same predicate and throws the existing GEOMETRY
   diagnostic at the supplied path. No remaining-axis derivation or epsilon is
   involved. The helper is additive on the existing geometry subpath only.
3. Budgets own exact counts/work/page limits. A candidate reservation failure
   must not be hidden by a later native refusal or page retry.

Use these existing owners before introducing abstractions. A concrete host use
can justify a narrow geometry helper, not a parallel generic fit framework,
callback bag or engine factory. Measure micro-costs with paired base/current
profiles and fixed warmup/repetition methodology. Explain positive overhead;
do not infer speedups from noisy timings or rewrite arithmetic globally.

See [native admission evidence](../evidence/layout-native-admission.md) for this
bounded implementation's fixtures, measured costs and gate results.
