# Composable layout: approved blueprint and bounded foundation

## Current contract

Use the native [document](../documents.md), [content](../inline.md),
[block](../blocks.md) and [table](../tables.md) APIs. The transitional public
surfaces are removed as described in [migration](../authoring-migration.md).
The dated blueprint/delivery notes below are historical, not current audit status
or API instructions. Historical audit records under `docs/evidence` are unchanged.
Current optional [baseline JPEG](../jpeg-images.md) uses generic core XObject leaves;
the historical blueprint's "no images" statements below describe those dated
slices, not the current source. Core `resourceBytes` counts JPEG handles as well as
fonts; JPEG has separate fixed structural-profile caps. Current text is rich-only,
with five runtime callbacks, seven full-service methods and one standalone-measurer
method; [measurement](../measurement.md) supersedes historical plain/rich proposals.

## Historical E delivery — 2026-10-03

The caller reports A/B/C/D independently verified, including D's 294 native tests,
17 site tests, 11 browser builds, eight browser tests and six packed closures.
E mixed fixed/flow sections, singular PageSize, sealed final page/fragment contexts,
captured deferred decorations and the new mixed-document showcase are implemented
for independent audit, **not verified**. See [documents.md](../documents.md) and
[E evidence](../evidence/architecture-mixed.md). The actual baseline is separately
captured; earlier status/evidence records below remain historical and unchanged.
F separate tables, G and #33 images are not part of this slice. No delegation, Git
delivery, tracker or deployment/settings mutation was authorized or performed.

## Historical D delivery — 2026-10-03

The caller reports A/B/C independently verified and authorizes D only. D's unified
Paragraph/Span data+TSX authoring, atomic inline adapters and public content
measurement are **implemented for independent audit, not verified**. The actual
contract is [inline.md](../inline.md), with [D evidence](../evidence/architecture-inline.md).
There is no E final page context/deferred recipe API, F new tables package or Image.
The historical C/B status/evidence below is retained verbatim, not the current
prerequisite status. No delegation, Git delivery, tracker or deployment mutation.

## Historical C delivery — 2026-10-03

Independent audit requested changes C-F1–C-F5 despite the prior passing gates.
Their remediation is **implemented, awaiting independent re-audit, not verified**.
The current complete source passes 266 native tests, seven browser tests, 17 site
tests and six packed closures. See [C audit remediation](../evidence/architecture-blocks-audit.md).
The earlier delivery counts below are historical; they did not establish C verification.

The caller reports B independently verified after F1–F5 and the ordered-key fix.
The B status statements below are historical delivery notes, not the current
prerequisite status. They and the foundation evidence have not been rewritten.

C is **implemented, awaiting independent audit; not verified**. It includes the
generic fragment loop and transitional paragraph/fixed/spacer/break/table-row
producers, operation-local public adapters, stacked containers with constrained
border-box sizing/minHeight space/atomicity, padding-edge error/hidden overflow,
owned static first/all/last decorations and the visible external chart showcase.
Real qpdf/extraction/raster negative controls prove clipping is visual containment,
not redaction. Current gates pass 251 native tests, seven Chromium tests, 17 site
tests and six packed closures. No numerical certificate/roundoff-policy rewrite.
The accepted partial delivery is separately archived rather than overwritten. See
[architecture-blocks.md](../evidence/architecture-blocks.md) for exact scope,
contracts, gates and preservation manifests, and [blocks.md](../blocks.md) for
the concrete C data contract. **No D before independent C audit.**

The approved C–G blueprint below is unchanged. No D work, public Image or final
PageContext API is implemented by this tranche.

Date: 2026-10-02. Private/unreleased worktree
`/home/sprawl/projects/updf/trees/measured-flow-tables`, branch
`feature/measured-flow-tables`, base/HEAD
`ac60f80675a2042f2f6043bae51b541b85e7251f`.

