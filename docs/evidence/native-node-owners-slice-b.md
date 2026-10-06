# Six native source owners — Slice B

2026-10-06. Objective: cohesive ownership for **all six** native node kinds, with
narrow phase wiring and preserved AST/VDOM/PDF behavior. Issue: N/A. Parent Builder
owns integration; independent audit is planned after B/C, not claimed here.

## Delivery state and boundaries

- Cwd/worktree: `/home/sprawl/projects/updf/trees/jpeg-resources`.
- Branch: `feature/jpeg-resources`; base and unchanged HEAD:
  `f97a07a223aad8ac6de043bf515777aec42f5778`.
- Inherited A: 22 modified files and four new files, all uncommitted. Preserved.
  B touches four shared A files only for its bounded additions: resource-provider
  docs, core README, document resource dispatch and exact boundary inventory.
- No staging, commits, pushes, PR/tracker mutations, nested delegation or edits in
  other worktrees. Entire delivery is unstaged/untracked; staged scope is empty.
- Implemented: six owners, accepted keys, validation, measurement, ink, applicable
  collection, paint, native construction/prop translation/work accounting, exact
  kind metadata, case-insensitive primitive reservation and narrow phase tables.
- Preserved: public kind strings/types, plain JSON AST, node snapshots, font/run and
  XObject site identity, all-pages collection, resource allocator/names, service
  five/runtime seven capabilities, provider capture, default painting, clip and
  tolerance semantics, iterative quotas/cycles/order and output bytes.
- Not changed: JPEG parsing/profile/source, fonts/text engines, dependency manifests,
  layout-native bridges, unrelated worktrees, delivery state. Slice C remains.

See [architecture](../architecture/native-nodes.md) for phase applicability and
driver ownership. `core/xobject-measure.ts` is removed, not retained as a facade;
all live imports now use ownership/wiring. Packed-artifact controls reject stale
copies in every graph. Public NodeDefinition declarations remain in their original
files; accepted key tuples are checked against their respective public node types.

## Verification commands and results

All commands below ran in the cwd above against the actual uncommitted A+B scope.
These are Engineer checks, not independent verification.

| Command | Final result |
| --- | --- |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, Biome plus AST 400-line/49-line/depth-three checks |
| `npm run typecheck` | Pass, full workspace build and strict root compilation; final source additionally rebuilt by sizes and checked by `npx tsc --noEmit` |
| `npm test` | Pass, 881/881, zero skipped/cancelled |
| `npm run test:consumer` | Pass, 12 independent installed tarball closures, portable NodeNext/Bundler declarations, CJS/import identity in both orders |
| `npm run build:browser` | Pass, 12 actual emitted-JS browser targets |
| `npm run check:graphs` | Pass, 12 graphs and exact importer/export boundaries |
| `npm run check:licenses` | Pass, 11 actual library tarballs |
| `npx tsx --test tests/browser/browser-react.test.ts` | Pass, 1/1 with default system Chromium; Node/HTTP/browser PDF byte parity |
| `npx tsx scripts/check-current-docs.ts` | Pass, scoped local-file links |
| `git diff --check` | Pass |

The known default-Chromium SVG raster black-output qualification remains from
`/tmp/opencode/jpeg-b-browser-default.log` (10/11, sole SVG raster failure).
That known failing default suite was not retried or reported green. Full browser
raster/showcase/legacy suites were not rerun; caller-approved software-browser
qualification remains for parent integration. No check is running asynchronously.

Risk additions: six-kind actual compiled-owner instrumentation for validation,
measurement, painting, ink, lowering and applicable collection; AST/VDOM native
data/operator/resource parity; exact kind/case inventory; primitive reservation;
own-key/accessor/unknown-kind rejection; 256-deep iterative traversal, cycles and
command quotas; compile-negative missing-kind/wrong-kind phase controls; obsolete
artifact controls. Existing 873 tests retain geometry/path/source-origin, clips,
text CID registration and all resource/serialization coverage.

Non-final failures were fixed, not waived: the new invariant slot context initially
used `PaintingSlot<unknown>` instead of `PaintingSlot<PdfString>`; a test used a
nonexistent `prepareJpegResource` name; exact bridge-export guards rejected the
two planned metadata exports (879/880 test run and graph failure). The boundary
now inventories only those names from the exact metadata module, with no wildcard
or general internal-export allowance. Final tests/graphs/consumer gates pass.

