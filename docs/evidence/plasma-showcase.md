# Amiga-style vector plasma — implementation, not independent verification

Date: 2026-10-03. Tracker: N/A. No commit, staging, push, PR, deployment or package
changes were authorized or performed. Independent audit is the next step.

## Delivery identity and scope

- Worktree/cwd: `/home/sprawl/projects/updf/trees/plasma-showcase`
- Branch: `feature/plasma-showcase`
- Base and unchanged HEAD: `30900d53c5b241ccafdb9f6eb87b89b63a53059b`
- Delivery is unstaged tracked edits plus untracked new files, not a committed diff.
- New `apps/showcase/plasma.html`, `src/plasma/{frame,worker-session,renderer,controller,main}.ts`
  and `styles.css`; showcase link and multi-entry Vite input; semantic graph tests;
  plasma-specific unit/browser helpers/tests; `scripts/plasma-measure.ts`; these docs.
- Existing preview implementation, core/library APIs, dependencies, lockfile and
  existing examples are unchanged. Optional PDF download was intentionally omitted:
  frames retain rendered canvases, not an additional queue of PDF bytes.
- No Changeset: the repository does not use Changesets; no publishable package changed.

## Runtime contract

Every frame has deterministic phase `frameIndex / 25`, using a precomputed 256-color
opaque hex palette and spatial terms. A fresh SVG with 640 rectangles (32×20 cells)
goes through `renderSVG`, core `render`, a fresh single-page 320×200 PDF, then PDF.js.
The backing canvas is always 320×200, independent of DPR; CSS supplies responsive
pixelated retro scaling. There is no image/raster input, direct animated canvas
painting, autoplay, CDN, new dependency, or change to the existing preview.

Play imports the runtime. One native module Worker and one external PDFWorker live
for a session. PDF.js 6.3.289 accepts sequential fresh loading tasks on that worker;
document `destroy()` does not destroy a caller-supplied worker. The tests prove pixel
change across 40 presented frames with only one worker created. Readiness checks
`sourceName: worker`, `targetName: main`, `action: ready`; initialization is abortable
and times out after 10 seconds. Reset during initialization terminates immediately,
even before a held network response is released. Teardown cancels rendering and
destroys the current document. All document cleanup, including production and error
paths, has a 1-second bound for unacknowledged teardown. Timeout terminates and
invalidates the session worker and rejects production with a readable error;
if rendering already failed, that original diagnostic is preserved.
Repeated disposal is idempotent. Canvas backing stores are cleared on release/reset,
including the in-flight canvas before a stalled teardown finishes.

One sequential producer prefills the queue and yields between conversions. Queue
capacity is an integer 1–50 (default 10), excluding displayed and in-flight canvases:
at most capacity + 2 retained frame canvases. Production stops at capacity. Pause
stops new conversions but permits the existing one to finish into the queue.
Presentation starts after prefill at 40 ms rAF deadlines, advances ordered frame
indices, and displays at most one per callback. Empty slots hold the previous frame
and count underruns. Missed scheduling slots count separately as late slots; no burst
catch-up. Resume sets a fresh deadline. Hidden tabs auto-pause and require explicit
resume. Reset invalidates pending imports/session callbacks, clears resources/stats,
and enables buffer changes. Pagehide resets; pageshow stays stopped.

Presentation FPS uses active playback time, excluding prefill/paused time. Pipeline
FPS uses summed active conversion durations, excluding paused intervals, queue-full
waiting and between-conversion yields. Prefill duration excludes pauses and starts
when the session is constructed (not when the lazy import first starts). Displayed
frame stage samples report combined SVG/adaptation/core generation and PDF.js load/
page/raster time; document teardown is included in pipeline time but not raster time.
These are DOM presentation counts, not physical monitor-scanout measurements.

## Reproduce measurements

From the delivery cwd, with Node 24, installed Chromium, qpdf and Poppler:

```sh
npm ci --ignore-scripts
npm run build:showcase
npx tsx scripts/plasma-measure.ts
```

The script serves the actual production `/updf/` assets through Vite preview. It
uses separate pages sequentially for capacities 1, 10, 50, waits for first
presentation (after prefill), measures 60 seconds each, pauses, and prints JSON.
No machine-dependent CI FPS threshold is introduced. `SHOWCASE_CHROMIUM` can select
a different installed browser. Other applications/system scheduling affect results.

