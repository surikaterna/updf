# Text-flow authoring: proposed canonical migration

**PROPOSED; not implemented by this document.** Issue: N/A. This persists the
Architect plan with parent corrections; it authorizes neither runtime work nor
delivery. See the [bounded migration matrix](../evidence/text-flow-migration-matrix.md)
for sequencing, acceptance, ownership and evidence requirements.

## Baseline and evidence boundary

Plan read against `feature/text-flow-design`, HEAD
`882d6d38f432edcac97e962fbf446062c1483c3d`, in
`/home/sprawl/projects/updf/trees/text-flow-design`, with 140 inherited dirty paths
(40 tracked, 100 untracked). HEAD alone is **not** the delivered runtime baseline.
Pre-feature `develop` is `244c0932c733accace68b7d8fb85cdc8f851d4e8`.

Current [factory](../../packages/text-flow/src/index.ts) returns atomic
`TextFlow`/adapter and capability-bound `Block`, `Path`, `participation`.
The [current guide](../../packages/text-flow/README.md) requires paired
`createTextComposition` / `createTextFlow`, plus per-Flow participation. Straight
paths already use whole rich ink/box bands, one outer-side interval, existing
selection/painting owners and explicit fill rules; holes are not text slots.
One direct marked sibling per Flow is the current bound; Flow.Body is unsupported.

Caller reports the side-path fix verified. The preserved
[source evidence](../evidence/text-flow-side-path.md) still says re-audit pending:
that is historical delivery wording, not rewritten here and not a fresh audit
claim. The legacy omitted/`"rect"` route retains known negative-leading overlap.
**That defect is a release blocker, not an approved waiver or acceptable canonical
behavior.** S4 must apply the existing all-remaining-source clearance contract.
The [older proposal](text-flow.md) describes an earlier baseline, not current APIs.

## One authoring boundary

Install selected features once per document/operation at the normal render/layout
options boundary. No public paired factories, factory-bound `f.Block`, per-Flow
participation, automatic global registry or second text service. Images are a
separate optional feature: rectangular text-flow does not require an image loader.

All identifiers and subpaths in the following sketches that are not current APIs
are **proposed names**, not export promises or runnable examples. In particular,
`renderAsync`, high-level `Image`/`Path`, `floatable`, `textFlow`, `images`, handlers,
and `Source` entry points below require implementation. `extensions` at this
options boundary is illustrative: reconcile it with existing Flow.extensions
adapters, with one explicit registration owner, not a parallel installation path.

```tsx
// PROPOSED: prepared-resource synchronous path; normal font options are unchanged.
import { render } from "@updf/core";
import { Block, Image, Path, layout } from "@updf/layout";
import { floatable, textFlow } from "@updf/text-flow";
import { Source } from "@updf/text-flow/sources";
import { straightPaths } from "@updf/text-flow/path";

const FloatingBlock = floatable(Block);
const FloatingImage = floatable(Image);
const options = {
  ...normalOptions, // already configured text service, fonts, resources, providers
  extensions: [textFlow({ handlers: [straightPaths()] })],
};
// Within an ordinary Document/Flow, followed by ordinary Paragraph/Span siblings:
const visual = <FloatingImage src={ownedPreparedImage}
  style={{ width: 96, height: 96, float: "left",
    shapeOutside: Source.polygon(points, { fillRule: "evenodd" }) }} />;
const filled = <Path d="M0 0 L96 0 L48 96 Z" fill="#3498db"
  fillRule="evenodd" style={{ width: 96, height: 96, float: "right" }} />;
const result = layout(preparedDocument, options);
const pdf = render(result.document, options);
```

```tsx
// PROPOSED: async preparation, not a second layout engine.
const pdf = await renderAsync(document, {
  ...normalOptions,
  extensions: [
    textFlow({ handlers: [straightPaths(), shapeSyntax()] }),
    images({ loader, cache }), // optional, explicit imported policies/capabilities
  ],
});
// In document: <FloatingImage src={Source.url(assetUrl)} ... />
// Image.src also accepts an unambiguous URL string or an owned prepared resource.
```

`floatable(Block)` and `floatable(Image)` preserve underlying prop types and add
typed float styles/metadata. They add no layout box or painter. TypeScript cannot
prove a downstream render installed the extension: absence produces a clear
runtime error, not ordinary unwrapped layout or a silent fallback. The direct Path
facade uses the same marker and existing native visual/box owners.

### Text-service capability proof is a gate, not a solved private SPI

Current [composition](../../packages/text/src/composition.ts) creates a
[serviceClosure](../../packages/text/src/service.ts) and closes both composition
and ordinary text over its runtime/font resolver. Existing plain
`createTextService` does not expose that capability. Core
[ownTextService](../../packages/core/src/core/text-service.ts) accepts exactly seven
callbacks and captures only those; attaching an extra method is not a solution.

S2 must prove a narrow **optional text-service capability** installed around the
existing runtime/resolution owner, so a previously configured plain text service
can support selection without replacing its runtime or repeating `defaultFont`.
Consume already resolved Span font identities and actual operation resources.
No private-runtime derivation by service-identity lookup, weak/global registry,
fresh font runtime, independent ledger or hidden Helvetica fallback. A custom
service lacking the capability gets a clear unsupported-capability error.
The exact capture/transport SPI needs a bounded contract proof before geometry or
async resources proceed. Nested operations must isolate handles, bindings,
cumulative work, failure cleanup and disposal. Stop S2 if this proof fails.

## Geometry, fill rules and syntax

`Source` builders produce immutable filled descriptors, with lightweight metadata
only; `/sources` must not fetch, parse paths, import fonts or decode images.
Proposed forms are `Source.url(url)`, `Source.polygon(points, { fillRule })`, and
`Source.path(d, { fillRule: "evenodd" })`. There is no `Source.image` special case.