## Early and final bundle/output proof

Frozen Post-A inputs/bundles/PDFs/tarballs:
`/tmp/opencode/updf-slice-a-current`. Matched f97 baseline:
`/tmp/opencode/updf-slice-a-f97-baseline`; archived source and isolated checkout
remain untouched. Early B: `/tmp/opencode/updf-slice-b-early`. Final B:
`/tmp/opencode/updf-slice-b-current` (`report.json`, `native-node-proof.json`,
`resource-name-proof.json`, eight bundles and ten PDFs).

Before all moves, XObject measurement was moved to its owner and selected through
a phase-local subset. Actual minified browser builds showed +45 raw/+8–17 gzip
bytes for runtime profiles, zero delta for both standalone measurers. The early
runtime owner/wiring retained contributions were 152/37 bytes; both were parsed
but retained zero bytes in standalone measurement. This justified widening.

Final exact, identical-input profiles:

| Profile | Post-A raw/gzip | Early B raw/gzip | Final B raw/gzip | Final delta vs A raw/gzip |
| --- | ---: | ---: | ---: | ---: |
| Drawing | 34,420 / 11,850 | 34,465 / 11,864 | 35,673 / 12,331 | +1,253 / +481 |
| Helvetica | 56,184 / 19,332 | 56,229 / 19,346 | 57,385 / 19,802 | +1,201 / +470 |
| Prepared | 60,457 / 20,559 | 60,502 / 20,575 | 61,658 / 21,119 | +1,201 / +560 |
| Font measurement | 24,285 / 8,586 | 24,285 / 8,586 | 24,345 / 8,617 | +60 / +31 |
| Fontkit | 433,725 / 174,015 | 433,770 / 174,023 | 434,928 / 174,468 | +1,203 / +453 |
| Host measurement | 20,735 / 7,199 | 20,735 / 7,199 | 20,795 / 7,222 | +60 / +23 |
| JPEG | 40,978 / 14,309 | 41,023 / 14,325 | 42,230 / 14,808 | +1,252 / +499 |
| Mixed JPEG/prepared | 66,697 / 23,174 | 66,742 / 23,191 | 67,900 / 23,584 | +1,203 / +410 |

Final profiles parse 11 node modules. Runtime profiles retain ten (drawing: 5,645
bytes of relocated policy/helpers/wiring/metadata, not 5,645 bytes of net growth).
`native-fields` is unused and retains zero in those render-only profiles. Both
standalone measurers retain only 104 bytes attributed to `metadata.js`, including
the frozen inventory initialization; all owner handlers and wiring retain zero.
No retained content/PDF writer/painting emitter appears in either measurer. Input
module presence is explicitly distinguished from retained code. Full before/early/
final contributions are in their reports; old policies lived in drivers before B.

Drawing stays free of optional fonts/text/JPEG; existing profiles exclude JPEG;
JPEG-only excludes fonts/text/Fontkit; Fontkit stays optional. No source aliases or
Node/CJS browser inputs. The largest B gzip delta is 560 bytes, below the caller's
1 KiB re-evaluation threshold; drawing grows about 4.1% versus matched Post-A.
Compared with actual f97 drawing (11,675 gzip), A+B adds 656 gzip bytes. The older
11,537-byte reference is not this matched f97 workload and is not used as a
substitute baseline or claimed hard quota.

```sh
npx tsx scripts/sizes.ts . current /tmp/opencode/updf-slice-b-current
npx tsx scripts/consumer/resource-name-proof.ts /tmp/opencode/updf-slice-a-f97-baseline /tmp/opencode/updf-slice-b-current
npx tsx scripts/consumer/native-node-proof.ts
```

The inherited proof passes six real PDFs through qpdf, name/reference-normalized
f97 object equality, exact raster/extraction and measurement DTO comparison. The
B proof also asserts exact Post-A bytes for all six profile PDFs. It installs
frozen A tarballs into `/tmp/opencode/updf-slice-b-post-a-kIlo4d` and bundles the
same six-kind native source on both sides. Four workloads (root, translated clip,
nested rotated/ancestor clip and wholly hidden clip) have exact PDFs, lowered ASTs,
ink and diagnostic code/path/message parity; four additional PDFs pass qpdf.
Baseline Post-A artifacts are read, not overwritten, by the B proof.

