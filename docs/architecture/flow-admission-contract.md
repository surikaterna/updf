# Ordinary-flow admission and the kernel candidate API

**Current direction:** retain the correctness improvements and common native
admission, but distinguish resolved-frame fit from source enumeration. The
known-frame registration experiment below has been superseded following an
old/lean/current comparison; see [resolved-frame fit](../evidence/resolved-frame-fit.md).
The unused B1 host session, scan, projection and token types have been removed.
Its dedicated tests were not production integration evidence. The public candidate
API described below remains supported independently; it is not an additional
production admission path. See [removal evidence](../evidence/host-admission-removal.md).

## Current production path

Public providers, including canonical tables, supply width-only `MeasuredBlock.next`
units. Paragraphs share a finite-default metric operation; resolved frames use
`frameFits` without source registration. Private stack/container/decorations code
composes selected content. The paginator validates progress and occupancy, admits
the actual margin-adjusted native origin, prepares declared geometry before paint,
then publishes that accepted coordinate. Explicit page controls remain separate
from content placement.

This certifies declared layout frames, not arbitrary ink/operators inside opaque
native payloads. Local native validation and final renderer defenses remain active.
Independent final architectural and correctness reviews are still required; this
document does not claim universal closure. Further rewrites must address observed
behavior or measured cost, rather than enforce a speculative uniform framework.
Existing [content roles](layout-content-roles.md) and
[numerical policy](numerical-policy.md) remain authoritative.

## Responsibility and API

The kernel enumerates whole provider units and their prefix metrics. The host
decides admission, capacity, reservations, native certificates and painting.
Enumeration has no available height, provider capacity or native-paint dependency.
Candidate API consumers can select using endpoint metadata and materialize only
the chosen prefix, rather than a complete range at every endpoint. Production
layout's range-only bindings do not instantiate the removed B1 session.

```ts
candidates(source: PreparedSource, request: { offset: number; width: number }): CandidateCursor;
nextCandidate(cursor: CandidateCursor):
  | { readonly done: true }
  | { readonly done: false; readonly endpoint: CandidateEndpoint; readonly cursor: CandidateCursor };
materializeCandidate(endpoint: CandidateEndpoint): SelectedRange<C>;
```

Candidate cursors, region cursors, prepared sources and endpoints have distinct
opaque brands and operation ownership. All structural tokens/results are frozen.
A cursor is consumed before work; each progressing result includes a fresh cursor,
including the final unit. Advancing that final cursor returns only `done`, without
a provider call or endpoint. Empty sources and enumeration starting at extent
immediately return `done`. Legacy `select` still returns its empty range at extent.

An endpoint exposes only `{ start, end, height, unit: { start, end, height, top } }`.
Its `start` is the enumeration's initial offset; `end` is the accepted prefix end.
`height` is the persistent `MetricSum` corrected prefix. `unit.top` snapshots that
prefix before adding the new unit; it is never reconstructed by subtraction.
Nonfinite prefix accumulation fails with `GEOMETRY`, poisons, and publishes no
candidate. Exact safe offsets, progress, atomic whole-unit rules, nonnegative
finite dimensions, strict own-record validation and fixed-width identity apply.
Each independent reflow enumeration uses its exact requested width without a
cross-enumeration cache. The prepared source is resolved once at enumeration start.

## Storage and lifetime

Each enumeration owns one append-only unit sequence and one metric accumulator.
Appending is amortized O(1); cursor/endpoint metadata is O(1). Enumeration neither
copies nor traverses nor freezes any accumulated-prefix array. Two private weak
maps associate tokens with enumeration state or sequence/prefix-length/scalars.
Tokens contain no payload, descriptor, source, sequence, owner or closure.
There is no separate sequence-retaining registry. Close/poison replaces both maps,
as well as clearing existing source/view/provider stores, so retaining only an
operation and its tokens/work handles cannot retain host resources after closure.

Earlier endpoints remain usable after advancing. Materialization reserves the
entire prefix's output charge before allocating/copying, then copies exactly its
`k` frozen unit references into a fresh frozen array and range. No measurement,
reaccumulation, content clone, token consumption or result cache occurs. Repeated
materializations each charge `k` and return distinct arrays. Content is borrowed
by identity; callers retaining a materialized range legitimately retain its
content. While open, an owned endpoint may retain the enumeration sequence,
including subsequently accepted units; callers should close the operation.

