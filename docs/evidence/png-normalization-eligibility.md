# S5c.1 — strict 16-bit PNG normalization eligibility

Implementation ready for independent audit; not independently verified. Issue ID:
N/A (S5c.1 is the assigned slice label). No tracker, staging, commit, push or PR
mutation was authorized or performed.

## Scope and ownership

- Worktree: `/home/sprawl/projects/updf/trees/image-preparation`.
- Branch: `feature/image-preparation`; base and unchanged HEAD:
  `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- Integration/implementation owner: Engineer for this slice. All inherited dirty
  files remain caller-owned and are not part of this delivery.
- Production changes: PNG private parser policy and shared scanline owner;
  separate `@updf/png/normalization` export; PNG README. New synthetic PNG tests,
  isolated consumer/type/graph tests and this evidence document complete scope.
- Intentionally absent: browser handler, `@updf/images/browser-png`, showcase
  migration, conversion/encoding, dependencies, core/image-codec changes outside
  PNG, input/header routing helper, native 16-bit resources, and network loader.
- `packages/images`, root manifests/configs/lockfile, all non-PNG package sources
  and existing tests/scripts retain their exact assignment-start bytes. The
  original `trees/text-flow-design` worktree, history, dist and PID 665048/tailnet
  service were not targets of commands, writes or process control.

## Contract and implementation

`preparePngNormalization(source, { signal? })` is exported only from
`@updf/png/normalization` in the standard browser/Node ESM/CommonJS packaging.
It copies genuine non-shared Uint8Array input before suspension and validates the
entire copied source with the existing chunk framing/CRC/order owner. A statically
selected private policy permits only 16-bit grayscale/RGB/GA/RGBA, standard
compression/filter methods and no interlace. There is no catch-and-fallback path.

The default parser policy still rejects 16 bits at IHDR, before later chunks.
Native decode remains typed to `ParsedPng<1>` (one byte per sample). Public
`PreparePngOptions`, `PngMetadata`, resource ownership and PDF 8-bit emission are
unchanged. Root declaration/facade files are hash-identical to baseline.

The shared parser retains legal PLTE/tRNS, required indexed palette, consecutive
IDAT, terminal IEND, sRGB placement, duplicate declarations and the existing
ignored text/time/density metadata behavior. Normalization accepts full-range
two-byte grayscale/RGB tRNS samples, including 65535; native eight-bit tRNS still
rejects nonzero high bytes. Indexed 16-bit input is always unsupported. ICC, gamma,
chromaticities, EXIF, APNG and unknown chunks still reject.

The factored scanline owner computes `width * channels * sampleBytes + 1` and
reuses bounded native zlib inflation, exact output length and row-filter checks.
Every 16-bit row filter is checked, without pixel unfiltering, color/alpha planes
or encoding. All two-byte sample values are in domain. Source 8 MiB, 4096 chunks,
16,000,000 pixels, 64 MiB scanlines, stream read/output limits and cleanup remain
mandatory. These are exact integer/byte domains, not approximate geometry; no
epsilon or coordinate changes apply. No quota is increased.

The returned frozen record contains caller-owned mutable `bytes` and frozen source
metadata, not a resource, immutable byte certificate or rendering budget charge.
The README and declaration explicitly distinguish readonly properties from mutable
typed-array elements. A future handler must validate privately, consume this exact
snapshot rather than reread the caller source after awaiting, and publish only
converted output that passes ordinary `preparePng`. No external result can certify
bytes that its caller has subsequently mutated.

## Optional cached reference: ineligible

Only local profile inspection was intended for
`/tmp/opencode/text-flow-showcase-eevee.png`: 113,021 bytes, SHA-256
`7a201582d435201a92a092bd3aef7150029da0bc9b2e86d89e692ab9278b474a`.
It is 512×512, depth 16, color 6, compression/filter/interlace 0.
The complete chunk sequence is IHDR(13), **gAMA(4)**, **cHRM(32)**,
IDAT(112904), IEND(0), all CRCs correct. Calling the built eligibility entry on
that local copy rejects `PNG_PROFILE: Unsupported PNG chunk gAMA` at `/source`.
This asset is not covered by the strict capability. Its provenance/license is not
established and no source asset or license claim is added. Published test fixtures
are original synthetic values constructed through the existing test chunk/CRC
helpers and independent Node zlib, not copied external pixels.

**Unapproved process deviation:** the root browser suite was run without setting
`TEXT_FLOW_SHOWCASE_PNG`; its inherited text-flow showcase test makes external
asset requests. This was discovered after the run. `npm_config_offline=true`
controls npm, not browser network traffic, and did not satisfy the caller's
no-fetch constraint. No source copy or migration resulted. Do not repeat that
command without `TEXT_FLOW_SHOWCASE_PNG=/tmp/opencode/text-flow-showcase-eevee.png`
and appropriate network isolation. This is disclosed, not an approved exception
or a claim that the asset is normalization-eligible.

## Validation

Executed from the worktree above with Node 24.22.0, npm 11.19.1, TypeScript 5.9.3,
tsx 4.23.15, Biome 2.4.13 and esbuild 0.28.2:

- `npm run build -w @updf/png && npx tsx --test packages/png/test/*.test.ts tests/consumer/png*.test.ts`:
  initial focused pass, 36 tests before the dedicated subpath consumer tests and
  final exact-budget-boundary test were added. Final
  `npm_config_offline=true npx tsx --test packages/png/test/*.test.ts tests/consumer/png*.test.ts`:
  **39/39 pass**.
- `npm run format:check`, `npm run lint`: pass, including the real AST code-principles
  gate. Initial unused-import/function-length diagnostics were fixed, not waived.
- `npm run typecheck`: pass, including the full ordered workspace/package build.
  Initial three noUncheckedIndexedAccess diagnostics in corruption fixtures were
  fixed before the passing run.
- `npm_config_offline=true npm test`: final full pass, **1,738/1,738**, including
  17 added tests over the caller-reported 1,721 baseline. Format, lint and full
  typecheck/build were rerun successfully before this final run.
- `npm run build:browser`: pass for all 12 configs; pre-existing large-chunk
  advisory for browser-fonts remains a warning, not a failing check.
- `npm_config_offline=true npm run test:browser`: 26/26 pass, with the network
  constraint deviation above. No normalization/browser-conversion test is claimed.
- `npm run check:graphs`: pass for all 12 emitted browser graphs.
- `git diff --check`: pass. Isolated packed consumer tests check ESM/CJS function
  identity, browser isolation, unchanged root exports, positive/negative TypeScript
  with `lib: [ES2022], types: []` under NodeNext and Bundler resolution, and native
  rejection of eligible 16-bit bytes. No DOM/Node ambient types are required.

Risk-based tests cover each 16-bit color type, all filters and late invalid filter,
full-range transparency, optional truecolor palette, source snapshot/reentrancy,
cross-realm/overridden/unsafe byte views, strict options, native and structural
abort, listeners/locks, read/output bounds, every source truncation, original CRC,
ordering, methods, unsupported chunks, Adler/zlib/trailing data, exact decoded
length, and exact/over-limit source/chunk/pixel/two-byte-row budgets. Genuine native
decompression is counted for preflight rejection; structural stream stubs exercise
only bounds/cancellation, not successful codec validity.

## Paired cost and preservation receipts

Baseline was captured **before target edits**, including every tracked/nonignored
untracked path, dirty status/diff digest, source/config/lock hashes, PNG source/dist
inventory and tool versions: `/tmp/opencode/png-s5c1-before.json`. Its full manifest
SHA-256 is `578ef7a37617c8a657e38b783014fc832cb04f9d3866ee140fcd874c8ea1f356`.
After/final manifests and exact allowlist comparisons are in
`/tmp/opencode/png-s5c1-after.json` and `png-s5c1-preservation.json`.
The allowlist delta is four modified tracked files and ten new untracked files;
all 1,714 other assignment-start files are byte-identical. Their aggregate hash is
`859ab7b3e3b0cd919f82610314a0a9f2c08c35e7485c319f8816f646c043c4bd`.
Reproduction scripts are `/tmp/opencode/png-s5c1-state.mjs` (`before`/`after`),
`png-s5c1-compare.mjs`, and `png-s5c1-fixture.mjs` (`before`/`after`). Do not overwrite
the assignment-start receipt by rerunning `before` on changed source.

Same dynamic exports, minified ES2022 browser ESM, esbuild 0.28.2, gzip level 9;
no fixtures/UI in these consumers. Both raw and minified builds record full inputs:

| Consumer | Raw before → after | Minified before → after | Minified gzip before → after |
| --- | ---: | ---: | ---: |
| PNG root exports | 24,430 → 24,934 | 13,109 → 13,312 | 5,075 → 5,145 (+70) |
| Complete PNG-to-PDF consumer | 90,125 → 90,629 | 48,002 → 48,209 | 16,504 → 16,587 (+83) |
| Existing `@updf/images/png` | 24,959 → 25,463 | 13,320 → 13,523 | 5,153 → 5,231 (+78) |
| Separate normalization entry | N/A → 14,782 | N/A → 8,156 | N/A → 3,416 |

PNG production source totals: 20,348 → 23,891 raw bytes; browser ESM module totals
(no maps/facades): 18,475 → 20,722; corresponding declarations: 3,270 → 4,962.
These module totals are not additive consumer bundle costs. Default graph growth
is the shared selected parser policy, sample-byte layout and extracted scanline
checks. It does **not** load the normalization module/validators or browser globals;
the normalization graph does not load the pixel decoder/native resource publisher.
No validation/ownership/lifecycle guarantees were traded for size.

An unchanged synthetic 8-bit RGBA native PDF is byte-identical (`cmp` pass), SHA-256
`de25df17ee0ce6da27f9d5df180956e9aa2ca58c5f328041762c79cabb4f528c`;
before/after PDFs are under `/tmp/opencode/png-s5c1-native-{before,after}.pdf`.
The first temporary source/dist-mixed baseline harness failed resource identity;
the paired successful harness uses only canonical built Node facades.

## Code principles and next owner

The checklist passes: correctness/regression validation, cohesive files below 400
lines, functions below 50 lines, nesting at most three, intent-only comments and
risk-based tests. No approved code-principles exceptions; no Changeset because this
is private/unpublished and does not use that release workflow. Nothing staged or
committed. Auditor should independently review the precise manifest delta, parser
policy/default error order, 16-bit row budgets/tRNS, native 8-bit isolation, snapshot
contract, subpath consumers and the disclosed process deviation. Browser conversion
and any policy decision about the ineligible external asset require a fresh slice.

## S5c1a — optional color-metadata eligibility (separate audit scope)

**Implemented, ready for independent audit; not verified.** Issue ID: N/A.
The preceding S5c.1 receipt is preserved as historical evidence. The caller reports
its independent verification by Auditor `ses_e92114d0…`; that verification does
**not** cover this expansion. No earlier receipt or baseline was overwritten.

### Frozen baseline and ownership

Same exact worktree, branch and unchanged base/HEAD listed above. Engineer owns only
this nine-path incremental delta: `packages/png/src/{parser,normalization}.ts`, new
`packages/png/src/normalization-color.ts`, `packages/png/README.md`,
`packages/png/test/normalization-invalid.test.ts`, new
`packages/png/test/normalization-color.test.ts` and
`packages/png/test/normalization-color-fixture.ts`,
`tests/consumer/png-normalization-graph.test.ts`, and this appended evidence.
All other inherited dirty files remain caller-owned. No staging, commit, push, PR,
tracker mutation or delegation. No dependency, manifest, lockfile, image-codec,
application, browser adapter, asset or native pixel-decoder change.

Fresh pre-edit manifest: `/tmp/opencode/png-s5c1a-before.json`, SHA-256 aggregate
`a440320de55fb09a4a33cce96d08f77a17e0d91087a035151262d80fcd7ea1b0`, matching
the supplied post-audit freeze. Reproduction/receipts use **only new**
`/tmp/opencode/png-s5c1a-*` names. Run the `state.mjs before` mode only on the
frozen source, never on the delivered source. `state.mjs after` and `compare.mjs`
record the delivered manifest, exact incremental allowlist, unchanged inherited
paths, source/dist inventory, tools, cost inputs and unchanged root declaration
hashes. The final comparison preserves 1,722 assignment-start files outside scope.

### Exact policy and implementation

Public API and copied-bytes/frozen-metadata result are unchanged. The optional
normalization profile now always permits eligible `gAMA` and `cHRM` independently;
there is no public skip/color flag. Shared parsing still owns original CRC,
framing, chunk work limit, sRGB singleton/shape/intent/order, IHDR, PLTE/tRNS,
consecutive IDAT and terminal IEND. A private readonly-state callback adds only
the optional metadata predicates; it neither duplicates parsing nor strips chunks.
Gamma and chromaticity claims are two invocation-local scalar values, including
failed and concurrent parses; no metadata arrays grow with chunk count. The native
profile allocates no color state and imports no optional helper (the helper's
parser type import erases). Native 8-bit gamma/chromaticities rejection and native
16-bit IHDR-first rejection remain intact, including their existing error codes.

Policy reference: [PNG Third Edition, 24 June 2025](https://www.w3.org/TR/2025/REC-png-3-20250624/),
§3 four-byte unsigned domain (0…2147483647), §11.3.2.1–2 representations,
§5.6 singleton/placement, §11.3.2.5 Table 17 sRGB companions, §4.3 precedence.
`gAMA`: singleton, length 4, positive integer at most 2147483647. `cHRM`:
singleton, length 32, eight integers in white/red/green/blue xy order within the
PNG unsigned domain. Eligibility requires x in 0…100000, y in 1…100000,
x+y ≤ 100000. **Positive gamma and these xy bounds are our conservative physical
eligibility restrictions, not a normative complete PNG validity predicate.**
All operations are exact integer-domain/identity checks; no EPS, approximate-fit
arithmetic, area, determinant, spectral-gamut calculation or color engine applies.

All three declarations precede PLTE/IDAT, without relative ordering. If sRGB is
present, any gAMA must equal 45455 and any cHRM must equal
`[31270,32900,64000,33000,30000,60000,15000,6000]`. Neither companion is required.
Both earlier and later contradictions reject `PNG_DATA` despite browser precedence;
they are never laundered by dropping ignored declarations. CRC/length/duplicate/
placement/high-bit domain errors use `PNG_DATA`. Zero gamma or out-of-profile xy
uses `PNG_PROFILE`. ICC, APNG, interlace, newly defined color metadata and every
other previously unsupported chunk remain unsupported. All input/scanline/quota/
abort validation remains mandatory; no decompressor runs for metadata rejection.

### Local reference and native preservation

`node /tmp/opencode/png-s5c1a-cache.mjs`: pass. The 113,021-byte cached reference
now passes **full** validation, including bounded inflation, exact 16-bit row
stride/length and every row filter. Result metadata is
`{kind:'png',width:512,height:512,bitDepth:16,colorType:6,alpha:true}`.
The returned snapshot and unchanged cached original both hash exactly
`7a201582d435201a92a092bd3aef7150029da0bc9b2e86d89e692ab9278b474a`.
The result exposes only `bytes` and frozen `metadata`, not inflated buffers.
**Metadata accepted; browser conversion pending.** Copy identity is not a lossless
conversion claim. A future handler must decode the privately validated snapshot
with metadata retained, preserve alpha without resizing, and validate its 8-bit
RGBA output with native preparation. It may promise browser-rendered output, not
bit-exact source samples or cross-engine equality. No asset redistribution,
license claim, fetch, live-asset access or browser suite occurred in S5c1a.

`node /tmp/opencode/png-s5c1a-fixture.mjs before` / `after` plus
`cmp /tmp/opencode/png-s5c1a-native-before.pdf /tmp/opencode/png-s5c1a-native-after.pdf`:
pass; same-host independently prepared native 8-bit PDF SHA-256 remains
`de25df17ee0ce6da27f9d5df180956e9aa2ca58c5f328041762c79cabb4f528c`.
An initial temporary fixture wrapper had an invalid data-URL absolute-import
resolution; fixed to file URLs before the successful pre-edit fixture capture.
No repository implementation or baseline bytes were changed by that failure.

`node /tmp/opencode/png-s5c1a-original.mjs` reuses the original read-only source/
history/dist preservation collector with output redirected to this slice's receipt,
executed from the target worktree: pass. Original 1,663 sources/status, 5,288 history
and 80 dist files retain their hashes; PID 665048 remains the original preview.
Receipt: `/tmp/opencode/png-s5c1a-original-preservation.json`; live asset requests 0.

### Serial gates and risk-based tests

All commands below ran from the target worktree, with existing installed tooling;
no install, CDN fetch or browser conversion test was used.

- `npm run build -w @updf/png`: pass.
- `npm_config_offline=true node_modules/.bin/tsx --test packages/png/test/*.test.ts tests/consumer/png*.test.ts`:
  pass, **45/45** PNG/consumer tests, including all 17 inherited S5c.1 tests.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass, serial;
  typecheck includes the ordered full workspace build. Initial unused-return and
  graph-test function-length diagnostics were fixed, not waived.
- `npm_config_offline=true npm test`: final pass, **1,744/1,744**, six additional
  metadata tests over the 1,738 frozen baseline. Repeated after added per-field
  high-bit/domain boundary assertions. Expected negative-control esbuild diagnostics
  in the historical arithmetic test do not represent a failing test.
- `git diff --check`: pass. No browser suite/build or live showcase test was run.

Synthetic, committable metadata fixtures use the existing independent chunk/CRC
helpers and Node zlib; they contain no external pixels. Added coverage includes
absent/independent/both metadata, both orders and all six three-declaration
permutations, optional sRGB companions, non-sRGB values, exact gamma endpoints,
xy and sum boundaries, every high-bit field, malformed length/CRC/placement,
duplicates near the chunk budget, oversized/malicious declaration bytes, no-inflate
rejections, conflicts in every order, concurrent distinct claims, failed-then-valid
cleanup, source mutation during await and native profile/error preservation.
The existing malformed rows, limits, abort and owned-byte tests continue passing.
Graph positive controls retain the color helper only in normalization; native
consumers exclude it, and normalization still excludes the native pixel decoder.

### Paired retained costs and distribution payload

Same fixture source, exports, tools and flags as the fresh pre-edit capture:
esbuild 0.28.2, browser ESM ES2022, raw and minified builds, gzip level 9. Full input
graphs are recorded in the before/after state, rather than inferring cost from
imports. Optional metadata positive tests execute the retained checker.

| Consumer | Raw before → after | Minified before → after | Minified gzip before → after |
| --- | ---: | ---: | ---: |
| PNG root exports | 24,934 → 25,033 | 13,312 → 13,371 | 5,145 → 5,161 (+16) |
| Complete PNG-to-PDF | 90,629 → 90,728 | 48,209 → 48,268 | 16,587 → 16,602 (+15) |
| Existing images/png | 25,463 → 25,562 | 13,523 → 13,582 | 5,231 → 5,247 (+16) |
| Separate normalization | 14,782 → 16,875 | 8,156 → 9,215 | 3,416 → 3,801 (+385) |

Native growth is the optional callback dispatch in the shared parser, **not**
optional color logic or application/decoder overhead. PNG source total:
23,891 → 26,665 bytes; browser module JS: 20,722 → 23,314; declarations:
4,962 → 5,500. Complete generated package distribution, including all formats,
facades, declarations and maps: **82,978 → 92,658 bytes** (`payload.mjs` receipt).
Complete unpacked package files-list payload (dist, LICENSE, README, package.json):
**96,197 → 107,306 bytes**. The baseline README is reconstructed without writing
repository files and its hash is checked against the frozen baseline before that
calculation; LICENSE and package.json are unchanged. These are inventory totals,
not additive retained costs or compressed npm tarball sizes. No ownership, exact
domains, lifecycle checks or quotas were traded for size.

### Code-principles and safe stopping point

Checklist passes: correctness and native behavior validated; cohesive production
files ≤400 lines; functions ≤49 lines; control-flow nesting ≤3; intent/invariant
comments only; risk-based boundary/regression tests; format/lint/typecheck/tests
pass. No approved exception or new Changeset (private/unpublished, no Changesets
workflow). No known remaining S5c1a acceptance item. Independent Auditor should
review the nine-path manifest delta, classification/order/consistency rules,
invocation isolation, native graph/cost preservation and local source receipt.
Browser conversion and application migration are intentionally not implemented and
belong to a fresh assignment after audit, not this eligibility verification.
