# S6 — one optional bounded prepared-image cache

Issue: N/A. **Implemented; ready for independent audit, not independently verified.**
The adopted Architect contract caches successful image preparation, not successful
PDF transactions. This corrects the earlier terminal-outcome test interpretation;
it does not waive ownership validation, operation budgets or failure guards.

## Delivery boundary and baseline

Worktree `/home/sprawl/projects/updf/trees/image-preparation`, branch
`feature/image-preparation`, base/unchanged HEAD
`fbf2f78fd59635c6b965f2a707f35508dc1e4392`. All pre-existing dirty work is
caller-owned S2/S3/S5 baseline, including the untracked images package. No stage,
commit, push, PR, tracker mutation or delegation is authorized or performed.

Before any source edit, `node artifacts/image-cache-state.mjs before` froze every
tracked/nonignored untracked source, full dirty manifest/diff hash, tool/lock hashes,
and core/layout/assets/PNG/JPEG/images source and emitted inventories into
`artifacts/image-cache-before/source.json`. Aggregate SHA-256 exactly matched the
approved S5c2 source: `35492d6ba1050a2630036cc228bbcc780d5d78fbee052540d21522b08a91214f`.
`tsx artifacts/image-cache-before/costs.ts` measured the unchanged full ordinary,
prepared and URL PNG/JPEG profile strings/flags, not a historical HEAD reconstruction.
Historical receipt preservation has the disclosed exception below. Node 24.22.0/npm 11.19.1, TypeScript
5.9.3, Biome 2.4.13, tsx 4.23.15, esbuild 0.28.2.

Only images cache/load implementation, package export/README, cohesive image-cache
tests, consumer/proof/cost scripts, the exact internal-importer inventory additions
in `scripts/boundaries.ts`, and this evidence document are this slice's
delivery. No core/layout/assets/codec/browser-normalizer/text-flow/application
source, root manifests, lock, build infrastructure or dependency changes.
No Changeset: unpublished private packages, no Changesets workflow.

## Contract and ownership

The README's optional retention section documents the complete public API, exact
policy identities, stable-URL/authentication assumptions, bounds/accounting,
LRU/cancellation/generation/retained-order semantics and explicit limitations.
`/cache` is the only backend entry. `/load` imports a small lazy-owned port; root
prepared images stays unchanged. There is no global source cache, installed backend,
decoder/renderer, new provider protocol or public format callback.

One private `preparedJob` owns transport → actual source-byte bound → unique
signature → existing prepare for both cached/uncached requests. Its bound run
function captures only immutable configuration, normalized URI and exact allowance,
not a preparation context, occurrence, binding or first consumer signal. Diagnostics
remain job-relative; the existing stages own authored occurrence diagnostics.
The original loader receiver/functions are captured before binding; original ordered
owned handler identities, not kinds or bound wrappers, define policy equality.

Every occurrence still calls operation check and URL resolution before local/shared
lookup. Completed hits precede transport allowance checks. Jobs use independent
controllers and exact-allowance coalescing. Subscriber records detach on abort or
settlement; one job observer fans out and consumes late rejection. Last-release
abort does not free unsettled capacity. The backend retains only bounded live
records; key/policy removal prunes all identity indexing. Pending keys are released
before completed capacity accounting, without double charging. All touched domains
are exact identity/count/byte/order integers; there is no approximate geometry change.

`CacheBackend.finish` is the publication linearization owner: validate through
existing `imageSource`, `ownedResourceBytes` and exact source-byte allowance, then
retain before subscriber delivery. Publication requires live waiters, current
generation, a joinable/nonabandoned job and a nondisposed cache, subject to capacity
and retained start order. Cache values contain only intrinsic owned resource and
neutral source-byte metadata, never operation bindings/IDs/paths. The `ImageClaim.accept`
chain, subscriber acknowledgement and Session/request acknowledgement maps are gone.
Later append, layout, serialization or another URL failure cannot rewind preparation.
Every operation still independently admits resources and enforces retained quotas;
failed operations return no PDF. Eviction/disposal never invalidates returned handles.

## Risk-based evidence

