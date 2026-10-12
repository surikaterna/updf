# @updf/assets (private/unreleased)

Codec-free byte/HTTP(S) transport shared by optional resource loaders. Zero runtime
dependencies: no PDF engine, fonts, image codecs, framework, Node imports or ambient
DOM types. It does not decode or register resources. `@updf/fontkit/load` is one
adapter; the separately developed image loader uses the same boundary.

```ts
import { createAssetLoader } from '@updf/assets';

const loader = createAssetLoader({
  fetch: globalThis.fetch,
  baseURI: 'https://assets.example.com/',
  allowUri: uri => new URL(uri).origin === 'https://assets.example.com',
  maxBytes: 4 * 1024 * 1024,
  timeoutMs: 10000,
});
const bytes = await loader.load('font.ttf', { signal });
const ownedCopy = await loader.load(new Uint8Array([1, 2, 3])); // no I/O
```

The root exports `createAssetLoader`, `AssetError`, and structural public types
`AssetLoader`, `AssetLoaderOptions`, `AssetLoadOptions`, `AssetFetch`, `AssetFetchInit`,
`AssetReader`, `AssetResponse`, `AssetSignal`, and `AssetErrorCode`. `/bytes` exports
only `copyBytes` and `AssetError`, so synchronous consumers need not import fetching.

## Contract

- A loader captures and freezes supported own-data options. Fetch is explicit;
  there is no ambient network fallback. Accessor/unknown/undefined options reject.
- `resolve(uri)` normalizes and policy-checks without fetching. URI strings are
  HTTP(S) only, without embedded credentials. Relative URIs need `baseURI`, or use
  the browser location when available. No file/data/blob scheme or implicit FS I/O.
- `load(source, { signal?, maxBytes? })` always returns a Promise of privately copied
  `Uint8Array<ArrayBuffer>` bytes. Genuine attached non-shared Uint8Array views,
  including Node Buffer/cross-realm views, are accepted. Numeric arrays, ArrayBuffer,
  proxies, shared and detached views are not accepted implicitly.
- Default limits are 8 MiB and 10 seconds for a URI, with at most 65,536 stream
  reads. Per-call `maxBytes` may tighten, never raise, the configured limit.
  Positive safe integers are required; timeouts must fit the platform timer range.
- Content-Length is checked conservatively; received bytes are independently
  bounded. A growing buffer avoids retaining arbitrary numbers of chunk objects.
  Readers are cancelled on failed reads/limits; transport signals are aborted and
  listeners/timers released on completion, error or cancellation.
- Requests specify `credentials: 'omit'` and `redirect: 'error'`. Custom transports
  are trusted capabilities and must honor cancellation/policy themselves. Browser
  CORS applies. Server callers must use trusted URIs or an allowlist plus transport
  network/DNS/egress policy. A URI string check is not an SSRF or CPU sandbox.
- There is no permanent global cache. Resource adapters/applications own their
  preparation/cache lifecycle; each `load` creates a fresh request scope.
- `AssetError` has `code: TYPE | VALUE | LIMIT | LOAD` and `path`. Format adapters
  translate these to their domain diagnostics without making transport depend on
  codecs or core. Transport messages do not include potentially secret URI values.

No publication is authorized. The extraction retains the image-loader design's
limits, cancellation, own-data policy and intrinsic byte copying while removing
image-specific dependencies and diagnostics.
