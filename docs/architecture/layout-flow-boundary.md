# Internal layout flow boundary

## Current extraction, not the future flow engine

S3 extracts the two heap-continuation interpreters and candidate-local
continuation state into `packages/layout/src/flow-runtime/`. S4 separately moves
generic stack construction and natural-height accumulation into
`packages/layout/src/flow-composition/stack-model.ts`. These are internal folders,
not a new package or public API. No export map, public barrel, dependency, or
numerical contract changes. Stack selection, region flow, pagination,
preparation, native painting, and host validation remain in the layout host.
The whole flow/paginator is **not** independently portable yet. Further
stack-selection/region-flow extraction requires separate design and
characterization. No unmerged fit-framework work (including PR 68) is included.

## Ownership and dependencies

| Owner | Current responsibility |
| --- | --- |
| `flow-runtime/protocol.ts` | Two recursive capabilities over opaque request/result and context/node types |
| `flow-runtime/runtime.ts` | Separate fragment and paint depth-first heap-continuation loops |
| `flow-runtime/fragment-state.ts` | Object/number/bigint copy-on-write continuation snapshots |
| Host `protocol-runtime.ts` | Explicit instantiations using `FragmentRequest`, `PlacedFragment`, `FragmentPaintContext`, `NodeDefinition` |
| Host `fragment-state.ts` | Direct re-export of the same state class, not a subclass |
| Host `protocol.ts` | Existing narrower calls, prepared geometry, metadata, budgets, reservations |
| `flow-composition/stack-model.ts` | Generic stack entries/extents and compensated natural height; existing arithmetic only |
| Host `stack.ts` | PreparedBlock instantiation, direct host limit callback, selection and space continuation |
| Host stack/container/row/decorated producers | Selection, trial reservation, child progress and native coordinate certificates |
| Host paginator | Region/page lifecycle, top-level acceptance, real-budget painting, placement recording |
| Host extensions/core/text | Callback validation, selection-time native nodes, output limits, source/kernel work and text measurement |

All reachable runtime **and declaration** dependencies of `flow-runtime/`
must stay within that folder or standard ECMAScript libraries. No host import,
including type-only imports, re-exports, or `import()` types, is permitted. Core,
text, layout-boxes, Node and DOM are not dependencies of the extracted seam.
The host may instantiate generic types with native types; dependency direction
is host → internal runtime, never the reverse. Native-free strict compilation
uses `types: []`, ES2022 only, `skipLibCheck: false`, and declaration emission.
Emitted JS and declaration closures are tested separately, with leak controls.

## S4 stack-model boundary

The distinct model boundary permits only `stack-model.ts` and the actual
`@updf/layout-boxes/arithmetic` entry implementation, not the whole kernel.
`StackChild` needs only readonly `extent`, optional `control: "advance"`, and
`naturalSize.height`. Generic entries retain the original child references and
custom child types. Construction reads no width, fragmentation, native output,
budget, reservation, source metadata or fragment capabilities.

The host keeps its five-argument `stack` and forwards once with the existing
`checkLimit` function directly. Host `stackHeight` is a TypeScript instantiation
expression, with the same runtime function and narrower PreparedBlock type.
There is one model implementation, no service object, factory, predicate copy,
exception translation, child mapping or new per-child closure.

Both loops retain their original operation order. Controls contribute natural
height but do not count toward between-box gaps. Extent checks precede the
height pass; the local append closure retains the `+42` finite-remainder allowance,
capacity fallbacks, exact maximum/path/"Block extent" callback and thrown identity.
Selection, auto-margin, dyadic spaces, reservations and native certificates are
unchanged. Atomic does not mean actual height equals natural height.

Strict ES2022 compilation and separately checked source/JS/declaration closures
execute both model functions with nontrivial custom children. Runtime arithmetic
is required to be reachable; the model declarations do not need arithmetic
types. Exact allowlists and compilation-first leak controls reject host runtime,
transitive and erased/type-expression/re-export dependencies. The S3 pure-ES
profile remains the strict default, without the model's arithmetic allowance.

## Capability signatures

```ts
interface FragmentCall<Request, Fragment> {
  readonly block: FragmentProducer<Request, Fragment>;
  readonly request: Request;
}
interface FragmentProducer<Request, Fragment> {
  readonly fragment: (request: Request) => Fragment | undefined;
  readonly fragmentSteps?: (request: Request) => Generator<
    FragmentCall<Request, Fragment>, Fragment | undefined, Fragment | undefined
  >;
}
interface PaintCall<Context, Node> {
  readonly fragment: PaintProducer<Context, Node>;
  readonly context: Context;
}
interface PaintProducer<Context, Node> {
  readonly paint: (context: Context) => readonly Node[];
  readonly paintSteps?: (context: Context) => Generator<
    PaintCall<Context, Node>, readonly Node[], readonly Node[]
  >;
}
function resolveFragment<Request, Fragment>(
  block: FragmentProducer<Request, Fragment>, request: Request
): Fragment | undefined;
function resolvePaint<Context, Node>(
  fragment: PaintProducer<Context, Node>, context: Context
): readonly Node[];
```