This is the approved sequential A–G blueprint, not a claim that all its APIs exist.
A captures the existing delivery in [architecture-baseline.json](../evidence/architecture-baseline.json):
427 actual paths with SHA-256 and byte lengths, including 42 modified tracked files
and 84 untracked files. The recorded gate counts/hashes are **prior evidence**,
not reruns. Original history, evidence, assets and roadmap bodies are retained.
B foundation is implemented, not independently verified; audit is required before C.
The first independent audit confirmed F1–F5 adversarial failures despite passing
project gates. Their bounded remediation is implemented and awaiting **re-audit**;
passing the updated gates is not independent verification.
There are no commits, tracker mutations, publication or deployment in this slice.

## B: available foundation API

`@updf/core` exports `Limits`, `OperationOptions`, `RenderOptions` and frozen
`SERVICE_LIMITS`. `RenderOptions` is the operation-options contract; `LowerOptions`
extends it with the existing registry and metadata fields. The same explicit policy
travels through render, lower, measurement, prepared-resource resolution and the
existing optional flow/table paths. Options are checked before resources or body
execution. Own enumerable data fields only: unknown keys, accessors, present
undefined, infinities, negative/fractional/unsafe integers are rejected.

| Limit | Units | Service seed |
| --- | --- | --- |
| `depth` | Traversal nesting, root at zero; AST drawing/VDOM/source traversal roots are format-specific | 128 |
| `nodes` | Source nodes and generated native nodes, independent totals, never summed across passes | 10,000 |
| `pages` | Generated/native pages | 20 |
| `textCodePoints` | Unicode code points, including spaces and LF; not UTF16 units | 100,000 |
| `pathCommands` | Aggregate drawable primitive commands: path length, rectangle 5, line 2; excludes viewport clips/style/transform/PDF operators | 100,000 |
| `resourceBytes` | Private bytes of unique owned resources, including unused bindings; aliases do not duplicate charges | 8 MiB |
| `outputBytes` | Complete serialized PDF bytes, including objects/xref/trailer/programs | 10 MiB |

Default profile is `trusted`: no arbitrary workload ceilings. Internal safe-integer
counter checks remain. `service` installs the above seeds; validated overrides
replace individual values, including zero. There is deliberately no `imageBytes`
field: images/#33 are not implemented, so no enforcement is promised. There is no
public measurement-work counter, per-text-node 4,096 cap, eight-font-id cap or
mandatory 4 MiB prepared-program cap. `createPreparedFont(input, options?)` checks
an optional `resourceBytes` limit before its defensive copy.
Zero pages cannot produce a valid document: at least one native/empty-flow page
is still required. Detached node/context construction has no operation options
and uses trusted data checks; an operation's service limits are not a constructor
or arbitrary-JavaScript execution sandbox.

Source node meaning follows each boundary: VDOM visits count node/array objects;
flow/table and measurement preflight count distinct source data containers
(including paragraph/run/style arrays and objects). Generated document nodes count each occurrence,
including containers and repeated regions. Those are separate checks against the
same ceiling, not one inflated sum. Measurement reuses logical content identities:
paragraph run arrays/native fixed nodes retain the maximum text charge observed
for that identity. Repeated measurement does not charge again; a larger mutated
input charges the positive delta. Generated text counts each emitted occurrence.
Generated/fixed validation uses separate ledgers under the **same policy** so
preflight, measurement, pagination and final validation do not triple-charge text.

Each operation snapshots the caller's font bindings once into a privately owned
Map; prepared handles retain their existing WeakMap identity/ownership. No mutable
Map, font bytes, serializer plans or public trust flags escape. Nested public calls
create independent operations. Geometry, font profiles, dense data/descriptors,
cycles, finite arithmetic and PDF representation remain mandatory.

`@updf/core/vdom` exports:

```ts
createContext<T>(defaultValue: T): Context<T>
useContext<T>(context: Context<T>): DeepReadonly<T>
// Context<T>.Provider is Component<{ value: T; children?: VDOMChild }>
```