New actual-render tests exercise real PNG/JPEG format handlers and AssetLoader with
local synthetic bytes: exact cold/warm PDFs and identity reuse, policy partitions,
per-occurrence resolve, denied-hit policy, prepared-source bypass, aliases, retained
limits/prebound zero remaining, LRU, exact key/resource accounting, oversized uncached
success, concurrency/independent cancellation, consumer and pending bounds, clear,
dispose, reversed completion, failed/uncached newer jobs and failed admission.
Supplementary backend tests cover forged resources/metadata, listener-attachment
reentrancy, saturation before listeners, exact serial exhaustion, duplicate-resource
charges and deterministic seeded lifecycle/count sequences with final settlement.
No test downloads an image or uses an ambient asset request.

The new real Chromium proof uses both an original synthetic 16-bit PNG and the
provided local `BROWSER_PNG_REFERENCE`. Two operations recreate `images()` while
sharing stable loader/handler/cache identities: one fetch/decode/encode, byte-identical
native PDFs and qpdf success. Portable PNG using the same cache still rejects the
16-bit input rather than borrowing browser-normalized output. The proof blocks all
ambient context requests. Existing S5 browser fidelity checks remain authoritative
for codec pixels/alpha, which this slice does not change.

## Validation and costs

Final serial commands: `npm run format:check`, `npm run lint`, `npm run typecheck`
(complete workspace build), and `npm test`: pass, **1,799/1,799**, no skips
(32 original S6 tests plus nine completion regressions over the approved 1,758 baseline).
`npm run build:browser`,
`npm run check:graphs`, `npm run build:showcase`: pass. `npm run test:showcase`:
**105/105 pass**. `npm run test:browser`: **28/28 pass**, including the new proof.
`npm run test:consumer` (15 root profiles),
`node_modules/.bin/tsx scripts/url-images-consumer.ts` (3 profiles),
`node_modules/.bin/tsx scripts/image-cache-consumer.ts` (ESM/CJS shared implementation,
NodeNext/Bundler types without DOM), and `npm run check:licenses`: pass.
Focused `node_modules/.bin/tsx --test packages/images/test/cache-*.test.ts packages/images/test/url-*.test.ts`
passed **61/61**, including the final session-timing and native-authority regressions.
Browser and graph checks also pass on the final implementation.

Initial full-suite source-boundary failures were fixed by the nine exact images
importer inventory additions, not a general optional-code exemption. Initial test
fixture/alias/timing assertions and type/format/function-length diagnostics were
corrected. One combined shell invocation exceeded its 120-second tool timeout
after build:showcase; no remaining matching test processes were found, and showcase
and browser checks subsequently ran to completion with a longer tool timeout.

The first relocated packed-root run failed its missing-package assertion because
Node could resolve packages from the ancestor worktree. Final packed consumers use
`artifacts/image-cache-consumer-isolation.cjs`, a runtime-only resolver hook rejecting
file resolutions outside the actual install, in addition to the supplied temp
preload. The original negative assertions remain unchanged; all final installed
runtime checks pass with this seal. `/tmp` quota inspection showed only about
37 MiB free in the 32 GiB user allocation, so large installs were not moved there.

Evidence-provenance caveat: invoking the existing URL consumer script once with
its default output replaced the ignored historical
`artifacts/url-images-runtime-after/consumers.json` receipt with this run's report.
The old receipt was not frozen separately and has not been reconstructed. No source
or original-worktree artifact was overwritten; the new run's command/result remains
in the S6 gate log. The initial original-preservation helper also rewrote its
existing `/tmp/opencode/png-s5c2-original-preservation.json` receipt with the same
protected counts/PID. This is disclosed rather than claiming every historical
receipt remained untouched.
First-candidate receipts remain in `artifacts/image-cache-after/`. Completion gate
receipts use `artifacts/image-cache-completed/*.log`; the ignored target-owned
runner records command, environment and exit code, serially. Large Node temporary
directories use the supplied S5c2 preload under target ignored artifacts. Chromium
uses short `/tmp` socket paths. Browser/showcase runs additionally use the supplied
offline preload, `TEXT_FLOW_SHOWCASE_PNG` and `BROWSER_PNG_REFERENCE` local assets;
offline npm alone is not claimed to block browser network traffic.

`scripts/image-cache-evidence.ts` compares the actual incremental manifest, checks
protected package source/emitted hash identity and unchanged lock, reports matched
existing consumer costs and explicit new two-operation cache consumer costs, fresh
CJS module inventories and npm pack payload. These are retained-size/logical work
measurements, not latency or peak-memory claims. Root/prepared and default `/load`
must not retain cache backend/subscriber code in shaken or unshaken graphs.

Matched browser ESM ES2022 retained costs (raw / minified / min-gzip, level 9):