Path geometry `d` contains only geometry, never embedded `evenodd`. TSX uses
camelCase `fillRule="evenodd"`; optional SVG adapters may map SVG spelling without
making SVG a dependency. Path paint and default exclusion derive from the **same
normalized geometry/rule owner**. An explicitly authored `shapeOutside` override
is independent on purpose and does not change the paint fill rule. Layering is
therefore explicit: the visual paints its own filled shape; the exclusion policy
may reserve another region. No duplicate style `shapeFillRule` is introduced.

Default rule is `nonzero` **only when omitted**. Explicit `null`, `undefined` and
unknown rules reject, preserving the current exact domain contract.
`Path.d` remains raw path data because the field is unambiguous. Bare strings in
`shapeOutside` are ambiguous and migrate to explicit descriptors or bounded syntax:

- `url('...')`, `polygon(...)`, `path('...')`: a CSS-inspired subset, not full CSS.
- String syntax defaults to nonzero; explicit rules use builder descriptors.
- `path(evenodd, ...)` rejects in the initial grammar; a future need may justify
  extending it, not pretending it already works.
- Migrate old `"rect"`, raw path strings and `{d, fillRule}` fixtures explicitly;
  remove old conveniences after cutover, not permanent aliases.

The root addon owns only a small central wrapper/rect capability. Explicitly
imported optional handlers supply `/syntax` parsing, `/path` straight geometry,
`/intervals` compound-fill/free-interval queries and later `/curves`. The factory
accepts those capabilities instead of importing everything and returning a giant
facade. Initial compound geometry supports closed M/L/Z contours (normalization
may admit relative/H/V); both fill rules, holes and disconnected regions need a
conservative **whole-band** interval solver. It is pure geometry, not a painter or
text engine. Curves and positive shapeMargin are outside this plan.

## Resource preparation and lifetime

Async preparation completes before synchronous layout and native painting; there
is no hidden fetch in layout, async worker renderer or image-specific float path.
Reuse [assets](../../packages/assets/src), [PNG](../../packages/png/src/index.ts),
[JPEG](../../packages/jpeg/src) and existing resolved-box/aspect-fit owners after
an explicit shared placement contract proof: paint and contour use the same box,
scale, crop and origin. If reuse is missing, stop for the narrow contract decision,
not duplicated fit arithmetic. Prepared synchronous render/layout remain supported.

Image resource preparation owns decoding. PNG alpha extraction is opt-in, once
after reconstruction and before compression in the existing
[decode owner](../../packages/png/src/decode.ts); emit bounded immutable geometry,
not unconditional raw alpha retention. Current public PngResource has metadata
including alpha presence, **not raw alpha**. Alpha tracing is a separate imported
preprocessor with no layout dependency and no default PNG cost. No JPEG segmentation.

The [showcase loader](../../apps/showcase/src/text-flow-asset.ts) contains the exact
reference `https://codepen.io/theosoti/pen/ogjjged` and asset URL
`https://cdn.iconscout.com/icon/free/png-512/free-eevee-eievui-pokemon-dessin-anime-jeu-video-pokemongo-32216.png`.
Its 16-bit-to-8-bit browser conversion is a candidate optional host normalization
capability, not an Eevee-specific library API. Reuse loading/normalization generically;
do not blindly copy application code. Licensing is unknown: no redistribution
permission is inferred from remote availability or the CodePen reference.

Explicit transport policy covers unsafe URI rejection, CORS/credentials, bounded
bytes/pixels, supported formats, cancellation and cleanup. Use existing limits;
justify any new domain limits with measurements instead of invented broad quotas.
Operation-local in-flight dedup is distinct from an optional, separately imported,
bounded app-owned shared cache. Exact cache keys include resource/content identity,
policy/extraction version and alpha threshold; document storage/size accounting,
eviction, ownership and dispose. Subscriber cancellation is refcounted: one consumer
cannot abort all others. Failed or aborted work cannot poison later requests.
No permanent global cache, hidden cross-render retention or URL-only identity.

## Selection and sibling behavior

Reuse the existing text normalizer, source cursor, line construction and prepared
painting graph. One source cursor advances across sorted free intervals on the
**same baseline**, preserving spans, visuals, hard breaks and source offsets;
backgrounds must not bridge excluded holes. No substring remeasurement, second
line writer, fake two-column bird or painting-time reflow. Test conservative ink
bands with negative leading, all later sources, tangencies and disconnected holes.

S10 explicitly designs Flow/Flow.Body symmetry and sequential sibling contexts;
the current single-direct-marker implementation is not already that contract.
One active float at a time; a next marker starts only after prior clearance.
Nonparagraph content, kept paragraphs and PageBreak are barriers. The initial
group reserves the entire atomic visual and clearance, admits actual height and
defers intact; text then resumes normally, with no exclusion state on later pages.
Center flow is a deliberate **non-CSS addon extension**, not core CSS parity.
Concurrent/nested floats remain outside scope.

Keep [content roles](layout-content-roles.md), [numerical policy](numerical-policy.md),
native admission, exact native certificates, selected-graph preparation and
production ownership/budgets mandatory. Classify exact domains/identities versus
approximate derived fit versus exact certificates before numerical edits; reuse
existing local-scale arithmetic, never blanket EPS or fixed-point rewrites.

## Readiness

This is a durable plan, not a new runtime baseline, compatibility commitment or
permission to rebuild the preview. Every milestone requires a fresh bounded
Engineer assignment followed by independent Auditor review. Canonical cutover
removes obsolete public paired/atomic/participation authoring only after migration
and proof; useful internal generic owners remain. Packaging expansion, curves,
shape margins and concurrent/nested floats require separately authorized plans.