Pre-remediation runtime measured locally: Linux `7.1.9-arch1-2` x86_64; AMD Ryzen 7 9800X3D
(8 cores / 16 threads); Node 24.21.0 / npm 11.19.0; Playwright 1.55.1 with installed
headless Chromium 152.0.7977.82. One foreground-visible page, 1000×800 CSS viewport,
default DPR 1; 320×200 actual backing resolution, 32×20 cells. This is **not real
mobile performance**, a headed desktop display test, or a 25 fps guarantee.

| Extra buffer | Prefill ms | Measured active ms | Presented fps | Active pipeline fps | Underruns | Late slots | Native workers created/live | Final queue |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 1 | 110.8 | 60067.7 | 14.97 | 28.12 | 602 | 0 | 1 / 1 | 0 |
| 10 | 426.3 | 60068.9 | 24.99 | 29.53 | 0 | 0 | 1 / 1 | 9 |
| 50 | 1759.7 | 60071.7 | 24.99 | 29.52 | 0 | 0 | 1 / 1 | 49 |

Mean displayed-frame stage times, generation / PDF.js raster respectively:
buffer 1: 16.24 / 18.57 ms; buffer 10: 16.07 / 17.07 ms;
buffer 50: 15.86 / 17.31 ms. Workers are still intentionally alive at the paused
measurement snapshot; reset/pagehide disposal is separately tested.

The first earlier full 60-second run measured 15.00 / 24.96 / 24.61 presentation fps
for buffers 1 / 10 / 50; buffer 50 had 18 underruns and 5 late slots. The final run
above includes the final in-flight resource-release behavior. Variability is real:
a bigger buffer is not universally faster. Buffer 1 frequently misses a slot because
of the PDF.js/rAF production and presentation scheduling phases, despite a mean
pipeline rate above 25. A buffer cannot fix sustained production below target.
The default 10 was retained; the initial modest grid did not require tuning.

## Initial implementation quality evidence

All commands below were run in the delivery cwd on the unchanged HEAD plus the
uncommitted implementation scope:

- `npm ci --ignore-scripts`: passed; no manifest/lockfile changes.
- `npm run format` and `npm run format:check`: passed; formatting restricted in
  effect to task-owned files (no unrelated edits).
- `npm run lint`: passed (Biome and authoritative ESLint principles checks).
- `npm run typecheck`: passed, including root build and legacy compilation;
  `npx tsc --noEmit` also passed after the last browser-test additions.
- `npm test`: passed, 93 tests.
- `npm run build:showcase`: passed, both HTML entries, native builds and site typecheck.
- `npm run test:showcase`: passed, 30 tests; covers existing showcase
  regressions plus vector/PDF generation, actual pixel change, persistent worker,
  bounded queues at both extremes, in-flight/pause/reset/stale lifecycle, readiness
  cancellation/timeout, stalled teardown, raster cancellation/failure, hidden-tab
  pause, invalid settings, mobile-layout/DPR emulation and `/updf/` assets.
- `npm run build:browser` and `npm run test:browser`: passed, 3 existing browser tests.
- `npm run check:graphs`: passed after building its required browser fixtures.
  Showcase semantic transitive static/dynamic closure is also checked in showcase
  tests, avoiding brittle single-entry/exact-chunk-count assumptions. Both lazy
  SVG/core boundaries and forbidden dependencies remain enforced.
- `npm run check:licenses`: passed, all 5 real package tarballs and notices;
  showcase notice byte identity is covered by showcase tests.
- qpdf/Poppler: `plasma-frame.test.ts` invokes `qpdf --check` and `pdfinfo` on
  `artifacts/showcase/plasma-{0,25}.pdf`; both passed, one 320×200 page each.
- `npx tsx scripts/plasma-measure.ts`: passed twice, all 3 buffers measured for
  the requested 60 seconds without shortening.
- Final Git checks: `git diff --check` passed; `git status --short --untracked-files=all`
  showed exactly 5 modified tracked files and 14 task-owned untracked files listed
  in the scope above. `git diff --cached --stat` was empty; `git log --oneline
  30900d53c5b241ccafdb9f6eb87b89b63a53059b..HEAD` was empty. `git rev-parse
  --show-toplevel`, `git branch --show-current`, and `git rev-parse HEAD` confirmed
  the delivery identity above. No staged or newly committed scope exists; generated
  builds, artifacts and installed dependencies are ignored, not delivery files.