| Existing profile | S5c2 → completed |
| --- | --- |
| ordinary PNG | 401,064 / 204,204 / 66,141 → unchanged |
| float PNG | 499,502 / 253,829 / 82,791 → unchanged |
| ordinary JPEG | 396,035 / 201,318 / 65,190 → unchanged |
| float JPEG | 494,497 / 250,941 / 81,795 → unchanged |
| URL PNG, cache omitted | 440,340 / 224,777 / 72,614 → 442,072 / 225,960 / 72,908 |
| URL JPEG, cache omitted | 438,129 / 224,048 / 72,604 → 439,861 / 225,231 / 72,922 |
| URL mixed, cache omitted | 532,523 / 272,207 / 88,387 → 534,255 / 273,390 / 88,720 |

The default URL extraction/optional-port glue costs +1,732 raw / +1,183 minified
over S5c2, reduced by 863 raw / 379 minified versus the first S6 candidate's
+2,595 / +1,562. This remains a real default-path cost, not a performance target met.
It does not retain the LRU/backend/subscriber implementation.
Prepared consumers remain byte-identical. PNG/native-PDF/images-PNG/normalization
profiles remain exactly 25,074/90,769/25,603/16,916 raw respectively, with unchanged
min/gzip. Core/layout/assets/PNG/JPEG source and every emitted file are hash-identical.

Explicit new cached two-operation PNG URL consumer: **449,895 raw / 230,504
minified / 74,484 min-gzip**, versus the current uncached URL PNG profile above
(+7,823 raw / +4,544 minified / +1,576 min-gzip). Its real 1,091-byte native PDFs
equal the uncached prepared control and each other; one fetch, five policy calls
(per-occurrence resolution plus the cold asset load policy). This is no latency claim.

Images full emitted payload: JS across formats **48,029 → 72,066**, declarations
**15,894 → 25,156**, all dist including maps **93,564 → 144,012** bytes. Fresh selected
cache/PNG installed closure: **3,280,613 bytes** (no JPEG/font implementation/text-flow).
Full npm pack details live in `summary.json`; the before images pack at the exact
approved baseline hash was 23,821 bytes, not a newly reconstructed HEAD pack.
Completed images pack is **34,091 bytes**, versus first candidate **34,630**.
Fresh unshaken CJS: images root **199 modules / 575,877 bytes** (unchanged), load
**222 / 653,542** (S5c2 identical-source reference was 220 / 651,060), explicit cache
**70 / 167,056**. Measurement subprocesses omit test preloads from module inventories.
Before CJS/pack reference figures are the authoritative S5c2
same-hash receipts, not misrepresented as freshly collected before this edit.

Final preservation receipt `artifacts/image-cache-completed/original-preservation.json`
confirms original worktree **1,663 sources/status, 5,288 history files, 80 dist files**
and preview PID **665048** unchanged on port **5182**. No original build, write,
restart or asset request was performed. Final source inventories identify 1,744
baseline files and 1,765 completed files, with 27 incremental changed/new paths;
all remain unstaged/untracked and HEAD is unchanged.

## Completion decision and provenance

The standalone `artifacts/image-cache-terminal-repro.ts` and original
`artifacts/image-cache-after/terminal-outcome-blocker.json` remain untouched historical
evidence of the earlier expected-zero misinterpretation, not current acceptance.
The adopted contract affirmatively expects **one entry / 176 accounted bytes** after
the real PNG followed by denied URL, with no returned PDF. The suite regression
`cache-publication.test.ts` asserts that result and the next render's policy recheck,
successful native PDF and zero additional fetches. A late layout failure likewise
retains successful preparation. Capture-invalid documents start no job; independent
existing entries survive. Failed admission by all subscribers now retains an eligible
source for a higher-budget caller; warm insufficient budgets still reject.

Authentic PNG backend regressions cover invalid exact source accounting and release
after upstream fulfillment before the settlement observer. Session cleanup during
delivery proves close after publication but before caller continuation rejects the
operation without removing the cache entry. Existing lifecycle tests retain pending
reservations until genuine settlement, including ignored abort/dispose, clear
generations, exact-allowance partitions and reverse completion. No core/layout hook,
PDF-outcome condition, budget refund or lifecycle bypass was added.
Explicit load/signature/codec failures leave no entry. Owned PNG-shaped metadata
can satisfy the existing image-domain validator, but cannot grant private PNG
storage authority: the real PNG provider still rejects it during actual rendering.

