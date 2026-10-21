# Layout content roles and ownership

Read this with [numerical policy](numerical-policy.md) and
[code quality](../code-quality.md). These are enduring ownership rules, not a
snapshot of open PRs. Inspect the actual base and its contributor instructions.

## Independent roles

- **Block versus inline** describes participation in flow. Inline content is
  measured/composed inside paragraphs; blocks participate in body fragmentation.
- **Atomic versus split** describes fragmentation, not the origin or trust of
  content. Every validated top-level fragment receives the same native admission;
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
There is no public or private candidate marker or producer registry. Copies,
wrappers, adapters, Rows and containers receive uniform top-level admission.
Do not infer native eligibility from content kind, identity, fragmentation mode
or natural height.

For **every top-level body fragment**, selection still performs candidate-local
budget reservations and validates progress, finite/nonnegative actual height and
metric occupancy first. The host then checks the exact native endpoint and
non-overlap at its margin-adjusted cursor before paint or publication. A native refusal
on a used page discards the candidate and retries the same source offset on a
fresh page with ordinary page/header/footer accounting. A fresh refusal retains
the original geometry diagnostic; missing fresh fragments remain oversized.
There is no catch-and-retry after painting starts. Accepted native coordinates
are reused for painting and placement, not reconstructed by a second probe.
Relative paint-part certificates and overlap checks remain separate.

This is not nested admission. Container/Row immediate child placements are checked
and stored before child paint. Private preparation checks declared selected layout
frames and part certificates before any selected painter runs; failures still throw
without recovery, even inside an admitted root. This is not proof of all opaque ink:
host-local native payload validation and final renderer checks remain separate.
Preparation intersects each applicable ancestor's declared semantic reservation and
explicit relation endpoints in constant work per occurrence, preserving native box
associations and explicit clipping/local overflow policy. This private seam is
implemented, not independently verified; see [preparation evidence](../evidence/fragment-paint-preparation.md).
It does not replay opaque operators or prove arbitrary ink containment. `svgBlock` compiles
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

Public block providers use only `MeasuredBlock.next({ offset, extent, width })`
and return `{ end, height, nodes }`. Host-owned finite kernel selection chooses
the prefix at fixed measured width, using actual heights, not natural size. Each
unit is eagerly validated and captured with cumulative ancestor/output budgets;
only the selected last unit's fork is adopted. Rejected lookahead still consumes
work and can fail quota. Zero-height units require empty nodes: nonempty native
payloads still require a positive validation region, even empty paint groups.
Canonical tables produce one complete painted row per query, with shared-edge
coordination retained outside decorated selection. Inline adapter requests and
positive-height `fixed` content retain their separate contracts.

Raw and rich paragraphs share the existing kernel selector over fixed-width line
metrics, with one finite-default operation per enclosing layout/measurement lifetime.
Providers return a line index and height, never paint or inspect capacity. Kept
paragraphs select one whole-paragraph unit; empty paragraphs consume one zero-height
sentinel once. Only selected lines reserve output and ancestors. Measurement,
distinct raw/rich painters and generated native certificates stay host-owned.

Private `PreparedBlock.fragment`, stacks and containers still compose selected
content; nested paint certificates can reject invalid geometry. Resolved frames
use the shared capacity predicate, while real source enumeration uses the kernel.
The unused B1 host admission session was removed, not integrated. The public kernel
candidate API remains available independently. Further consolidation requires a
concrete correctness or measured-cost justification, not uniformity alone.

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

See [uniform body admission](../evidence/uniform-body-admission.md) for current
scope and remaining migrations. [Native admission evidence](../evidence/layout-native-admission.md)
records the historical fixed-only step, not the current eligibility contract.
