# S2 central registration — engineering delivery

Issue: N/A. **Implemented, ready for independent audit; not verified.** No stage,
commit, push, PR, tracker or delegation mutation is authorized or performed.

## Scope and recovery

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`; base/HEAD remains
  `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- The completion assignment inherited and owns 42 tracked modifications and six
  untracked files from the prior S2 Engineer. All delivery remains unstaged/untracked.
  `artifacts/text-flow/central-completion-before.json` freezes those exact 48 files
  before this completion's edits. No other owner's work was overwritten.
- `central-before/manifest.json` and `central-before/costs/report.json` remain the
  immutable original clean-HEAD baseline: 238 metrics, 40 bundles, 15 libraries.
  The original incomplete checkpoint remains `central-checkpoint.json`.
- `central-final.json` records every dirty/untracked source hash and exact status;
  `central-final.patch` contains the complete tracked diff against original HEAD.
  New source files are present in the worktree, enumerated and hashed by that seal.

## Canonical API

```tsx
/** @jsxImportSource @updf/core */
import { render } from "@updf/layout/render";
import { Block, Document, Flow, Paragraph, Span } from "@updf/layout";
import { createTextService } from "@updf/text";
import { floatable, textFlow } from "@updf/text-flow";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";

const runtime = fontRuntime();
const FloatingBlock = floatable(Block);
const options = {
  resources: { Custom: createHelvetica() },
  text: createTextService({ runtime, defaultFont: "Custom" }),
  providers: [fontProvider(runtime)],
  extensions: [textFlow()],
};
const pdf = render(<Document><Flow pageSize={{ width: 220, height: 260 }}
  margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
  <FloatingBlock style={{ width: 72, height: 96, float: "left" }} />
  <Paragraph>Ordinary <Span style={{ fontSize: 14 }}>rich text</Span> siblings.</Paragraph>
</Flow></Document>, options);
```

Root exports `textFlow`, `floatable` and rectangle-only `FloatingBlockProps`.
`createTextFlow` is removed, not aliased. `floatable` checks actual layout Block
identity, retains typed children/style, and adds no wrapper box or painter.
Installation is operation-owned and lazy; duplicate feature identities reject.
Missing installation/provider errors retain the source origin before late painting.

The ordinary seven-callback custom text-service contract remains valid. Its optional
own `provide` callback is captured with its receiver; no getters are evaluated.
Requests use trusted version-one identities, checked scope/lifetime and the existing
configured resolver. No service-identity WeakMap, raw runtime getter, fallback font,
second runtime, new host admission session or global installation is introduced.
Failed initializer attempts revoke their captured scope before a retry; work is not
refunded. Nested lowering shares the actual state owner, not a new operation session.

`@updf/layout/render` exports only named synchronous `render`, accepting the same
`DocumentContentData | VDOMChild` and `LowerOptions` as `layout`, returning
`Uint8Array<ArrayBuffer>`. Runtime input must be one Document with Page/Flow sections.
It delegates to existing layout, then existing core rendering of the fixed result.
**Two operations, two snapshots, two lifetimes and independent budgets**, not one
shared ledger or atomic full-document snapshot. Configured resources, services and
provider identities are reused exactly. Trusted callback side effects between
stages retain ordinary two-stage semantics. Layout validates all own option fields
first; the adapter then omits only `registry` and `resourceMetadata`, preserving
descriptors, presence and values so core rejects invalid mutations without invoking
getters. Layout failure never reaches serialization. Core render remains fixed-only;
there is no VNode detection, new lowering, root re-export or packaging-builder rewrite.

Natural measurement adapter sets migrate from `options.extensions` to
**`options.adapters`**, without an alias. `Flow.extensions` is still its adapter set;
operation `options.extensions` is the descriptor list and must not be silently stripped.
The two inherited app-source changes are only this narrow measurement-key migration.

`/path` and `/atomic` intentionally retain their explicit paired legacy capability
routes until S3/S11. Separate legacy/canonical Flows coexist; two compilers in one
Flow reject. A mixed custom owner may share one configured service/resource pairing
but the legacy and canonical capability slots remain separate. Rectangle imports
retain neither path parsing nor atomic composition nor image machinery. No shape,
image source, paginator, arithmetic, box, font-runtime or native certificate owner
was changed. Existing whole-body auto-margin and S4 negative-leading, clearance and
whole-selected-graph preparation regressions remain active.

## Validation and refinement history

All commands below run serially in this worktree unless a disposable cwd is named.
No checks remain asynchronous. The prior checkpoint had 52/53 focused passes and a
TypeScript failure because core render does not accept authored VNodes. The caller
resolved that boundary explicitly in favor of `/render`; the corrected focus passed
53/53. Completion additionally found/fixed stale service/export-inventory assertions,
a test primitive name, and failed-initializer scope retention. No failure was waived.

