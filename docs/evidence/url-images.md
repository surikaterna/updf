# S5b.2: public URL Image preparation

The original delivery receipt below is historical. The **F1 audit correction** at
the end supersedes its final source count, validation and cost totals.

Implementation delivery in `/home/sprawl/projects/updf/trees/image-preparation`,
branch `feature/image-preparation`, base/HEAD
`fbf2f78fd59635c6b965f2a707f35508dc1e4392`. Issue N/A. Engineer is integration
owner. This delivery is **implemented, pending independent audit**, not verified.
All work remains unstaged/untracked; no commits, delivery/tracker mutations or
delegation were authorized or performed. The much larger inherited S2/S3/S5a/
S5b.1/visual-bridge dirty tree is the baseline, not newly implemented work.

## Exact baseline and ownership

Fresh pre-production source/status receipt:
`artifacts/url-images-runtime-before/source.json`, **1,694 paths**, serialized
receipt SHA-256 `3f13a203eb331d9f25704eb12fc144504075ab6659974066bd182f75904f938e`.
Every baseline file has a content-addressed copy under the existing
`artifacts/url-images-before/source-hashes/` store. The before shared report was
freshly built before production edits; it includes tool/lock hashes, dirty status,
all 312 ordinary metrics and full per-package distribution/tarball inventories.
Node `v24.22.0`, npm `11.19.1`, TypeScript `5.9.3`, esbuild `0.28.2`.

`artifacts/url-images-runtime-after/source.json` and `preservation.json` define the
delivery against that exact dirty snapshot. The allowlisted changes cover Images,
the optional layout async/preparation SPI, existing provider capture/retained-byte
owners, packaging/boundary/consumer/evidence support and proportional tests/docs.
The syntax validator extraction in layout `sizing.ts` reuses the existing owner;
it does not change geometry arithmetic, fit comparisons or native certificates.
The final manifest contains **1,717 source paths**: **43 owned changed paths**
(20 baseline modifications, 23 additions); all other inherited bytes are preserved.
The original read-only worktree's 1,663 source paths/status, 5,288 historical files,
80 distribution files and PID 665048 are checked independently. No original live
application, server, install, build or HTTP request is used by this implementation.

## Public installation and execution

- `@updf/images`: the same owned `Image`; `images()` is strictly zero-argument,
  prepared-only. Explicit caller resources/providers remain necessary.
- `@updf/images/load`: required `images({loader, formatHandlers})` configuration;
  exact-owner re-export of `createAssetLoader` from `@updf/assets`. This entry
  imports no PNG/JPEG implementation.
- `@updf/images/png`: owned `pngImages()`; only PNG's codec/provider.
- `@updf/images/jpeg`: owned `jpegImages()`; only JPEG's codec/provider.
- `@updf/layout/async`: `renderAsync(content, options?, {signal}?)` returns
  `Promise<Uint8Array<ArrayBuffer>>`. It awaits `prepareDocument`, consumes
  `layoutPrepared` on the **same operation/state**, then invokes existing core
  rendering with the resolved resources/providers. It never relayouts the authored
  graph or awaits inside measurement/pagination. The shared private serialization
  adapter omits only lowering `registry`/`resourceMetadata`, preserving descriptors
  and existing strict option validation; no extra public helper export was added.

Root/load use one shared visual definition, component/adapters, capability and
feature identity. Installing both fails with the existing duplicate-feature error.
Preparation attaches to a copied owned Extensions contribution containing the
same adapter identities, not a second public installation or mutable global
configuration slot. Different loading factories have independent contributions.

Strings and strict own-data `{kind:'url',src:string}` declarations are supported,
including structural compatibility with `Source.url`; Images does not import
text-flow. Null, arrays, coercion, wrong kind, extras, inherited/accessor fields
reject without reading getters. Source/style/fit snapshots and invalid syntax
fail before transport. Sync measurement and async rendering without a loading
installation report PHASE for URLs, never fetch or stringify an unknown object.