Before completion edits, `artifacts/image-cache-candidate/source.json` froze first
candidate source hash `8069330e101cd5e357a8febbc09a2d50736aba6fcdd911319a1d25de20d8ceb0`.
Fresh completion source/manifest, metrics, consumer receipts and gate logs live only
under `artifacts/image-cache-completed/`. Profile input SHA-256 remains exactly
`ed53c40649ad50c98579789a8827644d38f8c9e93b0f1b761251954cc32efff1`, matching the
first candidate. No source consumer logic changed to improve measurements.
The existing URL consumer already accepts `URL_IMAGES_OUT`; completion sets that
and `IMAGE_CACHE_OUT` to the fresh directory. The lost historical URL receipt has
not been reconstructed or fabricated; its recorded provenance degradation remains
disclosed above, without implying any original source hash changed.

Final reruns corrected formatter output and one new fixture byte expectation
(raw `logo` key plus owned bytes is 116, normalized fixture URL accounting is 176).
A new negative provider fixture also needed literal `kind` typing; the final
workspace typecheck and full suite pass after that correction.
A combined host-check command exceeded 240 seconds; no matching processes remained.
The longer serial showcase/browser/consumer reruns completed with the results above.

## Principles and handoff

### S6auditfix2 — fresh findings only

Parent-authorized correction, issue N/A; implemented for independent re-audit,
not verified. Base/HEAD and worktree above remain unchanged. Fresh before source
hash is `c2662c811f86978a59b34bbf36592677be4cf8b5a4e6d6bf8202f1c54cda7cc7`.
Only five source paths differ from that inherited completed baseline: this file,
images README, `src/load.ts`, `test/cache-errors.test.ts` and
`test/cache-options.test.ts`. They are all Git-untracked within the inherited
untracked package/evidence; no tracked baseline changes, staging or commits were
added. The full S6 incremental manifest now has 29 paths versus S5c2 (formerly 27).

`load.ts` freezes the exact captured authored `src` path in each request and maps
errors only around that occurrence's session resolution. Known `AssetError`s
retain code (including LOAD) and message in a new instance; known `DocumentError`s
retain every diagnostic's code/message/span and the error message, with independent
diagnostic records and copied frozen spans. Relative `/source` and image-load owner
prefixes rebase while trailing parser coordinates survive; already-absolute
document owner paths remain absolute. Unexpected custom errors propagate unchanged,
without duck-typed message/property inspection. This intentionally also improves
uncached URL provenance. No job, subscriber, backend, codec, admission, budget,
publication or acknowledgement behavior changed. Private helper functions stay in
the existing load owner, avoiding a new core-facade dependency in unshaken loads.

**Options contract correction, not a safety waiver:** portable structural own-data
validation accepts transparent proxy options that report Object/null prototypes
and valid required own enumerable numeric data descriptors. Reflection traps can
run or throw, including native TypeError from revoked proxies. This explicitly
supersedes blanket proxy-options rejection/no-traps acceptance criteria; it does
not relax strict WeakMap identity authentication of cache handles. Accessors,
symbols, unknown fields, inherited required limits and invalid values still reject.
Existing `cache.ts` already snapshots numeric values once, so it is unchanged.
The proxy regression observes exactly six descriptor traps at construction, then
mutates all target bounds and proves original entry/byte/consumer bounds with no
later reflection or getter invocation. Forged class prototypes also reject.

Seven new tests cover two actual documents at different depths sharing one invalid
PNG decode, independent diagnostic mutations, zero failed-source publication and
a fresh valid retry; LOAD/custom-error conventions; multi-diagnostic parser spans
and absolute owner paths; uncached signature and VALUE/LIMIT policy failures; and
first-consumer cancellation followed by an active consumer's own sourced failure.
The existing all-failed-PDF-admission regression still retains one successful
preparation, while malformed codec input retains zero entries. No generic failure
wrapper or success-path request/acknowledgement map was introduced.

Fresh final serial gates, logged under `artifacts/image-cache-audit-fixed/`:

- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass.
- `node_modules/.bin/tsx --test packages/images/test/cache-*.test.ts packages/images/test/url-*.test.ts`:
  **68/68**, no skips; `npm test`: **1,806/1,806**, no skips.
- `npm run build:browser`, `npm run check:graphs`, `npm run build:showcase`: pass.
- `npm run test:showcase`: **105/105**; `npm run test:browser`: **28/28**.
- `npm run test:consumer`, `node_modules/.bin/tsx scripts/url-images-consumer.ts`,
  `node_modules/.bin/tsx scripts/image-cache-consumer.ts`, `npm run check:licenses`: pass.

