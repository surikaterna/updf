# @updf/images — prepared and explicitly loaded Images

The root `images()` accepts **zero arguments** and remains prepared-only. Image
measurement never performs I/O. URL declarations require the separately selected
`@updf/images/load` installation and `renderAsync` from `@updf/layout/async`.
The existing showcase has not been migrated to this API.

```tsx
import { Image, images } from '@updf/images';
import { preparePng, pngProvider } from '@updf/png';
import { Document, Flow } from '@updf/layout';
import { render } from '@updf/layout/render';

const prepared = await preparePng(bytes);
const pdf = render(
  <Document>
    <Flow pageSize={{ width: 400, height: 500 }} margins={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      <Image src={prepared} style={{ width: 120, height: 80 }} />
    </Flow>
  </Document>,
  { resources: { logo: prepared }, providers: [pngProvider()], extensions: [images()] },
);
```

For JPEG, import `prepareJpeg` and `jpegProvider` from `@updf/jpeg`; no PNG
dependency is required. The root imports neither codec, transport, async session
nor text-flow. An image-only document needs no font/text service.

Image accepts an owned prepared PNG/JPEG resource or a URL declaration, and explicit, finite, positive
point `style.width` and `style.height`. No intrinsic autosizing, DPI/EXIF sizing,
cover fitting or authored children are supported. `fit` is `"contain"` by default;
`"fill"` stretches to the resolved content rectangle. Present `undefined` or `null`
is not omission. Common Block min/max constraints, padding, border, background and
overflow styles retain the canonical Block owner. Automatic margins are rejected.
Numerically unrepresentable positive placements fail rather than emit zero-sized
or nonfinite native images.

Bind the exact handle in `resources` and select its actual provider explicitly.
Aliases deterministically use the first binding in existing iteration order.
Reusing a handle in different boxes/pages uses the same native resource identity;
separately prepared handles remain distinct even when their bytes match. Metadata
compatibility does not authenticate a codec's private storage: the existing native
provider remains responsible for that check.

For floating, import `floatable` and `textFlow` from `@updf/text-flow`, define
`const FloatingImage = floatable(Image)`, and install
`extensions: [images(), textFlow()]`. The wrapper preserves Image props and adds
`style.float: "left" | "right"` and optional `style.shapeOutside`. Following rich
Paragraph/Span content still needs the normal explicitly configured text service,
font resources and font provider. Ordinary Image rejects floating-only fields.

Default exclusion is the **outer Block rectangle**, including padding, borders
and contain letterboxing—not the painted image or its alpha. Manual
`Source.path(...)`/`Source.polygon(...)` exclusion uses the existing explicitly
installed `textFlow({ handlers: [pathShapes()] })` route from
`@updf/text-flow/path`; bounded string syntax additionally needs `shapeSyntax()`.
Image adds no geometry parser or image-alpha policy.

## Explicit URL loading

Install `@updf/images` plus `@updf/assets` and only the selected `@updf/png` and/or
`@updf/jpeg` packages. Transport and codecs are exact-version optional peers: the
prepared-only root does not automatically install either codec.

```tsx
import { Image } from '@updf/images';
import { images, createAssetLoader } from '@updf/images/load';
import { pngImages } from '@updf/images/png';
import { renderAsync } from '@updf/layout/async';

const loader = createAssetLoader({ fetch, baseURI: 'https://example.test/assets/' });
const options = { extensions: [images({ loader, formatHandlers: [pngImages()] })] };
// content is an ordinary Document/Flow tree; no async VDOM component is needed.
const pdf = await renderAsync(content, options, { signal: controller.signal });
// Inside content: <Image src="logo.png" style={{ width: 120, height: 80 }} />
```

`jpegImages()` is selected from `@updf/images/jpeg`; import only the formats needed.
`/load` itself imports no codec. There is no ambient fetch/default loader. Strings
and strict own-data `{ kind: 'url', src: 'logo.png' }` declarations are supported;
the latter is structurally compatible with `Source.url(...)` without importing
text-flow. URL-looking strings are not resource IDs. Byte signatures, not suffixes
or MIME types, select the configured codec. PNG retains its existing supported
profile; JPEG validation retains its compressed bytes and does not decode pixels.

Root and loading installations share one Image/feature identity: installing both
is an error, not two installation models. `/load` selects each handler's provider
even for a document containing only prepared handles; those handles still require
explicit caller resource bindings. Do not additionally install independently
created providers for the same codec: competing claims correctly fail in core.
Root `images()` continues to require explicit caller providers.

Each preparation captures the graph before awaiting, resolves occurrences
sequentially, checks URI policy even on cache hits, and shares one prepared handle
for normalized aliases within that operation. Different widths/fit do not split
the cache; different URLs remain different resources even if bytes match. Reusing
an installation for a new render creates a fresh local cache/session by default. Browser HTTP caches
are independent of this per-preparation behavior.

