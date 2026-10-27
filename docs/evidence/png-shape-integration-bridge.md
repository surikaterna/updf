# S7b-1 internal PNG-shape integration bridge

Issue: N/A. **Implemented; awaiting independent audit, not verified.**
Both remaining internal parts are implemented: the canonical occurrence transaction
and actual Image reference metadata. Synthetic metadata tests do not constitute a
public PNG-alpha shape handler. Extraction-handler integration and public
`Source.url` behavior remain the next slice, prohibited until this bridge is audited.

## Worktree, baselines and ownership

- Cwd: `/home/sprawl/projects/updf/trees/image-preparation`.
- Branch: `feature/image-preparation`.
- Base/HEAD: `fbf2f78fd59635c6b965f2a707f35508dc1e4392`, unchanged.
- Original S7a: 1,786 sources, hash
  `cdc34cc4fd4ac9ca49125b44f24c587a5588370d666cfde1678add83ae60e235`.
  `artifacts/alpha-integration-before/source.json` and `full-working-tree.tar.gz`
  preserve the actual dirty S7a tree, historical artifacts and builds, not HEAD only.
- Service-foundation checkpoint, frozen **before this continuation's edits**:
  1,793 sources, hash
  `aac549ef89a21066281e79d85e080993710b23fe1e0f931cbc65c7f05e6d35c0`.
  Receipt: `artifacts/alpha-integration-complete/foundation-source.json`.
- Final source inventory and exact source hash: `final-source.json` in that same
  evidence directory. `summary-final.json` identifies every modification/addition
  against the frozen foundation; `delivery.json` records actual Git scope/counts.
  Unchanged foundation paths remain byte-identical. There are no deletions.

The continuation owns layout capture/transaction/reference plumbing, Image's
private placement publication and slot declaration, targeted tests/cost/consumer
proofs, and this receipt. The only boundary-inventory edit adds the generic
reference helper to the existing exact `core/internal` importer list. Inherited
S7a and foundation work outside that listed scope is preserved. No core source,
PNG alpha helper, geometry algorithm, Image placement arithmetic, text selection,
Paginator/native admission, or public entry API was changed by this continuation.

No stage, commit, discard, push, PR, tracker mutation or delegation occurred.
All implementation and build commands ran in the target. No source/build/server
command ran in the original read-only worktree.

## Canonical same-occurrence transaction

`preparation-resource` selects the finite disjoint slots `visual-resource` and
`participation-data`. Explicit slot claims authenticate their definition owners.
Markers associate with the existing owned visual preparation owner, when present,
and separately with their explicit participation owner. Plain Block participation
does not acquire a fake visual owner. Legacy whole-leaf extension replacement stays
exclusive; it cannot compose with metadata replacement.

The normalizer's existing recipe callback captures one owned canonical source.
Raw props and the complete canonical props/data/body graph are snapshotted before
the first async boundary. Both definition owners receive that same readonly source;
only the participation slot receives captured data/body. Slot conflicts reject
before jobs. Queue order is source occurrence first, then visual before metadata,
independent of extension-list order. Late detection does not request a forbidden
capture-phase snapshot after sealing.

Each resolved slot binds its exact capture, definition-owned slot, operation,
resource identity and retained ID. Copied/foreign captures, wrong-slot calls,
wrong resources (including another PNG), wrong IDs, replay and inactive captures
reject. Finalization validates every result before consuming any token and requires
all bound slots. It installs the combined source once and calls `controls.replace`
once for that normalized node. It never invokes the old one-shot visual consumer
twice. Visual replacement changes the owned visual child; metadata replacement
snapshots only the owning definition's data. Unrelated props/style/body, semantic
identity, authored keys, source paths and captured child/provider scopes survive.

Every slot's resource enters the existing suspended `stage.append` owner before
replacement/metadata processing. Existing aliases win, repeated exact resources
retain their first ID, and cumulative resource-byte limits charge distinct owners
once. Retaining a mask does not paint or embed it. A second-slot failure or abort
closes the operation without returning a prepared document or PDF. Successfully
prepared resources may independently remain in the existing S6 cache.