Host capabilities remain structurally assignable without unsafe variance casts,
conversion, cloning, rebinding, or producer rewrites. Requests and results are
opaque to the interpreters; no geometry, native-node, or budget fields are read.
There is no universal dispatch framework.

## Interpreter and state lifecycle

- Prefer a steps generator whenever present; otherwise call the synchronous
  capability. Invoke properties on their original receiver, including generator
  creation. Public executable callbacks remain synchronous host responsibilities.
- Process yielded children depth-first and pass exact request/context/result
  references. Fragment input starts at `undefined` and resets to `undefined`
  after each successful `next`; paint starts at a fresh `[]` and allocates a new
  `[]` at each corresponding reset. Final arrays/results are not copied.
- Generator creation, synchronous calls and `next` failures escape with the
  same exception identity. No catch, retry, `finally`, generator `return`, or
  cleanup of suspended ancestors is added. Later siblings are not visited.
- `FragmentState.fork()` shares the immutable snapshot. `set()` replaces the
  owner's offsets map and outer map. `adopt()` replaces the whole snapshot,
  never merges. Key/value domains remain object/number/bigint with no new
  validation. Discarding candidates does not publish their state.

## Host lifecycle preserved, including asymmetric publication

These are current contracts, not a proposed transactional rewrite:

1. Top-level paginator selection forks state and output budget. A missing
   fragment advances/retries on a nonfresh body; on a fresh body it fails.
   Acceptance checks progress, height/fit and native materialized coordinates.
   Painting uses the **real** output budget, not the candidate budget. The top
   candidate budget is **not adopted**. Nodes are appended and the placement is
   recorded before offset/state adoption; state adoption precedes accepted
   advance. Paint failure is not retried and does not publish candidate state,
   nodes or placement. This is not global rollback of all host effects.
2. Nested stack selection forks each child budget/state. On a returned fragment,
   it adopts the child **budget then state before progress validation**. A
   nonprogress failure can therefore observe those adoptions. Missing fragments
   leave their candidate unpublished. Spaces retain exact dyadic remainders.
3. Decorations first trial the full set (including last-only entries). If that
   trial is not complete, they trial without-last. The without-last candidate
   replaces the chosen candidate only when it exists and remains incomplete.
   Otherwise the full candidate may remain chosen while the visible entries
   are without-last. The chosen budget is adopted, discarded reservations are
   released, then chosen state is adopted and ancestors reserved. Do not replace
   this with “always choose the second trial” or recompute the chosen snapshot.
4. Native extension callbacks create native output nodes **during selection**.
   The host validates, reserves and snapshots those nodes then; painting charges
   the real budget and instantiates emission nodes. Selection is not pure or
   lazily materialized. `atomic` requires its finite one-unit extent, not equality
   between returned fragment height and measured natural height.

`OutputBudget.work` is part of candidate fork/adopt/release counts, alongside
nodes, text and commands. It is distinct from monotonic source/kernel work on
the host operation. Rejected candidate output accounting must not be described
as rolling back source/kernel work.

## Numerical and compatibility invariants

This extraction preserves all arithmetic, fit decisions, conservative numerical
behavior, native coordinate/generated-interval certificates, source identity,
fixed-width identity and quota rules. No known conservative behavior is fixed
here. Approximate occupancy and exact domain/identity/certificate distinctions
continue to follow the [numerical policy](numerical-policy.md). Native output,
placements, traces and PDF bytes are compared against frozen S2 evidence.

## Stopping point and rejected cursor

S3 and S4 passed independent audit. This is the useful internal boundary and the
stopping point for this PR, not a prerequisite for a numerical correctness repair.
A subsequent selector-cursor experiment was independently rejected (NO-GO): it
removed no dependencies and increased complexity and bundle bytes without enough
boundary benefit. Its prototype and harness are not part of this delivery. See
[S3/S4 evidence](../evidence/layout-flow-boundary.md) for historical measurements,
portable gates and the final delivery scope.

## Separate numerical follow-up proposal (not approved or implemented)

The next bounded proposal should target real false deferrals at the existing
selection/materialization owner, preserving exact native certificates. For
heights `[4.9, 0.1]` in 5 and `[1.2, 1.1]` in 2.3, native placement fits exactly
while subtraction-based remaining space can reject the second child. Acceptance
should distinguish those cases from `[0.1, 0.2]` in 0.3: that last case is only a
metric fit, not an exact native fit, and must not be forced onto one page.

Public atomic fragments can return heights different from natural heights.
Request normalization and observable placed-fragment deferral therefore need an
explicitly approved contract before implementation. The goal is to avoid false
deferral where the existing native certificate permits placement, with boundary
tests for all three cases and unchanged domain/identity/quota validation. This
does not approve a new ParentFit framework, fork/preview protocol or kernel
policy change. No numerical runtime change is included here.
