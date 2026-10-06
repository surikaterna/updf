# Native node source ownership

Version-1 public wire kinds remain `rect`, `line`, `path`, `richText`, `paintGroup`
and `xObject`. `NodeDefinition` is still a discriminated union of plain readonly
data, not executable node instances. JSON/AST snapshots, opaque font runs and owned
resource handles keep their existing semantics.

## Owners and narrow phases

Core `src/nodes/{rectangle,line,path,rich-text,paint-group,xobject}.ts` own accepted
AST keys, construction during native lowering, validation, measurement, ink,
collection and painting for their respective kinds. Rectangle/line/path share
drawing parsing/bounds helpers rather than copying algorithms. Rich text calls
the installed readonly `TextService`; it does not implement a second text engine.
XObject policy is independent of JPEG or any other resource format.

`nodes/wiring.ts` is the single assembly point. Its separately typed exhaustive
phase maps select one function from the requested phase, not a kind descriptor
holding all capabilities. Maps are function-local, with static named imports;
there is no eagerly frozen all-phase global registry or per-node method object.
Indexed type assertions are localized here to retain the checked map's
discriminator/function relationship for TypeScript union keys.

All six kinds validate, measure, paint, lower and contribute ink. Collection
explicitly maps `paintGroup` to `null`: descendants are collected once by the
driver. VDOM's early measurement proof only applies to `richText` and `xObject`;
other entries are explicitly `null`, not fake methods. Native work accounting
applies to rectangle/line/path commands and rich-text code points.

Drivers own page iteration, traversal order, iterative task stacks, active-cycle
tracking, cumulative node/depth/command/output budgets and source origins.
Group owners return shells or request scheduling through typed context callbacks;
they do not recursively dispatch children. Group geometry retains ancestor clip
intersection and empty-clip handling. Legacy rectangle/line default painting and
endpoint-only root line validation remain distinct from explicit/local painting.

Owner runtime dependencies point to schema/error/numeric/painting helpers, never
back to the top-level phase drivers. Operation/service/resource context types are
type-only imports. Paint contexts supply drawing/text output and resource lookup
capabilities, avoiding a measurement import of the writer or painting emitter.

## Inventory and the trusted AST bridge

`nodes/metadata.ts` owns the exact case-sensitive kind inventory and shallow
`isNativeNodeKind` predicate. Native construction keeps those exact spellings;
primitive registration reserves all native names case-insensitively, including
`RichText`, `PaintGroup` and `XObject`. Unrelated uppercase custom names still work.
Public native prop types remain tied to the existing node declarations via `Omit`.

The existing unstable `@updf/core/internal-drawing` seam reexports
`nativeNodeKinds`, `isNativeNodeKind`, `isNativeNodeData`, `isNativeNodeDataArray`
and `nativeNodeToVdom` for sibling integration, not public authoring. No new
package subpath is introduced. Classification checks only an enumerable own data
tag; it never substitutes for strict validation. Recognized malformed nodes stay
on the native validation path. Descriptor traps on trusted proxies are not sandboxed.

Core `vdom/native-data.ts` converts AST nodes postorder through existing owned
factories, preserving snapshots, resource IDs, transforms, clips and child order.
It checks data descriptors before reading props, drops only `type`, and rejects
active cycles without recursion. The type-exhaustive inventory supplies structural
child fields; there is no six-kind leaf policy in layout. Layout's `native-vdom.ts`
owns only document/page assembly; its former `document-native.ts` whitelist is
removed. Lowering still owns operation quotas, validation and origin remapping.
A future kind requires its core owner, metadata and applicable phase wiring;
layout's classifier and bridge do not require another kind case.

## Evidence

Tests instrument actual compiled owner functions through each driver, compile
missing-kind/wrong-kind controls and exercise all six AST/VDOM lifecycles.
`scripts/consumer/native-node-proof.ts` installs the frozen Post-A tarballs and
compares identical browser-bundled six-kind workloads: exact PDF bytes, lowered
ASTs, transformed/clipped ink and diagnostic code/path/message parity. Four real
native PDFs pass qpdf, in addition to the six matched resource-name profiles.
Eight minified browser profiles report parsed inputs separately from retained
bytes; standalone measurers retain only a small inventory constant, not node
handlers or emission code. See [Slice B evidence](../evidence/native-node-owners-slice-b.md)
for exact costs, commands and delivery state.
See [integrated A/B/C evidence](../evidence/native-node-cohesion.md) for the final scope.