## Existing shared image service, retained unchanged in substance

The approved foundation remains one real `/load` image session. All selected
sessions start before resolution; duplicate services conflict before startup.
`resolveImageResource` uses authenticated preparation-context lookup with existing
phase/lifetime checks. `PreparationContext.retain` remains the suspended stage's
append capability, not another resource writer or mutable binding setter.

Both source fields enter the session resolver, so URL policy precedes local/cache
hits. Same-URI visual/metadata requests yield two field-policy resolutions and one
actual fetch/prepared resource; different URIs yield distinct accounted owners.
Providers, selected formats, malformed-decode error cloning, cancellation and S6
cache publication remain owned by the established session. Root `images()` alone
does not acquire URL service authority. Foundation-only evidence remains under
`artifacts/alpha-integration-s7b1/`; its former 1832-test result is historical, not
the final bridge validation reported below.

## Request-local actual Image reference

Image publishes the **same frozen rectangle object** returned by its existing
`imagePlacement` invocation and spread into its native xObject. No fit calculation
is repeated. A private WeakMap report attaches to the exact measured result and
authenticates operation, source object, active lifetime and exact effective width
and metric content-height constraints. The measured cache forwards the report onto
its immutable copy; `checkedMeasured` forwards it onto the prepared result while
checking that request identity. A foreign measured object cannot lend its report
to another source, width or height request.

Only a direct visual-child report can lift into its canonical enclosing Block.
`container-placement` owns the shared child-to-border-box offset arithmetic used
both by existing native placement and by that direct association. The canonical
Block report is forwarded through actual-size content measurement and Image's outer
adapter without descendant discovery. An ordinary enclosing Block does not inherit
its descendant Image's report. `ParticipationContext.reference(source, prepared)`
authenticates the exact prepared/source association and active lifetime, returning
the Image rectangle where available and an immutable border box for generic Blocks.
It is usable after preparation and before text selection without invoking another
measurement, selector or painter. Copied/foreign prepared reports reject.

Metric content height remains separate from the greatest certified native capacity.
There is no painter/native-node search, paint-graph reconstruction, global current
frame, producer registry, new admission mechanism, or text-flow placement arithmetic.
Numerical classifications: width/height request identity and lifecycle checks remain
exact; the Image rectangle retains its existing exact native certificate; lifting
uses existing derived coordinate sums and changes no fit comparison or tolerance.

## Risk-based tests

Fifteen new unit/integration tests plus one new offline browser test cover:

- Real Image/PNG visual plus synthetic metadata, both extension orders, shared and
  distinct URIs, prepared visual plus URL metadata, and metadata-only plain Block.
- Actual `floatable(Image)` and `floatable(Block)` on both sides, retaining native
  document/placement parity; no alpha handler or substitute rectangle visual.
- Exactly-once canonical capture; preserved unrelated nested data/style, raw keys,
  source paths and shared child components under different provider scopes.
- Duplicate/unknown owners and slots before I/O; incorrect resources/IDs, wrong
  slot, copied/foreign/cross-occurrence/cross-operation results, incomplete and
  duplicate finalizers, replay and post-close authority.
- Second-slot failure/abort, quota admission before metadata continuation, first
  resource aliases and accounting, and retained-but-unpainted mask PDF behavior.
- Non-square PNG contain/fill; asymmetric and fractional padding/borders; min/max
  width/height; report equality with an independent test-only native-transform walk.
- Repeated measurements, exact width/height changes, foreign source reports,
  no extra measure/selection/paint calls, and expired accessors.

Existing S4/PNG/URL/cache, ordinary Path/Image/Block, malformed-selected-descendant
preparation-before-paint, numerical and source-work-budget regressions pass too.

## Serial validation and reproducible harness

All new logs/receipts are under `artifacts/alpha-integration-complete/`.
Large Node temp directories use target-local storage, not the exhausted `/tmp`
quota. For consumer/root-test commands the environment is:

