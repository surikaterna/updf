# S7a: owned PNG alpha inspection and exact pixel-cell geometry

Implemented for independent audit, **not independently verified**. Issue: N/A.
This is only S7a, not completion of S7. Worktree:
`/home/sprawl/projects/updf/trees/image-preparation`, branch
`feature/image-preparation`, base/HEAD
`fbf2f78fd59635c6b965f2a707f35508dc1e4392`. Inherited S6 work is preserved;
there is no commit, stage, delivery or tracker mutation.

## Explicit leaves and contracts

```ts
import { preparePng } from "@updf/png";
import { readPngAlpha } from "@updf/png/alpha";
import { preparePngShape } from "@updf/text-flow/png-shape";

const resource = await preparePng(bytes);
const plane = await readPngAlpha(resource, { maxPixels: 1_000_000 });
const shape = await preparePngShape(resource, {
  shapeImageThreshold: 0.15,
  maxPixels: 1_000_000,
  maxCommands: 4096,
});
// Feed real geometry directly to the existing native path painter, not an SVG string.
const nodes = shape.kind === "empty" ? [] : [{
  type: "path" as const,
  commands: shape.commands,
  paint: { fillRule: shape.fillRule },
}];
```

`readPngAlpha(resource, options?)` authenticates the **exact handle** in the one
private PNG image WeakMap before reading any public resource property. Genuine
JPEG/core resources, cloned handles and resource proxies cannot grant PNG storage
authority. The same owner serves `preparePng`, `pngProvider` and this inspector.
No metadata-kind guessing, second registry or duplicated image state is present.

The result is a frozen `{kind: "opaque", width, height}` (all alpha bytes are
implicitly 255), or frozen `{kind: "alpha", width, height, bytes}`. In the latter,
`bytes` is an independently owned **caller-mutable** `Uint8Array`; it is deliberately
not described as deeply frozen. Mutating it cannot change the PNG resource, the
next inspection, compressed store, PDF or resource byte certificate.

Options are `signal?: PngSignal` and `maxPixels?: number`. The alpha leaf also
exports the structural no-DOM `PngSignal`, `PngResource`, result/options types and
`alphaLimit` (16,000,000); the ordinary PNG root does not re-export the leaf.
Its import of the root resource type erases completely at runtime.

`preparePngShape(resource, options?)` returns a deeply frozen tagged result:

- `{kind: "empty", width, height, shapeImageThreshold}`; or
- `{kind: "contours", width, height, shapeImageThreshold, fillRule: "nonzero",
  commands: readonly PathCommand[]}`. Every command record and the array are frozen.

Options additionally include exact finite `shapeImageThreshold` in `[0, 1]`
(omitted default 0), and `maxCommands` (omitted default/ceiling 4096, matching the
existing normalized path command ceiling). `maxPixels` defaults to/has ceiling
16,000,000, shared with the native parser. Both budgets must be positive safe
integers; callers may lower, never raise them. Explicit `undefined`/`null` options
or fields, unknown fields, symbols, non-enumerable fields and accessors reject.
Descriptor checks precede getters and inflation. Structural signal validation uses
the existing PNG preparation owner, including native AbortSignal support.
Transparent object proxies cannot generally be detected portably: reflection
traps are not promised to be inert. Resource proxies still fail exact ownership.

Install/select PNG explicitly for the shape leaf. PNG is an optional same-version
peer of text-flow; default/manual-path users neither install nor load it. There is
no text-flow root value re-export, shape handler, factory, Source union addition,
URL resolution or authoring `shapeImageThreshold` field in this slice.
`Source.url` shape-outside remains unsupported. Placement/transforms, automatic
image-shape integration, cross-render geometry caching and cumulative shape-byte
quotas belong to later work, not this evidence.

## Exact arithmetic, representation and bounds

All touched numerical contracts are **exact** input domains, integer pixel-cell
coordinates, quotas, or the declared binary64 occupancy expression
`alpha / 255 > shapeImageThreshold`. There is no approximate-fit comparison to
change and no EPS allowance. A per-call 256-entry lookup evaluates that division
directly; multiplying the threshold by 255 is not equivalent at all boundaries.

The extractor scans each row left to right, computes runs incrementally, and
vertically merges only identical consecutive start/end runs. Each finalized
rectangle emits move / three lines / close, all integer pixel coordinates, with
consistent clockwise orientation in top-left/y-down coordinates. Rectangle
interiors are disjoint; their nonzero-fill union exactly preserves occupied cells,
holes and disconnected components. There is no gap filling, bounding-box fallback,
perimeter tracing, SVG string generation/reparse or lossy simplification. Geometry
can preserve a hole even though current outer-side layout projection cannot place
text inside it. Exact edge contact still follows existing conservative band policy,
not a new maximal-packing claim. Empty results do not relax authored-path validation.