Transport has cumulative byte limits separate from owned retained-resource bytes.
Requests tighten the asset loader's configured limit using both remaining budgets;
zero remaining allowance fails before transport. Decoders retain their existing
source/pixel maxima; a decoded result exceeding the retained budget is rejected
before operation admission. Trusted custom transports must honor cancellation; they are
capabilities, not sandboxed plugins. The asset owner cancels/releases readers.

Async layout consumes the same captured operation, then core serializes its fixed
document with final resources/providers. No PDF is returned on preparation/layout
failure. URLs hidden in opaque adapters or final page/header callbacks fail with
a sourced phase diagnostic and never start late loading; prepared handles remain
valid there. Earlier user callback side effects are **not** rolled back.
`shapeOutside: Source.url(...)` remains unsupported independently: this feature
does not extract alpha shapes, add alpha source caches, change shaping or geometry,
introduce intrinsic sizing, or add future PNG conversion profiles.
# Optional browser-rendered 16-bit PNG

Select this **instead of** `pngImages()`, not alongside it:

```ts
import { images, createAssetLoader } from "@updf/images/load";
import { browserPngImages } from "@updf/images/browser-png";
import { renderAsync } from "@updf/layout/async";

const loader = createAssetLoader({ allowUri: (uri) => uri.startsWith("https://assets.example/") });
const pdf = await renderAsync(doc, {
  extensions: [images({ loader, formatHandlers: [browserPngImages()] })],
}, { signal });
```

`browserPngImages()` takes zero arguments. It owns the existing PNG format kind
and native PNG provider. Duplicate PNG kinds reject before transport. No generic
preprocessor, fallback callback, transport option or alternate painting backend
is introduced. Root, `/load`, `/png` and `/jpeg` do not load this optional code.
Importing the leaf and constructing its handler are safe without browser globals.
Eight-bit input always uses ordinary native PNG preparation, even in Node;
unsupported eight-bit gamma/chromaticity profiles are **not** normalized.

Only 16-bit input selects full strict `@updf/png/normalization` validation, then
browser decoding of that exact copied snapshot with its metadata intact. Eligible
profiles are non-interlaced grayscale/RGB/GA/RGBA, legal tRNS, and the conservative
gAMA/cHRM/sRGB profile documented by `@updf/png`. ICC, APNG, interlace and other
unsupported metadata remain rejected before browser allocation. Browser APIs are
used only during asynchronous preparation, never layout/paint/module evaluation.

Conversion requires `Blob`, `createImageBitmap` and either PNG-encoding
`OffscreenCanvas` or a DOM canvas. Alpha-enabled, sRGB canvas output retains
original dimensions and is checked again by ordinary `preparePng` before it can
become a native PNG resource. No resizing, white background or alpha flattening
is applied. This promises browser-rendered **lossy eight-bit color**, not source
sample/metadata/byte preservation, engine-independent color or host identity.
Unsupported hosts fail with sourced `PNG_PLATFORM`; invalid input retains native
PNG diagnostics. Source URLs are not included in browser failure messages.

Existing 8 MiB source, pixel and two-byte scanline limits remain mandatory. The
encoded Blob must be nonempty PNG and fit the same 8 MiB source limit **before**
reading its buffer. Validation inflates original scanlines, the host decodes and
encodes, then native preparation inflates the normalized output: these are three
decompression-related stages, not one total decode. No custom decoder is added.

Abort promptly abandons native promises, releases known bitmap/canvas handles,
and closes late decoded bitmaps. Hosts cannot forcibly preempt native CPU work;
unsettled host work and transient browser Blob/bitmap/canvas allocations are not
bounded by retained `resourceBytes`. Pixel/scanline/output limits bound the logical
operation; this is not a sandbox or a strict peak-memory guarantee. Platform
capabilities are trusted. Per-operation URL reuse and owned-resource/PDF aliases
remain controlled by the existing loader session and PNG provider.

## Optional bounded cross-render retention

This opt-in cache retains successful **image preparation**, not successful PDF
transactions. Without it, cross-render retention is disabled.

```ts
import { createImageCache } from '@updf/images/cache';
import { images, createAssetLoader } from '@updf/images/load';
import { pngImages } from '@updf/images/png';
import { renderAsync } from '@updf/layout/async';

// Keep these capabilities stable outside rendering, including when recreating images().
const loader = createAssetLoader({ baseURI: 'https://assets.example/' });
const handler = pngImages();
const cache = createImageCache({ maxEntries: 32, maxBytes: 16 * 1024 * 1024, maxConsumers: 8 });
const options = () => ({ extensions: [images({ loader, formatHandlers: [handler], cache })] });
const first = await renderAsync(content, options());
const second = await renderAsync(content, options());
cache.clear(); // Existing resource handles remain valid.
cache.dispose(); // Idempotent; new acquisitions fail PHASE.
```

