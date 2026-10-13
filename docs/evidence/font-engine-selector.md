# Showcase Fontkite / Fontkit selector

Ad-hoc tracker N/A. YOLO implementation and self-validation, not independent audit.
Worktree `/home/sprawl/projects/updf/trees/font-engine-selector`, branch
`feature/font-engine-selector`, clean starting base/HEAD
`45bdd8bc777cb7bc7a02f8e77405191f613d9fda` (Fontkite PR #77 head).
All changes in this follow-up are uncommitted. No staging, push, PR, merge,
publication, deployment, or upstream issue posting was performed.

At the start of this slice, all three checks on PR #77 were successful. That CI
result belongs to the existing Fontkite PR, not this uncommitted selector change.
The newer PNG integration on its parent branch was not merged into this worktree;
the eventual stacked PR/merge result needs its own CI validation.

## Behavior and scope

- Add a native, labelled **Font engine** select to the font-URI demo. Fontkit stays
  the default; Fontkite is explicitly marked lightweight/experimental.
- Two small browser entry modules dynamically load the selected public `/load`
  export. Core, other demos and the font sample document API remain unchanged.
  Freight continues to use Fontkit.
- Reuse one successful URI's byte snapshot across engine changes, keeping up to
  one successful prepared handle per engine. Never reuse another engine's handle
  as though it came from the selected backend. Failed loads/preparation/rendering
  do not replace the last successful cache entry.
- Treat URI/engine proposals separately from the active successful pair. URI
  drafts load only on Generate PDF. Engine changes use the active URI, not a draft.
  Ordinary title/size/resize updates keep using the active engine after a failed
  switch. Reset restores the bundled sample and Fontkit.
- Preserve cancellation through the added lazy-import boundary. Abandoned engine
  imports cannot start a late font request. Engine changes cancel a pending URI
  replacement before preparing the active bytes.
- Show the actual successful engine, approximate preparation time or prepared-handle
  reuse in the result summary and the engine in the captured source arguments.
  Timing excludes module loading, font transport and PDF layout/rendering; it
  includes the adapter's byte copying/validation and preparation. It is not a
  controlled benchmark or a claim that one engine is universally faster.
- Keep the displayed source complete: sample document, controls, loader, both
  lazy entry modules and cache/demo glue are shown verbatim.

There is no automatic fallback. Selecting both engines during a session naturally
leaves both modules in the browser's module cache. In particular, opening the demo
normally starts Fontkit because it is the retained default; switching to Fontkite
later cannot undo that download. The cold Fontkite test simulates a slow initial
demo module, allowing a real UI selection to supersede the default before either
engine begins loading. It does not claim that normal default entry is Fontkite-only.

Implementation files are limited to `apps/showcase/` controls/loading/UI/dependency
wiring, the root showcase build command and lock entry, documentation, and tests.
No font parser, PreparedFont, core runtime, layout or PNG implementation changed.
No font assets or generated screenshots were added to the repository.

## Verification

Two new network-free state/validation tests cover active versus proposed settings,
successful activation, reset, and rejection of unknown engine names.

Five new production Chromium tests cover:

1. Cold explicit Fontkite selection with **no Fontkit implementation requests**,
   followed by Fontkit selection as a positive control; same remote bytes are fetched
   once, each backend's output matches its Node reference, returning to an engine
   reuses its own handle, and reset restores the default.
2. A failed engine-module request preserves bytes/source/active state; a later title
   edit uses the old engine rather than retrying the failed proposal.
3. A malformed URI font under Fontkite never loads Fontkit, preserves the previous
   result, and retries the failed URI only on explicit submission.
4. Leaving the example during a held engine import prevents any later font request.
5. Changing engine during a held URI request aborts it, uses active bytes, and ignores
   the late response.

The emitted graph asserts both engines are dynamic children of the font-URI module,
neither parser is in its static closure or the initial entry, and each engine's
static closure excludes the other. The Fontkite closure excludes Fontkit/Brotli/
restructure/Unicode-data dependencies. The browser negative assertion derives real
Fontkit chunk names from the emitted graph and confirms those chunks do load when
Fontkit is explicitly selected; it is not a filename guess with no positive control.

Desktop and 320px mobile tests check rendering, retained Blob/download lifecycle,
captured arguments, and no horizontal overflow. Screenshots were saved under
ignored `artifacts/showcase/font-engines-{desktop,mobile}.png`; the mobile view was
also inspected directly. Test HTTP routes use existing licensed fixtures, not a
live external font service.

| Exact command | Final outcome |
| --- | --- |
| `npm run format:check` | pass |
| `npm run lint` | pass, including AST size/nesting gates |
| `npm run typecheck` | pass, full package build and workspace checking |
| `npx tsc --noEmit` | pass after final test-copy update |
| `npm test` | **1,071 pass**, zero failures/skips/cancellations |
| `npm run build:showcase` | pass, production assets/graphs/notices |
| `npm run test:showcase` | **95 pass**, zero failures/skips/cancellations |
| `git diff --check` | pass |

The first full showcase run had 94 passes and one assertion still expecting the
old Fontkit-only explanatory copy. The assertion now checks both explicit choices
and the parser-free entry; the complete suite was rerun successfully without
waiving any gate. The root suite's existing arithmetic negative control emits an
intentional esbuild diagnostic inside a passing test.

No fresh live Google Fonts smoke test, external corpus/oracle run, standalone
non-showcase browser suite, or library-size benchmark is claimed for this UI-only
slice. Existing parser/profile limitations remain. Chunk files are not additive
gzip package-size measurements, and module import is not cancellable after it has
started; the guards prevent stale preparation/activation, not all network traffic
from an already requested module.

Principles self-check: cohesive bounded files/functions, explicit engine selection,
no unsafe fallback, preserved unrelated work, risk-based regression tests, no new
numerical contracts, no suppressions or principles exceptions. No Changesets setup;
the showcase and packages remain private/unpublished.

**Status:** implemented and locally validated, ready for review and authorized
delivery as a follow-up to #77. Next technical priority is broader real-font and
malformed-input coverage before extending formats or implementing subsetting.