## Operation-local session, limits and failure

The private optional descriptor session starts exactly once per prepare operation,
after complete capture and suspension; standalone descriptors without sessions
keep their existing behavior. The coordinator guarantees cleanup in `finally`,
including capture failures. No session starts on an early capture failure. Session
contexts check suspended phase and cancellation before remaining-budget/provider
operations. Descriptor callbacks are captured, not reread after suspension.

The sequential session captures loader functions with their original receiver and
selected opaque format identities immutably. Handler copies/lookalikes, empty or
duplicate-kind selections and incomplete configuration reject before I/O. The
codec-free registry is only a WeakMap of owned format capabilities, not URL state.
The session resolves/policy-checks **each occurrence before cache lookup**; its
operation-local `Map<string,Promise<OwnedResource>>` deduplicates normalized URLs,
not authored object identity, width or fit. Different URLs do not collapse merely
because bytes match. Caches clear on success/failure/cancellation; a new render
using the same extension fetches/prepares again. This is not a browser HTTP-cache
claim or a persistent caller URL cache.

PNG uses the exact eight-byte signature and actual async `preparePng` with signal;
JPEG uses its prefix and existing synchronous `prepareJpeg` wrapped in the same
async dispatch. No selected/unique signature rejects before codec dispatch. MIME
and URL suffix are irrelevant. JPEG does not decode entropy/pixels. Existing codec
source/pixel limits and PNG supported profile, including 16-bit rejection, remain.

Unique transport bytes are charged cumulatively **before decoding**, separately
from retained-resource bytes. Each asset request uses the minimum of remaining
transport and retained allowances; zero fails before fetch, and the asset owner
also tightens by its configured `maxBytes`. No zero limit is passed to Assets.
Core appends using exact owned resource identity and `ownedResourceBytes`, not
guessed metadata/definition storage. This includes PNG source and prepared planes.
Codec allocation can precede discovery that the owned result exceeds remaining
retained bytes; append then rejects before publication. Existing codec allocation
ceilings are not bypassed. Repeated aliases do not double-charge unique transport
or owned retained identities.

Resource IDs follow existing first-occurrence allocation, skipping caller and
reserved metadata IDs and reusing the first alias of an exactly prebound handle.
Provider append reuses `ownProviders` validation, deduplicates **exact provider
identity before binding**, and never collapses independent providers by format
name. PNG+JPEG providers coexist. `/load` selects its providers even with no URL
occurrences; prepared handles there still require caller bindings. Independently
adding another provider claiming the same prepared handle correctly yields the
existing structured RESOURCE conflict, rather than silently overriding a claim.

Abort is checked before transport, after transport and after decode. Existing
native/structural signal validation is reused; the third preparation options
argument is not merged into layout options or silently dropped. Assets owns
reader cancellation/release; PNG owns compression/decompression cancellation.
Late success/rejection from a custom transport after cancellation is consumed and
cannot append bindings or return a PDF. Trusted custom transports must honor
cancellation; this API does not sandbox their callbacks or roll back user side
effects. Providers/serializer collection cannot run before preparation completes.

## Composition and intentional limits

The verified generic occurrence-bound visual replacement bridge is reused, with
the original semantic identity, outer key/path, Block/Float styles, exclusion and
provider/Body/Column scopes. Dynamic components run once per occurrence, even for
reused VNodes under different providers. Prepared-only captures opt out of resource
replacement; they retain their normal resource-binding owner and late-layout route.
Late URLs in opaque adapters or final header/page callbacks fail as sourced PHASE
requests without transport or a returned PDF. Earlier user callback/measurement
effects are not transactionally rolled back.

Not implemented: URL `shapeOutside` resolution/extraction, alpha geometry, source
caches, new shaping/measurement/geometry algorithms, intrinsic sizing/cover/DPI
semantics, PNG conversion profiles (S5c), or S6/S7. `shapeOutside:Source.url(...)`
remains independently unsupported; it is not implicitly treated as `Image.src`.
The existing showcase authoring/live app is unchanged.