All three bounds are required positive safe integers, with strict enumerable
own-data fields only and a reported Object/null prototype. Options use portable
structural validation: transparent proxies may pass, reflection traps may run
or throw (including native TypeError for revoked proxies), and this is not a
sandbox. Accessor descriptors, symbols, unknown fields and inherited required
limits reject. Numeric descriptor values are captured once; later option changes
cannot alter bounds. This supersedes any blanket promise to reject proxy options
or avoid their traps. `ImageCache` is an owned identity, not an implementable
structural interface: copies, wrappers and proxies do not authenticate it. Methods
are detached-call safe. Root `images()` is unchanged and takes no cache options.
`/load` only retains a tiny private ownership port, not the backend or subscribers;
import `/cache` explicitly to select them. No dependencies are added.

The policy key is the original loader object, captured original resolve/load
functions and **ordered original handler identities**, plus normalized URL.
Recreated configurations with those same capabilities hit. New handlers (even
the same format kind), changed methods or different loaders miss. Portable and
browser PNG handlers never borrow each other's results. Every authored occurrence
still checks its operation and calls `loader.resolve`, even on local/shared hits.
Providers and bindings are installed/admitted separately for every operation.
Known `DocumentError` diagnostics (including all diagnostics and copied spans)
and `AssetError` code/message are cloned per occurrence at the captured authored
`src` path; job-relative source suffixes are retained, and absolute document paths
are not prefixed again. Shared failures never carry a first caller's path or a
shared mutable diagnostic object. Unexpected custom errors propagate unchanged.
This also intentionally gives uncached URL failures authored source paths.

This is not HTTP freshness, a security sandbox or an authentication-state detector.
URL contents must remain stable until clear/dispose/eviction. Changes in hidden
loader authentication or callback state require a new policy identity or `clear()`.
There is no TTL, URL invalidation API, global URL cache or custom policy callback.

`snapshot()` returns a frozen `{ entries, pending, consumers, accountedBytes,
disposed }`, with no URLs, credentials or resources. `entries` counts completed
retained values; `pending` counts all unsettled jobs, including invalidated and
abort-requested jobs. Their sum never exceeds `maxEntries`. `consumers` counts
pending subscriber records and is bounded by `maxConsumers`. `accountedBytes`
charges two bytes per normalized URL UTF-16 unit for every pending/completed record,
plus each completed resource's actual `ownedResourceBytes`. Duplicate identities
under separate keys are conservatively charged per entry. This is logical retained
accounting, not JS/native peak memory or network statistics. Lookup is bounded
linear comparison, O(maxEntries × selected handlers), without policy-history maps.

Slots/key bytes are reserved before work. Only fulfilled least-recently-used
entries can be evicted; hits update recency, snapshots do not. An oversized key or
saturated pending/consumer bound fails LIMIT before extra work. A successful image
too large to retain is returned uncached, not rejected for cache capacity. Cache
publication validates the owned image and exact source allowance, then occurs before
subscriber delivery while at least one live claim remains. Later resource admission,
layout or URL failure returns no PDF but does not rewind successful preparation.
Even when every caller's retained budget rejects the resource, a later caller with
sufficient budget may reuse it. Newer-started retained results win over older jobs;
failed/uncached newer results do not establish freshness or poison older results.

Shared pending jobs coalesce only for the **same exact transport allowance**.
Every successful joining operation logically charges the validated source bytes
once; completed hits charge zero transport bytes and still undergo core retained
admission. The identical prebound resource can therefore hit with zero remaining
retained allowance; another handle cannot bypass that allowance.

Each pending job owns an independent AbortController. Cancelling one claim releases
only that consumer. The last release requests job abort and disables future joins,
but keeps its pending slot/key reservation until the underlying job promise settles,
even if custom transport ignores abort. Session close also releases unsettled claims
without a caller signal. One settlement observer fans out removable subscriber
records; cancelled operation closures are not attached to never-settled job promises.
Host CPU/native promises remain non-preemptible as documented for browser PNG.

`clear()` drops fulfilled values and invalidates old jobs for retention/future joins
without cancelling their existing consumers or resetting unsettled bounds. `dispose()`
also cancels consumers, requests abort and rejects future acquisitions with PHASE;
construction of an images configuration may still capture that owned cache. Pending
snapshots stay truthful until settlement. Already acquired/local-session resources
and prepared handles remain valid after eviction, clear or dispose.