Intermediate failures were corrected, not waived: exact-optional-property and
browser element/timer typings; one import-order check; a test fixture function
over the line limit; and cancellation-test polling accidentally dependent on its
deliberately held rAF. Root graph check initially lacked generated browser graph
fixtures; `build:browser` supplied them. No failures remain accepted as exceptions.
The separate inherited raw legacy test suite/dependency audit was not rerun or
claimed green; this task does not alter that documented baseline.

## Code-principles self-check / audit handoff

- Correctness validated with risk-based deterministic and production-browser tests.
- Cohesive modules; production files ≤400 lines, functions <50, nesting ≤3;
  authoritative ESLint gate passes. No approved or requested exceptions.
- Comments explain external-worker ownership and bounded cancellation, not syntax.
- Scope limited to the additional showcase; no new issue or tracker mutation.
- Formatting, lint, typecheck, unit/build/browser/graph/license gates pass.

Auditor should inspect the actual unstaged **and untracked** delivery, especially
shared-worker ownership, cancellation while initialization/teardown is held,
capacity + 2 resource bounds, pause/FPS accounting, lazy transitive boundaries,
and modest performance claims. Real-device mobile and headed physical-display
performance remain unmeasured. Status: **implemented**, not verified or deployed.

## Audit remediation — production cleanup deadlock

The independent Auditor requested changes for the combined case of a rendering
failure and withheld worker `Terminate` acknowledgment. In the initial code,
`produce()` awaited unbounded document teardown in `finally`, so playback never
received the rendering error and could not reach its bounded disposal fallback.
The Auditor's reproduction was still prefilling after 11 seconds with one worker
and no visible error. Separate failure and Reset/teardown tests did not cover this
combination. The remaining scope was accepted for this remediation assignment;
this is not a claim that the corrected delivery has passed re-audit.

Changed only these existing task-owned files for the remediation:

- `src/plasma/worker-session.ts`: bound the cached `cleanDocument()` promise
  itself. On timeout, idempotently terminate/abort the worker session before
  rejecting. `dispose()` shares that same bounded promise. Normal successful
  teardown still preserves the persistent worker for the next frame.
- `src/plasma/renderer.ts`: preserve the original rendering error when cleanup
  also fails; a teardown-only timeout still becomes the production diagnostic.
  Existing canvas/resource clearing remains in place.
- `src/plasma/controller.ts`: clear `inFlight` before publishing terminal error
  metrics, not only in the subsequent `finally` block.
- `tests/showcase/plasma-lifecycle.test.ts`: two production-browser regressions
  with actual teardown acknowledgments withheld, one with injected `getContext`
  failure and one after successful rasterization. Both assert visible terminal
  error within 3 seconds, zero workers/canvases/queued or produced frames,
  `inFlight: false`, disabled Play and no new worker, **without Reset**.
- This evidence document records the correction and its checks.

Same delivery cwd, branch and unchanged base/HEAD as above. No Git/tracker mutations
or unrelated scope changes. Final remediation gates:

| Exact command | Result |
| --- | --- |
| `npm run format` | Pass; 3 remediation source/test files formatted |
| `npm run format:check` | Pass |
| `npm run lint` | Pass, including file/function/nesting limits |
| `npm run build:showcase` | Pass, production multi-entry build and site typecheck |
| `npx tsx --test tests/showcase/plasma-lifecycle.test.ts` | Pass, 7 tests |
| `npm run typecheck` | Pass, including root build |
| `npm test` | Pass, 93 tests |
| `npm run test:showcase` | Pass, 32 tests, including existing preview regressions |
| `npm run check:graphs` | Pass |
| `npm run check:licenses` | Pass |
| `git diff --check` | Pass |

No fresh performance claim is made for this correction. The earlier 60-second
measurements above remain labeled pre-remediation evidence; rerunning them or the
unchanged non-showcase browser suite was not needed for this narrowly scoped
cleanup/error-path fix. The supplied Auditor baseline additionally recorded a
20-second default-buffer probe: 24.98 presentation fps, 29.44 pipeline fps, zero
underruns, 512 fresh PDFs/Terminate requests, one worker, maximum 11 canvases and
zero after Reset. Those are supplied independent observations before this fix,
not measurements performed in this remediation session.

Self-check: all universal checklist items satisfied; no approved exceptions.
Risk-based tests now combine the failure modes rather than testing them separately.
Status: **implemented, ready for re-audit**, not independently verified. Auditor
should reproduce the combined failure without Reset and inspect timeout-driven
worker invalidation, original-error preservation and successful worker reuse.