## Validation and evidence

Commands run from the exact target using the append-only logging wrapper
`VISUAL_PROOF_OUT=artifacts/url-images-runtime-after node_modules/.bin/tsx scripts/visual-preparation-receipts.ts run ...`:

| Command | Outcome |
| --- | --- |
| `npm install --ignore-scripts` | Pass; target workspace links verified |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including 400/49/3 structural gates |
| `npm run typecheck` | Pass; ordered full package/application builds |
| `npm test` | Pass; 1,718 tests |
| `npm run build:browser` | Pass |
| `npm run check:graphs` | Pass |
| `npm run build:showcase` | Pass; target only |
| `npm run test:showcase` | Pass; 105 tests |
| `npm run test:browser` | Pass; 26 tests including actual mixed URL proof |
| `npm run test:consumer` | Pass; existing 15 packed closures |
| `node_modules/.bin/tsx scripts/url-images-consumer.ts` | Pass; three selected installed closures, NodeNext/Bundler and import/require identity |
| `npm run check:licenses` | Pass; 16 actual library tarballs |
| `node_modules/.bin/tsx scripts/text-flow-costs.ts --out artifacts/url-images-runtime-after/shared --compare artifacts/url-images-runtime-before/shared/report.json` | Pass; 312 paired ordinary metrics, 16 full library inventories |
| `node_modules/.bin/tsx scripts/url-images-evidence.ts` | Pass; matched prepared/fake inputs plus new absolute profiles and unshaken CJS/installed footprints |
| `PREPARED_IMAGES_OUT=artifacts/url-images-runtime-after node_modules/.bin/tsx scripts/prepared-images-clean-build.ts` | Pass; isolated source-only copy, zero initial dist, fresh npm ci, ordered type/build/browser/graph and browser/showcase suites |
| `node_modules/.bin/tsx scripts/url-images-preservation.ts` | Pass; exact 43-path scope, original source/history/dist/PID and empty staging areas |

Browser/showcase suites use `TEXT_FLOW_SHOWCASE_PNG=/tmp/opencode/text-flow-showcase-eevee.png`
for offline fixture replay, not a live CDN asset. The new URL browser proof injects
bundles inline, blocks every network route and ambient fetch, and uses synthetic
Response streams through the real AssetLoader/codecs/providers. Native Node and
Chrome PDFs each match their prepared control bytes, pass `qpdf --check`, and
match normalized `pdftoppm` pixels across hosts. Receipts are `native-proof.json`,
`native-{node,chrome}.pdf/.ppm` and qpdf logs in the after directory.

Proportional source tests cover actual PNG/JPEG output, aliases and policy on cache
hits, fresh rerenders, distinct identities, own syntax/configuration/signal options,
byte/source exhaustion, invalid/16-bit profiles, cancellation/release and ignored
late completion, component/scope/Body/Column/float parity, late opaque/header
requests, prepared-only async parity, mutation snapshots and competing providers.
Existing metric-capacity and numerical image regressions run in the full suite.
Initial build/type/fixture/function-size failures and the timed-out showcase
attempt are retained, not waived; corrected serial reruns are the passing evidence.

## Cost interpretation and principles

The shared reports contain all raw/minified/gzip metrics and complete per-package
JS, declarations, maps, tarball and unpacked inventories. The historical shared
report's `newRuntimePackages` field describes an older text-flow experiment, not
this change. New Images runtime packages: **none**; new selected optional peer
installation paths: Assets and only explicitly selected PNG/JPEG. This distinction
matters: package payload is not installed dependency footprint.