## Exact cumulative ledger

Existing categories and `fragmentDefaults` are unchanged; no new limit or
safe-integer waiver exists. Preparation is unchanged and charges `sourceReads`.

| Call | Ordered charges/work |
| --- | --- |
| `candidates` | `attempts: 1`, `sourceVisits: 1`, then owned source/request validation |
| `nextCandidate` | `attempts: 1`, ownership check and consumption; terminal returns immediately |
| progressing `nextCandidate` | then `unitsExamined: 1`, `measurements: 1` before provider; explicit provider-work lease; validation/health; `outputFragments: 1` before accepted-unit/endpoint freezing/publication |
| `materializeCandidate` | `attempts: 1`, ownership check, `outputFragments: k` before copying |

Failures preserve prior charges; a failed category does not increment. Active
malformed calls charge their attempt and poison. Reentry rejects before charging;
closed calls do not charge. Provider exceptions retain identity, even if the
callback closes the operation. A caught callback violation still prevents output.

Examples (including one unchanged preparation):

- Three units, terminal call, then prefix-two materialization: attempts 6,
  visits/reads 1/1, examined/measurements 3/3, output 5, provider units 6 when the
  callback consumes two per unit.
- Empty enumeration plus terminal: attempts 2, visits/reads 1/1, all other counts 0.
- 1,000 units plus start/terminal/one materialization: attempts 1,003, intentionally
  subject to the unchanged default attempts limit of 10,000.
- Existing repeated `select` of a two-unit fit plus one rejected unit: attempts 2,
  visits 2, reads 1, examined/measurements 6/6, output 4, provider units 12 at two
  consumed per callback. Rejected units are not stored or output-charged.

Bounded `select` retains its pre-add `sum([usedHeight, prefixHeight, unit.height])`
fit test and quotas; it shares private provider validation and sequence acceptance,
not public candidate calls. Region flow continues to delegate to that selector.

## Complete-source selection

The same selector also accepts `{ mode: "complete", offset, width }`. This form
collects the remaining finite source without a physical capacity comparison;
all source/domain/identity, progress, lifecycle and work limits remain active.
Capacity fields are forbidden in this explicit query, and omitted height in an
ordinary bounded query is still invalid. Complete accumulated height must remain
finite. This is source collection, not a native placement certificate.

Kept/closed container contents and Row Columns use the complete query rather than
fabricated capacities derived from natural height or one point. Authored definite
alignment still uses its real bounded region. Natural measurement now also uses
complete selection. Public and adapter measurements report the metric sum of the
actual selected root fragment heights, not the preparation hints. A cumulative
selection budget bounds the retained complete plan; all selected root geometry is
prepared before any root painter runs. Authored height ceilings are checked before
painting. Line reports consume prepared native transforms and part positions instead
of independently scheduling containers, margins and decorations.
See [natural measurement evidence](../evidence/natural-complete.md) and the earlier
[reporting prerequisite](../evidence/prepared-line-reports.md). This does not remove
natural-size inputs from container preparation. The old B1 session is no longer
part of the delivery scope.

## Paginator publication entry

The unused private `Paginator.atomic` late-paint entry and its `fit` preflight were
removed. Ordinary placement publication requires the already-admitted native origin;
there is no optional-origin reprojection fallback. Page controls explicitly compute
their zero-height cursor coordinate before advancing. The metric validation inside
`consume` is unchanged. This narrows the existing dispatcher without rewriting
bounded nested composition. See
[single-publication evidence](../evidence/single-publication.md).

## Resolved-frame fit

Fixed, spacer, Row and closed/kept frames use the shared `frameFits` predicate.
They do not register already-known heights with the kernel's enumeration ledger.
Refusal precedes ancestor reservation and descendant queries. Row retains its
established fresh-region diagnostic. Input/output/page budgets and native admission
remain mandatory; paragraphs and provider sequences retain their kernel work limits.
Historical registration experiments and their measured reversal are recorded in
[resolved-frame fit evidence](../evidence/resolved-frame-fit.md).