The fresh runner retains the documented offline/browser/local-PNG and installed
consumer isolation settings, target ignored TMPDIR for large artifacts and short
Chromium socket paths. All checks settled; no check process was left running.
Initial iterations exposed stale prebuild test output, a nonexistent test-only PATH
code (corrected to PATH_SYNTAX), and helper import inventory failures. These were
fixed without changing source-edge inventories. Final logs are final rerun results,
not claims that those earlier attempts passed.

Fresh paired unchanged-profile costs (raw / min / min-gzip):

| Profile | Completed before → audit-fixed after | Delta |
| --- | --- | --- |
| ordinary PNG | 401,064 / 204,204 / 66,141 → unchanged | 0 / 0 / 0 |
| float PNG | 499,502 / 253,829 / 82,791 → unchanged | 0 / 0 / 0 |
| ordinary JPEG | 396,035 / 201,318 / 65,190 → unchanged | 0 / 0 / 0 |
| float JPEG | 494,497 / 250,941 / 81,795 → unchanged | 0 / 0 / 0 |
| URL PNG, no cache | 442,072 / 225,960 / 72,908 → 443,203 / 226,523 / 73,286 | +1,131 / +563 / +378 |
| URL JPEG, no cache | 439,861 / 225,231 / 72,922 → 440,992 / 225,794 / 73,218 | +1,131 / +563 / +296 |
| URL mixed, no cache | 534,255 / 273,390 / 88,720 → 535,386 / 273,953 / 89,154 | +1,131 / +563 / +434 |

Prepared PNG/native-PDF/images-PNG/normalization raw/min/gzip are unchanged.
Fresh explicit cached consumer is **451,026 / 231,067 / 74,839**; versus fresh
uncached PNG this is +7,823 / +4,544 / +1,553. Relative to the previously recorded
completed cached consumer (not a fresh pre-edit cached measurement), the increase
is +1,131 / +563 / +355. Exact native PDFs remain **1,091 bytes**, one fetch and
five policy calls, identical cold/warm/control. No latency or peak-heap claim.
All-format emitted images JS is **72,066 → 74,933**, declarations remain **25,156**,
full dist **144,012 → 148,172**; full pack **34,091 → 35,209** bytes. These payload
totals are not the default consumer cost. Fresh unshaken CJS root remains
199 modules / 575,877 bytes; load 222 / 654,993 (+1,451 bytes, no extra modules);
cache remains 70 / 167,056. Ordinary prepared code retains no cache implementation.

`node artifacts/image-cache-audit-state.mjs before|after` and each generated
`costs.ts` capture fresh same-input profiles. `IMAGE_CACHE_OUT=artifacts/image-cache-audit-fixed/after
node_modules/.bin/tsx scripts/image-cache-evidence.ts` checks full S6 ownership,
protected packages and costs; `node artifacts/image-cache-audit-fixed/compare.mjs`
checks the five-path audit-only allowlist and protected source/emitted hashes.
Inventories are 1,765 before / 1,767 after; all core/layout/assets/PNG/JPEG source
and emitted hashes are unchanged. Before/after original preservation checks retain
1,663 sources/status, 5,288 history files, 80 dist files and PID 665048 unchanged.
No original build/server operation or live asset request occurred. All new receipts
are confined to the fresh audit-fixed directory; historical terminal repro and
the previously disclosed overwritten-receipt caveat remain untouched.

Principles checklist: correctness and proportional regression coverage pass;
cohesive files ≤400 lines, functions ≤49 and nesting ≤3 pass lint; comments explain
invariants; format/lint/types/tests pass. No approved principle exception. The
parent-approved proxy contract correction is explicit, not an exception to cache
identity or numeric safety. No Changeset for the existing unpublished workflow.
Auditor should review the five-path audit delta plus inherited S6 manifest, error
identity/path isolation and structural-options snapshots against these receipts.

No principle exception is approved. All files/functions/nesting pass repository
checks (≤400/≤49/≤3), with comments for invariants/tradeoffs and proportional boundary,
cancellation, lifecycle, real host and packed/type tests. Auditor should inspect
the incremental manifest rather than treating all inherited dirty files as S6.
No alpha extraction, S7 feature, showcase cache installation, app migration or
HTTP/authentication freshness mechanism is implemented.
