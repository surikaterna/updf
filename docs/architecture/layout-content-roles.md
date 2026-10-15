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

The existing `FixedBlock` represents validated, known-height native content,
including owned deferred emission recipes. There is no new public candidate
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
containers retain their existing behavior and limitations. SVG currently uses
conversion plus its strict adapter-fit checks; moving SVG to fixed native content
is a future migration, **not implemented here**. Do not call this an SVG
false-deferral fix.

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
