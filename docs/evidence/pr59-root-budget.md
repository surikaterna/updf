# PR #59 review fix: exact root framing before stream snapshots

## Delivery manifest

- Objective: eliminate the private writer's object-one trailer estimate when the
  selected root has multiple digits, without conservatively rejecting exact caps;
  repair the audit finding that pre-root `add()` rejection stranded a reservation.
- Review target: PR #59 (open, base `develop`, per assignment); issue ID: N/A.
- Worktree: `/home/sprawl/projects/updf/trees/pdf-resource-writer`.
- Branch: `feature/pdf-resource-writer`.
- HEAD / implementation starting revision:
  `c54e920cfa7adb8e75bfccbce459fcb8920d6f54` (unchanged).
- Prior base supplied by caller: `b1f3eeca4888bb8e63895256af35a330b2ad19e0`.
- Local `git merge-base HEAD develop`:
  `7782bb3ba468a721ef7bd68fedd19b8f6c029d16`.
- The original implementation started clean. This audit-fix assignment changed
  exactly the four listed production/test files and this evidence file. The
  serializer/integration edits migrate the existing caller to the selected-root
  contract and verify that integration; the PR's original feature scope is
  otherwise unchanged. No unrelated files, tracker edits or nested agents.

## Contract and bounded changes

`PdfWriter.setRoot(ref)` selects an owned, reserved reference exactly once, before
any definition can snapshot values or stream bytes. It checks complete framing
before recording the selection. Until selection, only empty reservations are
possible; their object framing is capped, and selection then checks the exact
xref/trailer cost. After selection, reservations and definitions budget against
the same immutable root identity that argument-free `seal()` emits. Unresolved
references still reject at seal; foreign/invalid roots, missing selection,
reselection and post-seal use reject. A failed selection does not set the root.
`add()` checks open/root state before reserving, so lifecycle rejection changes
neither numbering nor budget. Repeated pre-root rejection can be followed by root
selection, definitions and seal with byte-identical output to a clean control.

The private writer is not a general transaction API: once rooted `add()` reserves,
an invalid-value or definition-budget error can leave an unresolved reservation
whose handle was not returned. Callers must discard that writer after such errors.
This pre-existing failure behavior is now documented on `add()`; it is not repaired
or presented as mutation-free. Explicit `define()`/`defineStream()` callers retain
their reserved handle and can retry ordinary validation/budget failures. No broad
rollback contract or transaction API is introduced in this bounded fix.

This preserves arbitrary owned roots rather than restricting the private writer
to the current production object-one catalog. It avoids both a late snapshot
allocation and a conservative maximum-root estimate that would reject exact
caps. There is no package-export/public API addition and no obsolete `seal(root)`
compatibility path or hardcoded object-one framing alternative.

Changed files:

- `packages/core/src/core/pdf-writer.ts`: selected-root lifecycle and exact budget;
  open/root checks before `add()` reserves and private failure-semantics comment.
- `packages/core/src/core/serialize.ts`: select the existing catalog immediately
  after reservation; seal without arguments. Object order and emitted syntax
  remain unchanged.
- `packages/core/test/pdf-writer.test.ts`: migrate all callers and add five tests
  for roots 10/100, root lifecycle, selection-time framing budget and mutation-free
  pre-root rejection/recovery at the clean control's exact cap (191 bytes).
- `tests/integration/pdf-writer.test.ts`: instrument root selection and verify
  catalog identity, the same writer and argument-free seal, retaining all font,
  alpha, page and stream assertions and exact production caps.

No registry, ResourceProvider, Helvetica behavior, font/alpha wiring, imports,
goldens, raster thresholds or dependency changes. No Changesets system is used.

## Validation

Commands below were rerun in this audit-fix assignment in the worktree above
against unchanged HEAD plus this diff, except where explicitly marked historical.

| Command | Outcome |
| --- | --- |
| `npm run build -w @updf/core` | PASS |
| `npx tsx --test --test-name-pattern="pre-root add rejection" packages/core/test/pdf-writer.test.ts` (before fix, after core build) | Expected FAIL, 1 test: hidden reservations caused `setRoot()` to exceed the clean control's 191-byte cap |
| `npx tsx --test packages/core/test/pdf-writer.test.ts tests/integration/pdf-writer.test.ts` | PASS, 15 tests |
| `npx tsx --test packages/core/test/pdf-writer.test.ts packages/core/test/render.test.ts packages/core/test/policy.test.ts packages/core/test/font-resources.test.ts packages/core/test/content-ownership.test.ts tests/integration/pdf-writer.test.ts` | PASS, 46 focused/adjacent tests |
| `npm run typecheck` | PASS, including full workspace build |
| `npm test` | PASS, 709 tests; 0 failed/skipped/cancelled (inherited implementation count 708) |
| `npm run format:check` | PASS |
| `npm run lint` | PASS, Biome and code-principles ESLint |
| `npm run check:graphs` | Prior implementation PASS, all 12 browser graphs; not rerun in this fix, imports unchanged |
| `git diff --check` | PASS |

Risk-based additions prove roots 10 and 100 succeed at the exact byte cap and
reject cap-minus-one specifically in `defineStream`, before the binary input's
iterator is accessed (zero copies); the successful exact-cap run accesses it once.
Existing mutable snapshots, xref offsets, ownership, duplicate/unresolved refs,
large chunk counts and post-seal tests remain. Full integration retains real
qpdf/Poppler parsing, extraction and raster checks, historical Helvetica bytes
and default CMR digests. No golden or threshold changes were made.

The original lifecycle test asserted rejection but did not prove recovery; the
prior correctness claim did not cover this state-mutation bug. The new regression
rejects pre-root `add(null)` twice, selects the existing root, adds object 2, defines
the root and seals at the exact clean-control cap, then compares all emitted bytes
and checks `/Child 2 0 R`. It also confirms post-seal `add()` reports sealed state.
The fix adds no compatibility branch, dead helper or alternative accounting path;
both guards use existing live lifecycle helpers. Caller-reported independent audit
evidence (252 boundary probes / 57 tests) applies to the inherited root-budget
scope, not to this fix, and was not rerun or counted as this assignment's checks.

Two historical implementation check failures were corrected and rerun: an unsupported Node mock
`invocationCallOrder` assertion was removed, and Biome's void-return rule was
satisfied with an explicit guard return. Full tests print an expected malformed
arithmetic build diagnostic from an existing negative control; the test and suite
pass. Hosted SVG checks #48/#50 are caller-reported existing failures, not rerun
or repaired in this bounded scope; they are not silently counted as passing.

## Code-principles self-check and handoff

- [x] Correctness validated for this slice: root budgeting precedes binary snapshot
  allocation and lifecycle `add()` rejection is mutation-free. Pre-existing rooted
  definition-error semantics are documented, not claimed to be transactional.
- [x] Strong defaults followed; no approved exception, suppression or gate waiver.
- [x] Files remain cohesive and below 400 lines, including modified tests.
- [x] Functions below 50 lines and nesting within three levels; ESLint passes.
- [x] Comments explain lifecycle/budget invariants only.
- [x] Tests added proportional to allocation/lifecycle risk.
- [x] Format, lint, typecheck and full tests pass.

Status: implementation independently audited and verified for the actual five-file
scope described above. Reviewer should inspect recovery after pre-root rejection,
sealed error precedence, exact trailer accounting for multi-digit roots and the
consumer migration. Rooted definition rollback is intentionally out of scope; any
future change needs a fresh assignment. No issue state was changed.