| Command | Outcome |
| --- | --- |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome and AST principles |
| `npm run typecheck` | PASS, includes complete package build |
| `npm test` | PASS, final rerun 1,595/1,595 |
| `npm run build:browser` | PASS, twelve browser targets |
| `npm run check:graphs` | PASS |
| `npm run test:consumer` | PASS, fifteen clean tarball closures, NodeNext/Bundler, ES/Node/CJS identity |
| `npx vite build --config apps/showcase/vite.config.ts --outDir /tmp/opencode/updf-s2-showcase-completion-20261023` | PASS, isolated output only |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s2-showcase-completion-20261023 npm run test:browser` | PASS, 22 tests |
| `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s2-showcase-completion-20261023 npm run test:showcase` | PASS, 105 tests, 404 seconds |
| `node /tmp/opencode/updf-s2-clean-build.mjs` | PASS twice; final source-only copy `/tmp/opencode/updf-s2-clean-NpdiF7` includes 1,609 current tracked/untracked files, fresh `npm ci --ignore-scripts` then `npm run typecheck`; receipt `central-clean-build-final.json` |
| `node /tmp/opencode/updf-s2-base-loads.mjs` | PASS; clean original HEAD rebuilt in `/tmp/opencode/updf-s2-base-loads-vTkXzw` for paired unshaken Module._load traces |

The initial browser invocation without `SHOWCASE_OUT_DIR` used historical served
dist and failed one source-display assertion. The isolated current build passed
all 22 without changing tests or historical bytes. Two showcase invocations timed
out (the first shared a 120-second command with browser tests, the next had 240
seconds); the full 600-second invocation completed 105/105 with no cancellations.
These interrupted runs are not counted as passes.

Risk-based additions cover configured nondefault/prepared fonts and Span override
PDF identity, original provider receiver/snapshot, custom services lacking provider,
unused lazy extension/native serialization, duplicate/fake/getter descriptors,
request/source/selected ownership and closure, initialization failure/retry,
canonical/legacy compiler conflict/coexistence, measurement adapter transport,
authored/fixed render distinction, local registry/metadata mapping, invalid unknown,
accessor and explicit-undefined options, two-stage limits and callback mutation.

## Paired retained and package cost

Reproduce with:

```sh
npx tsx scripts/text-flow-costs.ts --out artifacts/text-flow/central-after --compare artifacts/text-flow/central-before/costs/report.json
npx tsx scripts/text-flow-central-evidence.ts summary
npx tsx scripts/text-flow-central-evidence.ts seal
```

`central-after/report.json` contains exact raw/minified browser and Node bundles,
metafiles (48 bundles, 254 metrics), all package inventories/tarballs and tool/lock identities. `central-summary.json`
separates identical-source pairs, the same sibling document's explicit API migration,
and new absolute-only authored-render/installed-unused profiles. It also records
before/current unshaken load additions/removals; Node ESM facades are CJS-backed,
not a claim of genuine Node ESM tree shaking. The sibling pair is **not identical
source**. The new render entry is separately opt-in, not a new default core edge.

Minified bytes / gzip; before → after (delta):

| Consumer | Browser | Node |
| --- | --- | --- |
| drawing | 37,854/12,990 → 38,812/13,236 (+958/+246) | 60,250/19,269 → 63,194/20,060 (+2,944/+791) |
| ordinary text | 61,271/21,046 → 62,379/21,318 (+1,108/+272) | 126,982/39,566 → 131,450/40,766 (+4,468/+1,200) |
| prepared font | 65,547/22,344 → 66,655/22,615 (+1,108/+271) | 127,017/39,595 → 131,485/40,795 (+4,468/+1,200) |
| natural layout | 183,067/59,241 → 184,867/59,825 (+1,800/+584) | 311,941/94,820 → 316,855/96,112 (+4,914/+1,292) |
| canonical siblings, migrated API | 227,678/74,007 → 231,167/75,097 (+3,489/+1,090) | 347,347/106,377 → 353,947/108,354 (+6,600/+1,977) |
| authored render, new absolute profile | 184,683/59,246 | 313,584/95,017 |
| installed-unused, new absolute profile | 231,082/75,064 | 353,862/108,319 |

**Generic support is not zero-byte:** notably drawing's CJS-backed Node consumer
grows 4.89% minified / 4.11% gzip despite zero feature imports. Ordinary Node text
grows 3.52% / 3.03%. No threshold waiver or approval is inferred; Auditor/caller
must judge this explicit generic tax. Ordinary graphs still exclude feature source
selection, atomic/profile geometry and path parsers; configured-unused initialization
counts remain zero. The generic resource/provider capture and descriptor validation
are mandatory in production, not hidden behind a build mode.

Across all fifteen package payloads: packed 707,653 → 716,154 (+8,501); unpacked
3,897,711 → 3,944,824 (+47,113). Browser JS 832,369 → 842,333 (+9,964), declarations
337,199 → 342,034 (+4,835); CJS JS 960,831 → 972,703 (+11,872), declarations same
as browser; Node facades JS 14,363 → 14,881 (+518), declarations 3,282 → 3,350
(+68). Full per-package core/text/layout versus addon tax is in the summary.
These are package payloads, **not installed dependency closure totals**.

Owner attribution (emitted JS deltas, not retained-consumer deltas):

| Package | Browser JS delta | CJS JS delta | Browser/CJS declarations delta | Packed delta | Unpacked delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| core generic protocol | +5,839 | +7,261 | +2,654 each | +4,146 | +26,834 |
| text generic provider | +1,065 | +1,343 | +1,161 each | +1,132 | +6,435 |
| layout transport plus opt-in render entry | +1,902 | +2,078 | +1,079 each | +2,194 | +9,641 |
| addon and its canonical entry | +1,158 | +1,190 | −59 each | +1,029 | +4,203 |

The new opt-in `/render` entry is included in layout's emitted/package payload, but
is absent from ordinary root-layout and core graphs. The absolute authored-render
consumer is deliberately reported separately. Load-trace comparison adds only
generic request/extension protocol modules to ordinary profiles, never feature
selection. Importing the canonical addon itself deliberately loads selection and
the real layout Block identity; it still excludes the path parser and atomic planner.

## Preservation, principles and handoff

All 4,607 historical artifact files and 80 showcase dist files are checked against
the original manifest by the final seal. No showcase build writes to served dist;
app source text-flow/path previews retain S1 authoring. The initial targeted `ps`
query returned no row, which was reported as a concern; the final full-process
query finds the original PID 665048 and command. Both protected HTTP endpoints
return 200 with original fingerprints. No server kill, restart or replacement
was attempted. The final seal records this actual recovery of visibility.

Code-principles self-check: cohesive files ≤400 lines; functions <50 lines; nesting
≤3; intent/invariant comments; risk-based tests; strict identity/domain, budgets,
preparation/native admission and ownership retained. No numerical comparisons were
changed. No approved exceptions or Changesets workflow. Required lint/test checks
pass; independent Auditor must review actual unstaged and untracked delivery, cost
tax and preservation. The remaining action is independent audit, not another S2
implementation phase; later path/atomic migrations and preview updates are excluded.

## S2-A1 — current documentation/example correction

Issue: N/A. **Implemented; focused independent re-audit pending, not verified.**
The caller reports S2 runtime independently reviewed PASS; this supplement corrects
the remaining documentation findings without changing that runtime. Historical
chronology above and `central-final.json` / `central-final.patch` remain untouched.

- Same worktree, branch and base/HEAD as above. Entry ownership was 53 modified
  tracked files and ten untracked files (63 total), all preserved. This slice owns
  only `docs/inline.md`, `docs/text-styles.md`, the appended section here, and new
  `packages/layout/test/inline-docs.test.ts`. Delivery is 55 modified tracked files
  and eleven untracked files (66 total), with nothing staged or committed.
- The measurement signature now names `ContentOptions`, distinguishes its
  `adapters` owned set from the central operation `extensions` descriptor array,
  and retains `Flow.extensions` as the Flow-local adapter set. The table-style
  guidance uses these same actual scopes, without implying global installation.
- The regression executes the actual fenced local-inline-adapter Markdown source
  with the existing configured Helvetica fixture. Corrected measurement yields one
  line, `lines[0].height === size.height === 26.25` points. It also checks typed
  `{ adapters: extensions, extensions: [] }`, unchanged `Flow.extensions` layout,
  and the old option's structured `TYPE` at `/options/extensions`, requiring an
  ordinary array. A compile-negative assertion protects the option type boundary.
- `npx tsx --test packages/layout/test/inline-docs.test.ts`: PASS 2/2.
  `npx tsc --noEmit`: PASS (no build). `npm run format:check`: PASS after fixing
  one initial new-test wrapping failure. `npm run lint`: PASS (Biome and AST).
  `git diff --check`: PASS. `npm test`: PASS 1,597/1,597, no skips/cancellations.
  `node /tmp/opencode/s2-a1-doclinks.mjs`: PASS, 14 local links/anchors in the three
  authorized documents.
- Fresh ignored evidence: `artifacts/text-flow/central-s2-a1-before.json` and
  `artifacts/text-flow/central-s2-a1-supplement.json`, produced by
  `node /tmp/opencode/s2-a1-evidence.mjs before` / `after`. The before snapshot
  matched every inherited sealed source hash. The supplement records complete
  source inventories/hashes, exact four-file delta, unchanged runtime/tool inputs,
  package outputs, historical seals and all cost artifacts. Source inventory grows
  from 1,609 to 1,610 files, not by counting the appended evidence file twice.
  All 254 existing cost metrics are reused, not recalculated: no runtime, package,
  export, tool-input or emitted-output change warrants a new cost/build run.
- The original 4,607 historical artifact hashes, 80 protected showcase dist hashes,
  PID 665048 and both protected HTTP fingerprints are checked again in the
  supplement. No build, server mutation, tracker mutation, delegation, staging,
  commit, push or PR was performed. Full build/consumer/browser gates above are
  inherited evidence, not fresh runs for this docs/test-only correction.

Code-principles self-check: cohesive new test below 400 lines, functions below 50
lines, nesting at most three; intent-only comment, risk-based positive/negative
example coverage, lint/type/test passes. No numerical/runtime contract changes,
unsafe input validator copy, new dependency or approved principle exception.
Auditor should focus on the three documentation deltas, executable example and
supplement preservation proof; this is not a request to repeat the S2 runtime audit.