`summary.json` pairs all four existing prepared Image inputs and the corrected
native fake proof using identical full input strings against the frozen fresh-
before tarballs, not HEAD. The fake input is the corrected actual Form-binding
fixture, not the historical rectangle-only input. Source hashes/metafiles accompany
every bundle; changed fixture inputs are not represented as runtime growth.
URL PNG/JPEG/mixed and prepared-async profiles are **absolute new-entry costs**,
not baseline deltas. Importing a selected PNG leaf excludes JPEG and vice versa,
including unshaken CommonJS execution. Root Images and ordinary core/layout/
text-flow imports retain neither transport/codecs nor async driver/session.

Generic provider-export and syntax-owner extraction have real default-package
micro-costs. They are reported rather than called zero overhead; no geometry
algorithm was moved into another package to disguise its cost. Optional peers
were chosen because clean installed consumers prove they work without missing
root declaration types or automatically installing unselected codecs.

Selected final paired costs (bytes; all other rows remain in `costs.json` and
`shared/report.json`):

| Consumer | Raw before → after | Min before → after | Min gzip before → after |
| --- | ---: | ---: | ---: |
| Layout/browser | 371,997 → 372,159 | 187,989 → 188,071 | 60,917 → 60,927 |
| Layout/Node | 681,053 → 681,581 | 324,477 → 324,720 | 98,473 → 98,556 |
| Authored render/browser | 369,793 → 370,051 | 187,801 → 187,910 | 60,349 → 60,373 |
| Authored render/Node | 677,330 → 678,330 | 321,206 → 321,616 | 97,393 → 97,477 |
| Prepared ordinary PNG/browser | 398,689 → 400,293 | 203,011 → 203,866 | 65,772 → 66,025 |
| Prepared ordinary PNG/Node | 688,437 → 692,575 | 330,248 → 332,382 | 100,479 → 101,087 |

Drawing/browser is byte-identical; Node drawing retains +19 minified bytes/+13
gzip, and Node ordinary text +19/+14. Unshaken CJS default layout loads 605,175 →
605,749 bytes; prepared root Images 572,229 → 575,676 bytes, still with no
transport, codec or async driver loaded. Full before/after bundles use matching
`packages/*` paths/working-directory roots, so raw comment/path differences from
temporary tarball extraction are not misrepresented as runtime savings.

The Images **tarball** grows 8,077 → 17,142 bytes (unpacked 29,257 → 72,978),
including all optional leaves/declarations/maps and README. That is not the root
retained runtime: the ordinary PNG browser consumer attributes **2,865 minified
bytes** to Images itself (before 2,119); Node attributes **4,833** (before 3,251).
The full prepared consumer sizes above include core/layout and the selected codec.
Images emitted browser JS is 5,429 → 14,136 bytes, CommonJS JS 6,201 → 16,764,
and declarations 2,335 → 5,767 in each implementation format. All-library packed
payload is 765,977 → 778,585 bytes; unpacked 4,230,782 → 4,298,116. Actual clean
installed root closure is 3,029,766 bytes, separately inventoried from package and
retained output; selected URL closures add Assets and only their chosen codec.

The new mixed URL/native-control proof costs 531,752 raw / 271,869 min /
88,272 min-gzip bytes in browser and 832,685 / 400,377 / 122,592 in Node.
These include the prepared control and floating text-flow proof, so are absolute
fixture costs, not a claim of a minimal URL consumer or a paired runtime delta.

Code-principles self-check: correctness/capability boundaries validated; cohesive
production files <=400 lines, functions <50, nesting <=3; intent/invariant comments;
risk-based regressions; required lint/type/tests/builds pass. **No approved
exceptions.** Numerical classification: moved style scalar/domain validation is
exact; no approximate relation or exact native certificate changed. Packages are
private and the repo does not use Changesets. Auditor should independently verify
the exact dirty-baseline manifest, session lifetime/cleanup and budgets, provider
identity capture, occurrence replacement/scopes, native proof, selected installed
closures, default graphs, cost interpretation and original-worktree preservation.

## F1 audit correction: ownership before URL discrimination

Bounded objective: prevent inherited `kind`/`src` from reclassifying an authentic
prepared Image as a URL. Issue N/A; same exact worktree, branch and base/HEAD as
above. Engineer owns these six audit-fix paths only:

- `packages/images/src/source.ts`
- `packages/images/test/own-source.test.ts`
- `scripts/url-images-consumer.ts`
- `scripts/url-images-evidence.ts`
- `scripts/url-images-preservation.ts`
- `docs/evidence/url-images.md`

The production change returns no URL immediately for authenticated owned resources,
before any source discriminator. Non-resource strings retain their unchanged URL
route. Captured URL records read only own data through the existing `ownDataValue`
helper; the existing URL scalar validator checks the own `src`. Capture remains
the declaration-validation owner, including required own `kind` and `src`, strict
keys and accessor rejection. No parallel validation engine, resource unwrapping,
prototype freezing, metadata rewrite or transport/provider behavior was added.
The other helper callers (load capture/session and root measurement) share this
fix. Prepared metadata already has its own validated fields. Core, layout,
codecs, provider/transport logic and pure Source builders are unchanged.

### Regression and gate evidence

`artifacts/url-images-fixed/before/source.json` seals **1,717 paths**, receipt hash
`9e7c628a134078c4035ef93a8e9f6a42c17183f2d016a6c36873fd2f9bf56f5f`.
Its fresh build/inventory reproduced the pre-fix URL report exactly: all 312
ordinary metrics had zero deltas. The new test then failed against that build
with the prepared-only root PHASE error. Initial harness restoration/assertion
failures and a subsequently corrected unnecessary TypeScript cast are not passes.
The append-only focused-test log retains failures and successful reruns.

Three new tests cover prepared sync/root async/load async byte parity; inherited
URL data, individual/both getters; configuration created before/after sabotage;
missing own declaration fields (including own `kind:'url'` with inherited `src`);
missing Image `src`; own getters, null/symbol/unknown kind; cloned/proxied handles;
and unchanged string/plain mutable/legacy frozen `Source.url` behavior. Prepared
cases assert **resolve/load/fetch/policy = 0** and getters = 0. Invalid cases reject
with structured source-path diagnostics before transport, not PHASE. Mutable
caller URL records can change after capture without changing the selected source.
The prototype patch runs in an isolated Node test-file process with sequential
cases and exact descriptor restoration in `finally`; it changes only `kind/src`.

Final checks use the existing append-only wrapper, from this target:
`VISUAL_PROOF_OUT=artifacts/url-images-fixed node_modules/.bin/tsx scripts/visual-preparation-receipts.ts run <command>`.
`checks.json` records log hashes, all recorded outcomes and actual filesystem UTC
completion timestamps for the final passing gates; it is not an invented start-time
receipt. Commands and outcomes:

| Command | Final outcome |
| --- | --- |
| `node_modules/.bin/tsx --test packages/images/test/own-source.test.ts` | Pass, 3 tests |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including 400/49/3 gates |
| `npm run typecheck` | Pass, ordered full build and root types |
| `npm test` | Pass, 1,721 tests |
| `npm run build:browser` | Pass |
| `npm run check:graphs` | Pass |
| `npm run build:showcase` | Pass |
| `npm run test:showcase` | Pass, 105 tests |
| `npm run test:browser` | Pass, 26 tests |
| `npm run test:consumer` | Pass, 15 packed closures |
| `node_modules/.bin/tsx scripts/url-images-consumer.ts` | Pass, 3 packed closures |
| `npm run check:licenses` | Pass, 16 library tarballs |

Host suites use `TEXT_FLOW_SHOWCASE_PNG=/tmp/opencode/text-flow-showcase-eevee.png`.
No actual CDN/live-original asset was requested. One combined shell command timed
out at 200 seconds during showcase tests; no matching test processes remained.
Standalone showcase and browser reruns passed with a larger timeout. No SVG timing
failure is waived. Builds and suites run serially, not concurrently.

### Paired cost and preservation receipts