## Complete uncommitted manifest and ownership

Inherited A modified files (B shares only the four noted above):

```text
docs/architecture/resource-providers.md
docs/migration/fonts-text.md
packages/core/API.md
packages/core/README.md
packages/core/src/core/document-resources.ts
packages/core/src/core/resource-types.ts
packages/core/src/painting/alpha.ts
packages/core/src/resources.ts
packages/core/test/document-resources.test.ts
packages/core/test/resource-providers.test.ts
packages/core/test/text-paint.test.ts
packages/core/test/xobject.test.ts
packages/fonts/src/cids.ts
packages/fonts/src/provider.ts
packages/fonts/test/provider.test.ts
packages/jpeg/src/index.ts
packages/jpeg/test/render.test.ts
packages/text/test/host-runtime.test.ts
scripts/boundaries.ts
scripts/consumer/jpeg.ts
tests/consumer/types/runtime-template.ts
tests/integration/text-paint-names.test.ts
```

Inherited A untracked files, unchanged by B:

```text
docs/evidence/core-resource-names-slice-a.md
packages/core/src/core/resource-definition.ts
packages/core/test/resource-names.test.ts
scripts/consumer/resource-name-proof.ts
```

B-exclusive tracked changes (modified unless marked deleted):

```text
docs/architecture/packages.md
docs/native-packaging.md
packages/core/src/core/content.ts
packages/core/src/core/ink.ts
packages/core/src/core/measure.ts
packages/core/src/core/validate.ts
packages/core/src/core/xobject-measure.ts (deleted)
packages/core/src/internal-drawing.ts
packages/core/src/vdom/create.ts
packages/core/src/vdom/measure-output.ts
packages/core/src/vdom/native.ts
packages/core/src/vdom/registry.ts
scripts/consumer/core-artifacts.ts
```

B untracked files:

```text
docs/architecture/native-nodes.md
docs/evidence/native-node-owners-slice-b.md
packages/core/src/nodes/context.ts
packages/core/src/nodes/drawing.ts
packages/core/src/nodes/geometry.ts
packages/core/src/nodes/line.ts
packages/core/src/nodes/metadata.ts
packages/core/src/nodes/native-fields.ts
packages/core/src/nodes/paint-group.ts
packages/core/src/nodes/path.ts
packages/core/src/nodes/rectangle.ts
packages/core/src/nodes/rich-text.ts
packages/core/src/nodes/wiring.ts
packages/core/src/nodes/xobject.ts
packages/core/test/node-phase-types.test.ts
scripts/consumer/native-node-input.ts
scripts/consumer/native-node-proof.ts
tests/consumer/native-node-artifacts.test.ts
tests/integration/native-node-owners.test.ts
```

## Self-check and next owner

Universal checklist satisfied: correctness validated; no avoidable unsafe patterns;
defaults followed; cohesive production files below 400 lines; functions at most
49 lines and nesting at most three; comments explain intent/invariants; risk-based
tests added; lint/tests pass. No new approved code-principles exception. Changesets
are not used in this repository. Browser qualification above is not a new source
exception or a claim of a full browser-suite pass.

Slice B is **implemented**, not independently verified. Tracker state: N/A,
unchanged. Remaining assignment acceptance: none for B; C and the integrated
independent audit/delivery are not B completion claims. Auditor should review the
actual combined uncommitted manifest, discriminator assertions, group scheduling/
clip semantics, resource-site identity and tree-shaking evidence after C.

Next bounded slice: Builder assigns C to consume the exact shallow
`isNativeNodeKind`/`nativeNodeKinds` metadata from the existing internal-drawing
boundary in layout's native bridges. Example: `isNativeNodeKind(value.type)` can
narrow a kind but must not replace own-data validation or origin/budget checks.
Do not import owners/wiring through new public/internal paths or duplicate
kind-specific leaf policies. No Git or delivery authority is implied by handoff.