```sh
TMPDIR="$PWD/artifacts/ab/tmp"
NODE_OPTIONS="--require=$PWD/artifacts/alpha-integration-complete/temp.cjs --import=$PWD/artifacts/alpha-integration-complete/consumer-preload.mjs"
```

The consumer preload loads receipt relocation before the supplied isolation rule's
equivalent resolver guard. It prevents relocated isolated consumers from borrowing
this ancestor worktree's optional packages. Fresh graph/showcase/browser receipts
are relocated by `receipt-paths.mjs`; historical consumer receipts are not reused.

For browser/showcase commands use the same TMPDIR and:

```sh
NODE_OPTIONS="--require=$PWD/artifacts/alpha-integration-complete/temp.cjs --require=$PWD/artifacts/alpha-integration-complete/browser-sockets.cjs --require=/tmp/opencode/png-s5c2-offline.cjs --import=$PWD/artifacts/alpha-integration-complete/receipt-paths.mjs"
BROWSER_PNG_REFERENCE=/tmp/opencode/text-flow-showcase-eevee.png
PNG_SHAPE_REFERENCE=/tmp/opencode/text-flow-showcase-eevee.png
TEXT_FLOW_SHOWCASE_PNG=/tmp/opencode/text-flow-showcase-eevee.png
PNG_SHAPE_OUT="$PWD/artifacts/alpha-integration-complete/browser-shape-2"
```

Chromium's explicit profile stays target-local; only its singleton socket uses the
short `/tmp/opencode` path. The offline guard blocks ambient external network.
The local reference is neither fetched nor redistributed. Select a fresh
`PNG_SHAPE_OUT` on reruns because shape receipts intentionally use exclusive create.
Root gates never ran concurrently with package builds.

| Exact command | Final result / log |
| --- | --- |
| `npm run format:check` | pass; `format-final.log` |
| `npm run lint` | pass, including AST code-principles; `lint-final-2.log` |
| `npm run typecheck` | pass, complete workspace build; `typecheck-6.log` |
| `node_modules/.bin/tsx --test packages/layout/test/preparation*.test.ts packages/layout/test/visual-preparation.test.ts packages/layout/test/visual-reference.test.ts packages/images/test/*.test.ts` | 159/159, no skips; `focused-final-2.log` |
| `npm test` | 1847/1847, no skips; `npm-test-final.log` |
| `npm run build:browser` | pass; `build-browser.log` |
| `npm run check:graphs` | pass; `graphs.log` and fresh `module-graphs.json` |
| `npm run check:licenses` | pass; `licenses.log` |
| `npm run test:consumer` | 15 isolated external tarball closures pass; `consumer-3.log` |
| `node_modules/.bin/tsx scripts/prepared-images-consumer.ts` | three closures pass; `prepared-consumer.log` |
| `URL_IMAGES_OUT=$PWD/artifacts/alpha-integration-complete node_modules/.bin/tsx scripts/url-images-consumer.ts` | three closures pass; `url-consumer.log`, `consumers.json` |
| `IMAGE_CACHE_OUT=$PWD/artifacts/alpha-integration-complete node_modules/.bin/tsx scripts/image-cache-consumer.ts` | pass; `cache-consumer.log`, `consumer.json` |
| `node_modules/.bin/tsx scripts/png-shape-bridge-consumer.ts artifacts/alpha-integration-complete/bridge-consumer.json` | private bridge runtime identity and NodeNext/Bundler declarations/negative tests without DOM/Node ambient types pass; `bridge-consumer.log` |
| `npm run build:showcase` | pass; `build-showcase.log` |
| `npm run test:showcase` | 105/105, no skips; `showcase-2.log` |
| `npm run test:browser` | 30/30, no skips; `browser-2.log`, including active bridge and local-reference PNG/cache/shape regressions |