Fresh evidence is under `artifacts/url-images-fixed/`; old source/cost reports
remain historical, not overwritten by evidence collectors. Collector output/baseline
paths are configurable, and reconstructed baseline bundles go into the **new**
output's `baseline/` rather than the historical baseline directory.

- `shared/report.json` compares the final build to the original URL-before report;
  `summary.json`/`costs.json` retain the matched prepared inputs and new-entry costs.
- `fix-only/shared/report.json` compares to `before/shared/report.json`, the exact
  pre-fix delivery. `fix-only/summary.json` and `costs.json` contain matched full
  inputs, source hashes, metafiles, unshaken CJS and complete installed inventories.
- Both shared reports have 312 metrics and 16 full package inventories. Commands:
  `node_modules/.bin/tsx scripts/text-flow-costs.ts --out artifacts/url-images-fixed/shared --compare artifacts/url-images-runtime-before/shared/report.json`
  and the same command with `--out artifacts/url-images-fixed/fix-only/shared --compare artifacts/url-images-fixed/before/shared/report.json`.
- Run `scripts/url-images-evidence.ts` with `URL_IMAGES_OUT=artifacts/url-images-fixed`
  for the original comparison; for fix-only use
  `URL_IMAGES_BEFORE=artifacts/url-images-fixed/before`,
  `URL_IMAGES_OUT=artifacts/url-images-fixed/fix-only`, and
  `URL_IMAGES_CONSUMERS=artifacts/url-images-fixed/consumers.json`.

Fix-only ordinary prepared PNG/browser is **400,293 → 400,420 raw**,
**203,866 → 203,932 minified**, **66,025 → 66,046 min-gzip**; Node is
**692,575 → 692,759**, **332,382 → 332,505**, **101,087 → 101,098**.
Root Images unshaken CJS is **575,676 → 575,877** bytes, not zero growth.
Images browser emitted JS is **14,136 → 14,288**, CJS **16,764 → 16,965**;
declarations remain 5,767 per implementation format. Images pack/unpacked is
**17,142 → 17,204 / 72,978 → 73,445**. All-library pack/unpacked totals are
**778,585 → 778,647 / 4,298,116 → 4,298,583**; emitted browser/CJS JS totals are
**921,070 → 921,222 / 1,063,149 → 1,063,350**. Ordinary default core/layout/
text-flow costs are unchanged by F1. Root installed closure is 3,030,233 bytes;
selected PNG/JPEG closures are 3,164,059 / 3,144,284 bytes, not retained-runtime sizes.

Final `source.json` seals **1,718 source paths**; `preservation.json` compares them
against the 1,717-path pre-fix receipt and enforces the exact six-path allowlist.
It independently checks the original worktree's 1,663 source/status entries,
5,288 history files, 80 dist files, PID 665048, workspace links and empty staging
areas. Run sealing with `VISUAL_PROOF_OUT=artifacts/url-images-fixed`, then
`URL_IMAGES_BEFORE=artifacts/url-images-fixed/before URL_IMAGES_OUT=artifacts/url-images-fixed node_modules/.bin/tsx scripts/url-images-preservation.ts`.
Production source SHA-256: `f7b930c9b5c50a7a0cb16109b8f334da400996b38e2341ed9dc4110c49477168`;
new test SHA-256: `8662d32480b96783262f4131a368916359cea590bebe978944cda943780abebe`.

Self-check: all universal/project checklist items satisfied; cohesive files,
400/49/3 limits, intent-only comments, proportional ownership/prototype regressions,
passing gates. No approved exceptions. No numerical contracts changed. Private
packages; no Changesets. All six paths remain untracked within inherited untracked
directories/files; no staging, commits, push/PR, tracker changes or delegation.
**F1 implemented, pending independent re-audit**, not verified. Auditor should
check the actual six-path receipt, source ownership precedence, own-field paths,
zero prepared transport callbacks, prototype restoration, costs and preservation.
S5c, URL shape/alpha extraction and metadata-URI/SVG APIs remain unimplemented.
