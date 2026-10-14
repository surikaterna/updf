# SVG authoring integration and shared atomic fit

PR #68, issue #47. Isolated worktree `trees/svg-merge-ready`, local branch
`feature/svg-merge-ready`. Starting PR head `e813bab4789fe3fe2e750732e6919fc562ab6e00`
is integrated with develop `c6a672961db89107daeeb27e06fe5f8d55e596cf` without rewriting
the published branch. The separate local mixed-JSX follow-up at `dea9362` is not
included. Git/PR history records the eventual delivery revision. No merge to
develop, deployment or release is authorized by this preparation.

## Reconciliation and numerical decision

The packed-consumer conflict is resolved using the current `layout-boxes` name and
font-loader asset dependency, retaining all fourteen SVG absent/present-layout and
other consumer combinations. The integrated showcase retains the font, PNG and
barcode work while using the public SVG block/inline adapters. No third-party
runtime dependency or broad SVG feature expansion is added.

The initial review conflated metric fit with exact native placement. At origin 0,
0.1 + 0.2 cannot be certified inside the literal native endpoint 0.3 without changing
geometry. Replacing `>` with a tolerant test alone admitted a candidate that then
failed the native certificate. The numerical package already owns both contracts;
the user authorized coordinating the shared host, not weakening certificates.

The delivered change carries private parent-fit/placement context through stacks,
containers, Rows, decorations and natural measurement. Atomic adapters may receive
their measured natural height as available capacity only when original metric and
native checks certify it, even if a subtraction rounded the remaining scalar down.
Returned heights, previous native bottoms and enclosing native bounds are checked
again before native-node copying. Unplaceable atomic
output defers during selection; painting/callback failures are not caught and retried.
The public five-field fragment request remains immutable and unchanged in shape.

`MetricSum.fork/preview` preserve the accumulator's hidden compensation instead of
reconstructing tentative occupancy from its rounded value. The recurrence and
`exceeds` formula are unchanged. The immutable historical arithmetic fixture/hash
remains intact: source/executable preservation explicitly admits only the pinned
new methods, and negative controls reject mutations in both formulas and snapshots.
This is a deliberate additive API change, not a disabled preservation test.

`fitsMaterialized` in the existing kernel geometry entry performs the same exact
native association as `materializedStart`, with invalid-domain rejection. It does
not mint a DerivedAxis or permit an approximate fit to bypass a native certificate.
Decoration cancellation records its real local subtraction operands; independent
ancestor/native bounds remain active. Authored geometry is not resized, clamped,
shifted, clipped or extended. Explicit hidden overflow remains explicitly authored.

| Fixed target heights | Body height / origin | Before | Integrated |
| --- | --- | ---: | ---: |
| 4.9, 0.1 | 5 / 0 | 2 pages | **1 page** |
| 1.2, 1.1 | 2.3 / 0 | 2 pages | **1 page** |
| 0.1, 0.2 | 0.3 / 0 | 2 pages | **2 pages**, native certificate retained |
| 10.3, 10.3, 10.3 | 30.9 / 0 | 2 pages | **2 pages**, no forced fit |
| 10.3, 10.3, 10.3 | 30.9 / 700 | 1 page | **1 page**, actual native association fits |

Coverage includes direct and nested Blocks, Row/Column, explicit hidden clipping,
fractional decorations/footer bounds, power-of-two scales, a non-SVG atomic adapter,
unchanged width/progress/target sizes, immutable request shape, tentative refusal,
and retained output quotas. Actual red/blue target PDFs pass qpdf and yield identical
direct/nested Poppler rasters at 720 DPI. Chromium and Node produce identical page
counts/PDF bytes through emitted public APIs.

## Bundle impact

Node 24.21.0, esbuild 0.28.2, browser ESM, ES2022, minified whole-bundle gzip.
`tests/consumer/svg-cost-profiles.test.ts` and `svg-string-cost.test.ts` remain
history-independent and verify dynamic red/blue XML/TSX geometry/PDF equivalence.

| Consumer | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| No SVG: core render | 35,558 | 12,272 |
| XML prepare/place/render | 63,546 | 21,991 |
| TSX prepare/place/render | 62,067 | 21,435 |
| Both inputs | 67,453 | 23,116 |
| SVG layout helper exports | 130,601 | 42,041 |

The original XML compile-only operation remains +777 minified / +318 gzip bytes;
the same old XML-to-PDF operation remains +330 gzip bytes. Core-only is unchanged.
The broader shared-fit fix is not free for layout consumers: the same
`layout/createExtensions` export closure is 50,800 gzip bytes versus 49,709 at
develop (+1,091). Layout + XML + SVG adapter exports is 61,237 gzip bytes versus the
review's 60,152 before the shared fix (+1,085). These are fixture-specific measurements,
not additive module costs or approved #32 regression thresholds.

## Validation

| Exact command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | pass |
| `npm run format:check` | pass |
| `npm run lint` | pass, including size/function/depth gates |
| `npm run typecheck` | pass, full workspace build and checks |
| `npm test` | **1,168 pass** after the Unicode follow-up, zero failures/skips/cancellations |
| `npm run test:consumer` | **fourteen** clean external closures pass |
| `npm run check:licenses` | **fifteen** tarballs pass |
| `npm run build:browser && npm run check:graphs` | **twelve** emitted fixture graphs pass |
| `npm run test:browser` | **15 pass**, including fractional SVG and the full SVG reference suite |
| `npm run build:showcase && npm run test:showcase` | build and **101 tests pass** |

The first parallel browser run produced an entirely black Chromium native SVG
reference canvas while the UPDF/Cairo raster was correct. The unchanged reference
test passed in isolation. The root browser command is now serialized, matching
CI's browser execution model; all cases still run, and no raster tolerance or
assertion was weakened. The subsequent full serialized suite passed. The existing
font-browser large-chunk warning and intentional arithmetic-negative-control
esbuild diagnostic remain visible; neither is a silent waiver.

YOLO self-validation, not independent audit. No file/function/nesting exceptions
or new numerical epsilon. The additive source-certificate expectation is documented
above; all historical math and executable protections remain checked. Packages
remain private/unreleased and no Changesets setup is present. Hosted CI must pass
on the delivered head before the PR can be considered merge-ready.

## Structured Unicode review follow-up

The outstanding Copilot scalar-validation finding was reproduced against the
previous build with
`npx tsx --test --test-name-pattern='unpaired UTF-16' packages/svg/test/authoring.test.ts`
(missing expected rejection). Structured names, attribute names/values and text
now reject lone high/low surrogates before charging that character's UTF-8 budget,
with SVG_GEOMETRY and no fabricated XML span. Valid scalar pairs still count as four
UTF-8 bytes and prepare successfully. The original aggregate UTF-8 budget tests
remain intact.

Fresh format/lint/typecheck and all 1,168 root tests pass after the change. The
browser/showcase/consumer/license results above were run on the preceding integration
revision a304983, whose numerical and valid-input rendering code is unchanged by
this follow-up; final-head CI reruns those gates. Consumer costs in the table above
were refreshed by the root suite. The no-layout type matrix does not include the
layout fixture: only the explicit peer-present test does, as shown by the existing
fourteen-closure packed-consumer proof.