Initial failures are retained, not waived: exact-optional-property and test fixture
typing errors; a too-long tsx socket; derived-source/late-snapshot compatibility
regressions; the exact importer inventory omission (first full run 1842/1845);
consumer ancestor-resolution and preload-order problems; Chromium socket length;
the new page-evaluation closure's tsx helper; incomplete SVG output relocation and
an omitted local showcase reference variable. All were corrected before the final
passes. The initial misleading progress pass report was explicitly corrected after
reading logs; only the inspected final evidence above is authoritative.

## Paired retained costs, not runtime performance

Commands (new exclusive-create receipt paths):

```sh
node_modules/.bin/tsx scripts/png-shape-costs.ts artifacts/alpha-integration-complete/costs.json
node_modules/.bin/tsx scripts/png-shape-bridge-costs.ts artifacts/alpha-integration-complete/bridge-costs.json artifacts/alpha-integration-complete/costs.json
```

The identical 14 S7a input strings, ES2022 browser ESM options and gzip level 9
are paired against **both** original S7a and the frozen service foundation.
Full raw/minified/gzip rows and input graphs are in `bridge-costs.json` and
`summary-final.json`. Selected minified-byte / min-gzip-byte deltas:

| Profile | Versus S7a | Versus foundation |
| --- | ---: | ---: |
| Drawing / ordinary text / prepared font / JPEG / direct PNG / manual path | 0 / 0 each | 0 / 0 each |
| Ordinary authored render | +1554 / +507 | +1554 / +507 |
| Default text-flow | +1554 / +546 | +1554 / +546 |
| Ordinary layout | +1554 / +530 | +1554 / +530 |
| Ordinary PNG Image | +2045 / +668 | +2045 / +668 |
| Floating PNG Image | +2168 / +682 | +2168 / +682 |
| Ordinary JPEG Image | +2045 / +660 | +2045 / +660 |
| Floating JPEG Image | +2168 / +688 | +2168 / +688 |
| Cached URL PNG | +6003 / +1665 | +4855 / +1492 |

The generic metadata/request/reference plumbing has a real default-graph cost.
Unshaken CJS text-flow root/path each add **2 modules / 6563 source bytes** versus
either baseline; images root adds **1 module / 5121 bytes**. PNG remains
**67 modules / 148083 bytes** and cache **70 / 167056**, unchanged. Input-graph
comparison asserts no images/PNG/assets implementation newly enters the ordinary
drawing/text/layout/default-text-flow/manual-path profiles. Existing entry/graph
negative controls pass. No blanket zero-overhead claim is made.

The new active bridge has no earlier functional equivalent: absolute closure
**455815 raw / 232522 minified / 74697 min-gzip bytes**. Its runtime proof uses
two actual native PNG resources, returns `{x:5.625,y:0,width:20,height:20}`, and
serializes a **971-byte PDF**. The metadata PNG is accounted but not painted.
The same input is exercised in a packed consumer and offline Chromium, so its
report/retention code is not dead metadata eliminated by the bundler. This absolute
optional closure is not described as a like-for-like pre-feature active cost delta.
No latency, peak-memory, or speedup claim is made.

## Preservation and code-principles self-check

`node artifacts/alpha-integration-complete/preserve.mjs artifacts/alpha-integration-complete/original-preserved-final.json`
checks the original worktree's **1663 sources, 5288 history files, 80 served
distribution files**, exact dirty status, both recorded live tailnet URL hashes
at port **5182**, and running PID **665048**. An earlier identical collector result
is retained in `original-preserved.json`. No original files/builds/server changed.

Checklist: correctness and runtime ownership/lifecycle/quota checks preserved;
cohesive files at most 400 lines; functions under 50 lines; nesting at most three;
comments explain intent/invariants; proportional boundary/adversarial tests added;
format, lint, typecheck, tests and affected host/consumer gates pass. **No approved
principle exceptions.** No Changeset: this repository does not use Changesets.

Next owner: Auditor reviews the entire delivered dirty tree (inherited S7a plus
unaudited foundation and this continuation), authentic slot binding/finalization,
canonical scope preservation, exact placement/cache forwarding, resource/PDF
accounting and the positive/negative graph/cost evidence. Public alpha-handler
integration is intentionally not implemented and must await independent audit.