Before retaining **each new run**, the extractor reserves its eventual five
commands against `floor(maxCommands / 5)`, including completed and active
rectangles. It never first allocates a whole row of runs or per-pixel boundary
edges. At the default limit, 819 rectangles/4095 commands succeed and the 820th
rejects. Opaque sources use one rectangle directly (unless threshold 1 is empty);
an opaque occupied source with `maxCommands < 5` rejects before command allocation.
The scan is at most `maxPixels`; active maps and output are command-budget bounded.

The inspector checks actual private validated dimensions and the lower pixel
budget **before** inflation. Only the already-prepared compressed alpha plane is
inflated through existing `streams.transcode(..., width * height,
"DecompressionStream", signal)`, with exact returned-length validation. It does
not parse/unfilter the source or decode palette/RGB again. This is an **additional
bounded alpha inflation**, not a one-decode-total claim: source eligibility,
browser normalization, native preparation and inspection are distinct layers.
No browser DOM, transport, optional codec framework or new inflater is imported.

Per call the returned plane is at most 16,000,000 bytes. Native codec buffering,
the existing collector's growth buffer and final copy are additional temporary
storage; the plane size is not a peak-memory measurement. The shape retains no
plane, sidecar or global cache: local references expire on function settlement,
with eventual JS garbage collection, not forced release. Repeated thresholds
re-inflate independently. Budgets are per call, not cumulative across callers.
Cancellation checks cover pre-inspection, native inflate, post-inflate, between
rows and before publication. A synchronous row scan cannot be forcibly preempted
by an event-loop abort; no stronger interruptibility is claimed.

## Risk-based tests and host evidence

New regression coverage includes native RGBA/gray-alpha/indexed tRNS/gray and RGB
keys/opaque inputs; ownership before metadata access; independently mutable planes;
exact resource/PDF invariance; malformed options and pre-inflate limits; wrong
stream lengths, stalled cancellation and lock cleanup; mixed ESM/CJS ownership;
all **512 3×3 binary masks**; all 256 alpha values at exact and adjacent
representable thresholds; random byte masks; holes/disconnected components;
within-row and cross-row native `prepareCommands` projection; exact command caps;
and an instrumented wide-row checkerboard that fails before retaining excess runs.
No production statistics API was added.

Browser tests normalize synthetic 16-bit RGBA and gray-alpha PNGs entirely
offline, then inspect/extract the actual native 8-bit owned resources, including
warm S6 cache handles. The optional user-authorized local reference
`PNG_SHAPE_REFERENCE=/tmp/opencode/text-flow-showcase-eevee.png` is not fetched or
redistributed. For its **512×512 / 262,144 alpha bytes**, thresholds **0 / 0.15 / 1**
produce **2505 / 2545 / 0 commands** with default limits, not raised limits.
Every pixel-center occupancy matches inspected native alpha. Cache snapshot,
exact handle identity, resource byte certificate and native PDF remain unchanged.
The existing S5c browser fidelity tests independently retain their native pixel/
alpha checks. Synthetic tests never skip when the optional reference is absent.

Final serial gates (logs under `artifacts/png-shape-s7a/`):

- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass; the latter
  includes the complete workspace build.
- `npm test`: **1822/1822 pass**, no skips (1806 inherited + 16 new).
- `npm run build:browser`, `npm run check:graphs`, `npm run check:licenses`: pass.
- `npm run test:consumer`: **15 isolated external tarball closures pass**, including
  default text-flow without PNG; `scripts/url-images-consumer.ts`: three pass;
  `scripts/image-cache-consumer.ts`: pass.
- New packed selected-PNG/shape closure: ESM/CJS owner identity and NodeNext/Bundler
  declarations without DOM or Node ambient types pass; no images/assets/JPEG/fonts.
- `npm run build:showcase`, `npm run test:showcase`: pass (**105/105**).
- `npm run test:browser`: **29/29 pass**, using offline preloads/local reference.
- Explicit `PNG_SHAPE_REFERENCE=... PNG_SHAPE_OUT=artifacts/png-shape-s7a
  node_modules/.bin/tsx --test --test-concurrency=1 tests/browser/png-shape.test.ts`:
  pass, including the reference command counts above.