Defaults are copied/frozen at context creation; provider values at node construction.
Callers are never frozen. Plain/null-prototype records and dense arrays are copied
iteratively. Context values reject functions, accessors without invoking them,
cycles, class/prototype objects, symbol data, binary buffers and VNodes. Privately
owned prepared fonts are the intentional opaque-handle exception, not a duck type.
Provider nodes and contexts are privately branded; providers are not eager normal
components. Readonly value typing is deep (including arrays); recursive VDOM child
typing terminates at its already-readonly grammar rather than expanding infinitely.

Private synchronous frames carry `{ operation, providerEnvironment, phase }` and
are pushed/popped in `finally` around component/extension execution. Hooks outside
execution fail structurally. Provider environments are privately owned immutable
bindings restored for siblings, nested lower calls and failures. No async context
propagation, state, effects or public page-phase API exists. Promise/thenable output
is rejected as non-VDOM without reading/assimilating `then`.

Trusted traversals use heap frames for snapshots, lowering/text children, validation,
measurement, painting serialization, font/alpha collection and layout data/output.
Active-path cycles are mandatory. Repeated deterministic component/extension
invocations with the same data under semantically equal effective provider bindings reject as
nonprogressing expansion; repeated siblings and recursion with changing data remain
legal. This is not an execution-time guarantee: a loop inside a user component,
progressively changing infinite expansion, hostile Proxy or optional parser can
still consume host resources. Service policy is **not a CPU/memory sandbox**.

Binding comparison includes each declaration's immutable default when a provider
is absent. Recreating a provider/Map does not itself count as progress. Actual
provider values still retain their captured snapshots; equality is used only for
cycle detection, not to replace those values. Data comparison preserves ordered
enumerable key sequences, array vs record and ordinary vs null prototypes, signed zero and NaN; distinct owned font
programs/VNodes remain distinct opaque identities even with matching metadata.

Array lowering, text-child traversal and owned array snapshots advance one sibling
at a time with cursor heap frames. Descriptor checks happen when an element is
consumed; unvisited tails are not enumerated/scheduled before the next source-node
budget check. Dense-array/extra-key validation completes on successful consumption.
No hidden service array-length cap or changed VDOM source-node counting was added.
This bound concerns traversal bookkeeping before rejection, not the caller's input
allocation, successful full enumeration, or arbitrary executable component work.

Both existing flow/table VDOM adapters share a private iterative postorder native
node converter using ordinary owned factories. Depth-3,000 fixed/repeated-region
native and component outputs now have exact PDF parity. Generated region/fixed
accounting reserves a wrapper only when nonempty children cause one to be emitted;
empty regions still reserve their geometry independently of node accounting.

`core/schema.record` is now exported internally as `validateDataObject`. Existing
call sites import that name (some retain local `record` aliases to avoid unrelated
diagnostic/control-flow churn). Font-specific `fonts/checks.record` remains separate
because it owns font diagnostics. Geometry/Fontkit use other validator helpers;
they had no imports of the removed core `record` export. No compatibility export
was added. Descriptor, unknown-key and null-prototype behavior is unchanged.

## Ceiling inventory and deliberate residual policies

Removed/replaced core ceilings: `core/error` pages/nodes/text/totalText/output;
`core/validate` depth/aggregate paths; `painting/commands` per-path 4,096;
`painting/style` dash length 128; `vdom/data` depth 128, 250,000 copied values/array
length and 100,000 UTF16 units; `vdom/lower`/`native` depth/work/text concatenation;
`measurement/ledger` 10,000 work/100,000 text; `measurement/validate` runs/paragraphs
and rich/plain 4,096; `fonts/resources` eight ids/eight MiB aggregate and alias
double-charge; `fonts/checks` mandatory four MiB preparation size. Layout source
preflight, block/template/table arrays, page-break scans, paginator pages and
generated node/text/path/work caps now use explicit policy or mandatory safe-integer
checks, not independent hidden workload ceilings.

The following **optional adapter parser policies remain separate**, unchanged
except making Fontkit's existing byte cap explicit at its own entry point. Core
`profile`/`limits` do not configure these grammars; do not claim all parser caps
were removed:

- Geometry: polygon/polyline coordinate arrays 8,190/8,192; path string/scanner
  units 100,000; normalized path output 4,096 commands (`shapes`, `scanner`, `normalize`).
- SVG: source length/UTF8 bytes 1 MiB (`xml-lex`); XML depth 64, elements 10,000,
  attributes 64 (`xml`); class selectors 1,000 (`css`); transform list 128
  (`transform`); emitted nodes 10,000 and aggregate commands 100,000 (`compile`),
  plus geometry's normalized-path budget. Separate optional grammar, not core VDOM.
- Fontkit: input four MiB (`index`); sfnt directory 128 (`sfnt`); cmap directories
  128, groups/inventory 65,535 (`cmap`), parser character set 65,536 (`metadata`).
  Parser metrics/outline work remains outside a CPU sandbox.

Existing core identifier grammars also remain deliberate separate limitations:
resource IDs are ASCII identifiers of at most 64 characters (`core/text-resources`);
Helvetica is not a reserved binding ID. Prepared PostScript names are restricted ASCII names
of at most 128 characters (`packages/fonts/src/prepare`). These are retained metadata grammars,
**not** universal PDF length limits or configurable workload budgets. Prepared
descriptor stem estimates stay 1..1,000, italic angles -90..90, metric bounds use
signed 16-bit ranges, advances unsigned 16-bit ranges and supported flags mask
`0x70063`. Such font/schema value restrictions do not disappear in trusted mode.

Unbounded trusted arrays also avoid spread arguments/`Math.max(...array)` in core
measurement and lowering; these were implicit JavaScript call-arity ceilings.
Mandatory representation constraints are distinct: native output's conservative
`Uint8Array` length ceiling is `0xffffffff`, which also keeps classic ten-digit
xref offsets representable; counters must remain safe integers. PDF Identity-H
CID0 is reserved, leaving 65,535 used CIDs per font (`fonts/cids`). TrueType glyph
IDs/count, units-per-em, metric/descriptor ranges, Unicode scalar space (1,112,064
potential prepared mappings), PDF numeric syntax and finite/bounded/conditioned
geometry remain format/representation checks, not arbitrary profiles. RGB/matrix/
bounds arities and stroke invariants remain schema checks.

## C–G: approved direction, deliberately not implemented by B

- Keep the same core/VDOM runtime. Later paragraph/span layout unifies plain/rich
  measurement behind public `measure(content, constraints, resources)`; low-level
  private plain/rich distinctions may remain. Transitional measurement context is
  available now; final page context is not available during this phase.
- Generic measured block/fragment protocol, private paginator without paragraph/
  table switching. Natural width, available height, content/border box, padding,
  gap, min/max; overflow `error` by default or `hidden` via native padding-edge
  clip. Clipping is not redaction. Atomic blocks remain independent.
- Ordered `MixedDocument` fixed pages and flow sections; `PageSize.A4`, A5, Letter,
  Legal, custom sizes and orientation. Keep singular **PageSize**. Empty flow keeps
  its existing one page unless an explicit later decision changes it.
- Fixed reserved flow header/footer heights; final `PageContext` only after
  pagination. Repeated generic block decorations receive `FragmentContext` with
  their captured provider environment. No mutable global current page.
- Later new `@updf/tables` -> layout -> core with `Table.Head/Body/Foot/Row/Cell/HeaderCell`.
  Cells hold block content and may include inline SVG badges. Existing tables stay
  in their current package for this foundation slice. SVG remains optional through
  role adapters; an external chart block must need no engine changes.
- Generic future image block (default block, possible inline) is approved direction
  only. No `Image` export or image implementation. No public serializer plans,
  full CSS, global plugins, shaping, row splitting or nested tables.

The bounded rich showcase now demonstrates a context theme and reports trusted/
optional-service policy without a page-context claim. The flow UI remains bounded
independently of core policy. Evidence and independent audit of B precede C; #25
must not be closed merely because this foundation API exists.
