# FSX to static terminal proof

Issue: N/A. Implementation worktree: `/home/sprawl/projects/updf/trees/tui-layout-proof`,
branch `feature/tui-layout-proof`, base/HEAD `12e485b9ac881f2d6ba620a390ba36ff7ea8a4b2`.
Parent owns integration, independent audit, and any later commit. This slice is new
proof scripts, portable integration tests, and this document only; no production
packages, manifests, lockfiles, Formbar files, historical size evidence, or services
are changed. All delivered files are untracked/uncommitted pending parent audit.

## Run

From the worktree (Node 24 required):

```sh
npm ci --ignore-scripts
FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown
FORMBAR_ROOT=/home/sprawl/projects/formbar node --test scripts/tui-layout-proof/live.test.mjs
FORMBAR_ROOT=/home/sprawl/projects/formbar node scripts/tui-layout-proof/profile.mjs
```

`FORMBAR_ROOT` is explicit and must name a clean Git root at
`4fc67c225ef9af80dd2345852df3b884e62656eb`. No stdin, remote source, arbitrary FSX
JavaScript, private user forms, or editable data are accepted. The original owned
FSX and fixed schema/bindings are in `source.mjs`. It declares `fullname` and
`company` text fields, a literal full-width description Output, and a Conditional
driven by an installed `showExtra` boolean reference. Hidden/shown are separate
controlled initial installations, not writes to a mounted form.

`bridge.mjs` calls public `@formbar/fsx-authoring.compileFsx` with
`fsx-v1-experimental`; it requires success with a real validated definition. External
source imports of demo `compileOptions`, `installDemo`, and `disposeDemoSession`
are **app-private bridges**, not public integration APIs. `installDemo` calls public
`createKaladaV1Host` with the existing installation/strategy machinery. Snapshot
tree keys associate controls/outputs; the host alone resolves conditional branches.
The host is disposed in `finally`, including rendering/consumer failures. Resize
does not call control writers, change field state, or change the installed revision.

The Formbar installed dist is not used for participating Formbar packages. The
write:false in-memory esbuild harness maps package public export entries to source
and loads the owned ESM bundle by data URL. Third-party imports resolve with ESM
conditions from **root** `FORMBAR_ROOT/node_modules`, not nested older installations.
An initial smoke attempt selected nested Scheman 0.1.0 (missing `jsonSchemaProvider`);
the corrected root-resolution smoke passed both states. No Formbar install/build
or dependency changes were made. Missing dependencies are errors, not fake snapshots.

## Terminal profile and ownership

This is a static string buffer, not raw-terminal input, focus handling, an interactive
application, an ARIA implementation, or a production renderer. Textual output and
literal expected bodies are accessible to ordinary text consumers. It proves shared
authoritative **width allocation only**, not a renderer-independent layout kernel.

`intervals.ts` imports unchanged `packages/layout/src/width-resolver.ts`, the same
allocator used by Row (`row-compiler.ts`). Numbers here are **cell units**, not PDF
points: no PDF fonts, glyph measurement, serialization, or renderer calls occur.
Two-column presentation is explicit adapter policy **outside FSX**: label weight 1,
min 8/max 24; control weight 2, min 12/max 100; one-cell gutter. FSX has no span/layout
grammar; no presentation attributes were invented.

The canonical continuous allocator runs first. In source order, accumulate each
returned binary64 width and integer gutter exactly using the existing `binary64.ts`
dyadic primitive and a BigInt accumulator. Endpoint quantization is
**floor(sum(binary64 widths + integer gutters))**, not floor of a rounded native
floating-point sum. Divide by the exact dyadic value of one cell before converting
the bounded integer endpoint to Number. All intermediates stay exact, including
subnormal widths; no epsilon, clamp, or independent width rounding is used. Derive
integer box widths from endpoint differences.
An integer gutter remains exact under flooring; boxes cannot overlap. Maximum-capped
trailing unused space remains unused (35 cells at width 160 for the field policy),
not silently stretched into controls. A single full-width interval is used for
Outputs and the non-form footer. Row stacking, wrapping, footer borders, and raster
placement are terminal-adapter responsibilities, not a competing global flex/grid
kernel. Raster bounds/overlap failures reject, never clip.

The audit repair corrects `[7.999999999999999, 1]` at width 32 from a spurious
two-cell gutter to boxes `[0,7)` and `[8,9)`, with 23 unused trailing cells.
Exact accumulation also changes the field policy's final endpoint by minus one
cell versus native addition at widths 26, 29, 32, 35, 38, 41, 44, 47, 51, 54,
57, 60, 63, 66, 69, and 72. All other integer widths 24..160 retain their baseline
boxes; allocator results are unchanged. At width 32 the uncapped 1:2 weighted
example ends at 31, not 32. The four live literal CLI bodies still pass unchanged;
other text can wrap differently when its control loses this falsely granted cell.
This is explicit terminal line quantization policy, not a full layout-kernel claim.