Initial test-only import/count assertions and lint size diagnostics were corrected.
The first full suite found type-import inventory failures; the leaf now imports
the erased PNG type through `/alpha`, with exact importer restrictions. First packed
runs found a validation-bootstrap isolation issue, then the generic dual-entry
inventory trying an unselected optional PNG leaf; both were corrected. The dual
probe excludes that leaf only when PNG is absent, analogous to optional SVG/layout;
the dedicated selected closure positively exercises it. These failed logs remain
available; none are represented as passes or waived gates.

## Paired retained cost, not runtime performance

Fresh before/after receipts use the actual dirty working-tree baseline, identical
14 consumer input strings and ES2022 browser ESM flags, raw/minified/gzip level 9.
Drawing, text, prepared font, JPEG, ordinary layout, text-flow and manual path
outputs are byte-identical. Ordinary/float PNG and cached PNG each add **98 raw
bytes**, **0 minified bytes**, with min-gzip deltas **−8 / −14 / −6** respectively.
The direct PNG profile is **25009 / 13308 / 5140 → 25107 / 13305 / 5141** bytes.
These real module/constant costs are not claimed to be universally zero.

Fresh unshaken CJS root PNG: **65 modules / 147615 → 67 / 148083 bytes** (+468).
Text-flow root **230 / 667940**, path **233 / 675377**, images root **199 / 575877**,
and cache **70 / 167056** are unchanged. Positive browser/CJS graph controls show
the alpha and shape leaves do not retain PNG parser/decoder/normalization; ordinary
PNG does not retain the inspector; text-flow root/path do not retain PNG at all.

The new selected extractor has no prior counterpart (absolute baseline N/A).
A separate matched **real prepared PNG → native PDF** pipeline, with/without
extraction and actual path painting, is **91088 / 48340 / 16641 →
97971 / 52519 / 17692** bytes (raw/min/gzip). The 78-byte, four-pixel source has
**108 owned-resource bytes before/after**; extraction produces a temporary four-byte
plane and **10 emitted commands**. Its 1010-byte PDF and 905-byte no-extraction
control both pass qpdf. The red native path positive control is present only with
extraction; this is not a dead-metadata cost profile. No latency, speedup or peak
memory claim is made.

Full emitted payload, including every entry/format (JS / declarations / all dist):
PNG **49673 / 11338 / 93473 → 56613 / 14098 / 107809**;
text-flow **100414 / 30276 / 197930 → 112120 / 33778 / 221275** bytes.
Package-root consumers do not retain the whole emitted optional surface.

## Preservation and audit boundary

Before edits, a new **187 MiB** recoverable archive froze the complete target
working tree including inherited dirty/untracked source, historical receipts and
builds, excluding node_modules, the Git worktree pointer and its own fresh receipt
directory. `before-source.json` hashes 1768 files, including the just-added snapshot
helper, at `e7772364b22b30199542ae63d91615660c199354fb91d4ef85b555c1fdd203da`.
Removing that one newly added helper from the baseline inventory exactly reproduces
the supplied S6 source hash
`ba5a04d5b35c01afdeb8be4fd9d47c16d26adfd9e76dc39a247c85f86465301e`:
**1767 inherited files, 96 tracked dirty and 168 untracked files** (actual counts,
not the estimated 166 untracked in the assignment). `baseline-identity.json`
records the matching assertion. No HEAD-only baseline was substituted.

`summary.json` records source deltas, paired costs and package payloads. Its archive
comparison reports **zero modified historical JSON/log/script receipts**. New root
consumer/graph/showcase receipts are relocated by a validation-only loader to the
fresh directory; no production API or source import was changed for relocation.
Large temporary installs use the target-owned ignored directory, with an isolation
seal against resolving packages from ancestor node_modules; Chromium retains short
`/tmp` socket paths. Every check ran serially to completion. The earlier S6 lost-URL-
receipt provenance caveat remains historical and has not been reconstructed.

`original-preservation.json` confirms original worktree **1663 sources/status,
5288 history files, 80 dist files**, and PID **665048** serving port **5182** unchanged;
it makes zero live asset requests. No original source/build/server mutation occurred.
No core/layout/images/cache/normalizer or placement/admission policy changed in S7a.

Universal/project checklist: correctness and risk-based regressions pass; cohesive
production files below 400 lines, functions below 50, nesting at most three;
intent/invariant comments only; mandatory runtime ownership/limits/cancellation
remain enabled. **No approved exceptions**. No Changeset: this project does not use
Changesets. Ready for independent Auditor review of S7a only, not full S7 completion.