Printable ASCII plus LF only. Reject ESC/ANSI, tabs, CR, DEL, Unicode, unsupported
node kinds/presentation, unsupported controls/output formats, and missing tree-key
associations. Limits checked before width/buffer allocation: integer window width
24..160, height 1..80, at most 12,800 cells, 64 nodes/control/output entries, depth 8,
8,192 consumed text characters including the footer. Snapshot inputs are trusted
host data, not a general hostile-object deserialization interface. Wrapping keeps
LF paragraphs (including empty ones) and every declared space, prefers the last
space within capacity, and splits long words when necessary. The CLI uses a height
budget of 20; excess content rejects. Hidden conditionals use zero vertical space.

## Actual CLI output

Trailing padding spaces are omitted below for legibility; the live suite compares
the complete fixed-width strings, including padding. Order is state then width.

```text
STATE=hidden WIDTH=32
Full name  Ada Lovelace
Company    Analytical Engines
A static form proof with
deterministic wrapping and
shared width allocation.
+------------------------------+
|STATIC / cell units           |
+------------------------------+

STATE=hidden WIDTH=80
Full name                Ada Lovelace
Company                  Analytical Engines
A static form proof with deterministic wrapping and shared width allocation.
+------------------------------------------------------------------------------+
|STATIC / cell units                                                           |
+------------------------------------------------------------------------------+

STATE=shown WIDTH=32
Full name  Ada Lovelace
Company    Analytical Engines
A static form proof with
deterministic wrapping and
shared width allocation.
Extra details are visible.
+------------------------------+
|STATIC / cell units           |
+------------------------------+

STATE=shown WIDTH=80
Full name                Ada Lovelace
Company                  Analytical Engines
A static form proof with deterministic wrapping and shared width allocation.
Extra details are visible.
+------------------------------------------------------------------------------+
|STATIC / cell units                                                           |
+------------------------------------------------------------------------------+
```

## Size/retention evidence

`profile.mjs` emits four JSON records: raw/gzip bytes, all esbuild metafile inputs,
positive `bytesInOutput` retained modules, external third-party dependencies,
external Node builtins, and conservative PDF-related retained-module leakage.
Input discovery is **not** treated as retained code. Combined CLI means the runtime
entry `cli.mjs`; its additional bootstrap subrecord measures `run.mjs` plus
`bundle.mjs` with esbuild external. These are overlapping scopes, not additive
package sizes. Bootstrap and third-party runtime dependency bytes are not hidden
inside the runtime count. No heap, CPU, cold-start, or full deployment-size claim
is made; no arbitrary size cap or historical artifact overwrite occurs.

Observed with Node 24.21.0, npm 11.19.0, esbuild 0.28.2:

| Scope | Raw bytes | gzip bytes | Resolved inputs | Retained modules |
| --- | ---: | ---: | ---: | ---: |
| uPDF allocator | 5,428 | 2,355 | 53 | 12 |
| Formbar bridge | 198,549 | 58,329 | 224 | 120 |
| Terminal adapter (includes allocator) | 9,051 | 3,783 | 56 | 15 |
| Combined CLI runtime | 208,177 | 61,969 | 281 | 136 |

All four scopes were reprofiled after the exact-endpoint repair, using the command
above with `write:false`; no bundle/profile artifacts were written. Allocator and
bridge byte counts were remeasured unchanged. Retained module counts remain
12/120/15/136; `intervals.ts` retains 402 bytes in the adapter and 403 in combined
runtime. The module paths, PDF leakage inventory, runtime externals, and bootstrap
scope were rechecked; no new retained module or external dependency was introduced.

**Leak reported, not a PDF-free goal pass:** the unchanged core-internal barrel
retains `fonts/checks.ts` (41 bytes), `vdom/create.ts` (102), `painting/affine.ts` (36),
and `painting/style.ts` (30). Its core error/schema/policy/metrics validation modules
are also retained. The conservative leak inventory deliberately includes these
font/VDOM/painting modules. The retained lists show no PDF serializer, font embedding,
fontkit, or PDF text-measurement implementation. Discovery lists do contain unused
font/measurement modules; those are not misrepresented as retained. Strict removal
of these barrel initialization leaks would be a separate production-import issue,
not part of this authorized proof. The bridge also retains demo extension/profile
registration code and imports React JSX runtime; no React rendering is invoked.

Bootstrap builtins: `node:child_process`, `node:fs`, `node:module`, `node:path`,
`node:url`; bootstrap measures 2,349 raw / 1,234 gzip bytes, with two resolved and
retained inputs; its tooling external is `esbuild`. Runtime scopes have no Node builtin
imports. Existing root external packages: Kalada core 0.6.0, syntax 0.1.0,
provider-routing 0.1.0; Scheman core 2.0.0; kuery 2.1.1; ajv 8.20.0;
ajv-formats 3.0.1; Arbitre core 0.3.1; React 19.2.6. Their transitive installed bytes
are outside these bundle measurements. Full per-entry paths are printed by the
profile command so provenance and retention can be independently audited.

## Validation and safe stopping point

Portable fixture tests belong to normal `npm test` and require no Formbar checkout.
They test the actual allocator/projection, odd/32/80 widths, fractional fixed and
weighted min/max tracks, capped unused trailing space, exact gutters, raster
non-overlap, footer geometry, LF/whitespace/long words, frozen-input determinism,
overflow, unsafe strings/dimensions, unsupported nodes, and budgets. They are **not**
cached substitutes for live integration. The separate explicit live command above
requires `FORMBAR_ROOT` and fails when unavailable; it is not silently skipped by
normal tests. It tests actual source control order/value/visibility, both snapshots,
all four literal bodies, unchanged data/revision, disposal on all consumer paths,
and real compiler rejection of an uninstalled reference.

`env -u FORMBAR_ROOT node scripts/tui-layout-proof/run.mjs` was explicitly checked:
exit 1 with `FORMBAR_ROOT is required`, rather than silent skip or cached output.

Repair commands: `npx tsx --test tests/integration/tui-layout-proof.test.ts`, the
live test/CLI/profile commands above, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test`, and `npm run check:graphs`; all pass. The final
normal test run has 627 passing tests; focused proof tests: 10 portable, 3 live.
Three added regressions cover near-integer fixed/capped/min-max solver widths,
subnormal accumulation, fractional carry (not independently floored widths), wrong
gutter/different-width negative controls, bounds/trailing space, and all 137 integer
field-policy widths against the characterized native baseline. Initial tests exposed
the old native-rounded endpoint expectations; these were corrected to the exact
contract. Initial format check required only formatting the added arrays, then passed.
Browser build was not rerun for this adapter-only repair: no native engine or browser
artifact was changed. The prior browser build passed with the existing >500 kB
font-browser chunk warning; graph checks rerun against those inventories
pass for core 39, VDOM 51, fonts 7, measurement 23, flow 132, tables 153,
composable-tables 153, React browser 91, fontkit 113, font-browser 265, geometry 56,
SVG 84. No engine changes or CMR/reference-threshold modifications.

Before/after `git status --short` and `git rev-parse HEAD`: uPDF started clean at
the base above and ends with only the three owned new paths; Formbar remains clean
at the pinned HEAD. Root dependency versions/paths were read, not modified.
`origin/main` is `3f68b70a91880b02e29296fc4f07c928d17d2492`; the read-only
`git diff --stat origin/main...HEAD` inspection produced no changes. The dirty
optional editor worktree was not used. The directional tree comparison
`git diff HEAD origin/main --stat` shows 19 editor/demo/test/docs/lock-related
files (563 insertions, 67 deletions), not a reason to use that newer revision.

`git diff --check` passed. Supplemental MJS principles enforcement also passed:

```sh
npx eslint scripts/tui-layout-proof --rule 'max-lines: ["error",400]' --rule 'max-lines-per-function: ["error",{"max":49,"skipBlankLines":false,"skipComments":false}]' --rule 'max-depth: ["error",3]'
```

An initial supplemental ESLint invocation in the original proof had incorrectly
quoted CLI rule options; the corrected command above passed again for this repair
without code exceptions. A diagnostic `tsx -e` attempt used CJS and failed on the
ESM-only core internal export; `node --import tsx --input-type=module -e` successfully
characterized the changed field-policy endpoints instead.

Code-principles self-check: cohesive files <400 lines, functions <50 lines, nesting
at most 3, comments limited to intent/invariants, correctness/bounds verified,
and risk-based tests added. No approved exceptions; no Changeset because this is
an unpublished script/test/doc proof with no package runtime changes. Status:
implemented, ready for independent audit (tracker N/A); not independently verified.
Auditor should rerun live/profile commands, inspect retained-code caveats and exact
cell geometry/unsafe-input rejection, and check the complete untracked delivery.
