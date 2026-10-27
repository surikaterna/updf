# Authored side-path showcase

## Scope and state

Issue: N/A (bounded user assignment). Worktree:
`/home/sprawl/projects/updf/trees/text-flow-design`, branch
`feature/text-flow-design`, base/HEAD
`882d6d38f432edcac97e962fbf446062c1483c3d`.

**Implemented, ready for independent apps audit; not independently verified.**
This replaces the prior rectangular showcase, using the already-audited side-path
runtime without modifying it. The massive inherited dirty state is preserved.
No staging, commit, push, PR, tracker mutation, delegation, server stop or tailnet
configuration change was performed.

This slice owns only app source modules, `tests/browser/text-flow-showcase.test.ts`,
the exact option expectation in `tests/showcase/ux.test.ts`, the exact lazy graph
expectation in `tests/showcase/graph.test.ts`, and this document. App changes:
`text-flow.tsx`, `text-flow-asset.ts` (notice only), `demos.ts`, `demo-metadata.ts`,
`main.ts`, and new `text-flow-path.tsx` / `optional-text-flow-path.ts`.
The image adapter, asset loader/conversion/cleanup logic, HTML, package manifests,
lockfile, runtime packages, paginator, fixtures and shared gate scripts are unchanged
by this slice. No dependency was needed. All delivery remains unstaged/untracked;
HEAD is unchanged. Existing tracked app edits and untracked app modules predate
this slice except for the two new Path modules.

## Three actual examples

At `/updf/`, use the **Example** selector (not query-param routes):

- `text-flow-left`: **Eevee PNG · left authored path wrap**
- `text-flow-right`: **Eevee PNG · right authored path wrap**
- `text-flow-path`: **Path: side wrapping (authored geometry)**

The two Eevee examples use the real `f.Block.style.shapeOutside`, with a literal
closed straight `d` string visible in the source view. The conservative polygon
was manually authored by visual inspection of the reference artwork, then widened
where the reference-pixel coverage regression exposed missed details. It includes
the ears, tail, body and shadow. It is **not automatic alpha extraction** or an
exact per-pixel outline guarantee for arbitrary artwork or decoders.

Both examples paint the actual unmirrored PNG through the existing local
`EeveeImage` component, in the same 164 × 164 local coordinate box as the polygon.
The same physical outline is used on both sides; the runtime selects its correct
outer side. Two ordinary Paragraph siblings start beside it, a real Span has a
background, and subsequent text returns to full width and continues across two
pages. Exactly one image and one alpha mask occur on page one, none on page two.
Font/image identities and the existing PNG provider are shared by layout/render.
No raw fixed-node authoring or invented public Image export is presented.

The third example authors a real `<f.Path d="M0 0 H160 L70 48 ... Z"
fill="#3498db" fillRule="nonzero" ... />` and ordinary Paragraph/Span siblings.
The same geometry paints the blue zigzag and supplies the changing side intervals.
It produces a one-page vector PDF with no image. It has its own lazy entry and
does not acquire the PNG loader or provider. Source disclosure is actual TSX.

Visible limitation in the PNG UI/status/PDF:
**Authored path wrapping; automatic transparency extraction pending. Straight
closed paths, outer-side only; holes not used for text.** Center wrapping, text
inside holes, curves, shape margins and automatic contours are not demonstrated
or promised. The normal positive leading uses the audited path policy, not the
legacy rectangle branch.

The initial/default entry still loads neither text-flow nor PNG. The exact graph
test requires both text-flow lazy entry modules, retains the default exclusion,
and retains PNG exclusion for every direct optional consumer other than the two
existing positive PNG consumers. The selector has 24 exact metadata IDs in its
existing four groups; the extra option/updated labels are installed by app source,
leaving inherited HTML untouched.

## External asset provenance (unchanged)

- User reference: <https://codepen.io/theosoti/pen/ogjjged>, Theo Soti,
  “Shape outside”; its CSS uses image-based shape-outside plus a shape margin.
  This demo instead authors its contour explicitly and uses no shape margin.
- Actual remote PNG:
  <https://cdn.iconscout.com/icon/free/png-512/free-eevee-eievui-pokemon-dessin-anime-jeu-video-pokemongo-32216.png>.
- Reference bytes: 512 × 512 non-interlaced 16-bit RGBA, SHA-256
  `7a201582d435201a92a092bd3aef7150029da0bc9b2e86d89e692ab9278b474a`.
- License **unknown**; URL wording and CodePen reuse establish no redistribution
  license. UI/PDF attribution remains explicit. No artwork bytes are added to
  source, public assets or dist; the PNG is fetched by the browser on selection.
- Existing CORS fetch, credentials omission, timeout/cancellation, native
  `createImageBitmap`/canvas 8-bit normalization, `preparePng` validation and bitmap
  `finally` cleanup remain unchanged. Browser normalization is not byte preserving.
  External CDN/CORS availability remains a risk; readable failure and core-demo
  recovery continue to pass. Existing PDF URL and generation lifecycle is reused.
- Offline replay input: `/tmp/opencode/text-flow-showcase-eevee.png`, never added
  to the repository. The test defaults to live CDN loading unless replay is set.

## Fresh validation — 2026-10-23

Commands run from the exact worktree above, serializing package/app builds:

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS: fresh all-package build and root TypeScript |
| `npm run build -w @updf/showcase` | PASS: app TypeScript and production Vite build; final build 1.36s |
| `npm run format:check` | PASS |
| `npm run lint` | PASS: Biome and AST code-principles gate |
| `npm test` | PASS: 1554/1554, no skips/cancellations, 17.55s |
| `npm run test:showcase` | PASS: 105/105, no skips/cancellations, 299.65s |
| `npx tsx --test tests/browser/text-flow-path.test.ts` | PASS: 1/1 existing complete Node/Chromium placement/node/PDF parity |
| `TEXT_FLOW_SHOWCASE_PNG=/tmp/opencode/text-flow-showcase-eevee.png npx tsx --test tests/browser/text-flow-showcase.test.ts` | PASS: 2/2, includes all three examples and load-error recovery |
| `TEXT_FLOW_SHOWCASE_URL=http://100.74.77.69:5182/updf/ npx tsx --test tests/browser/text-flow-showcase.test.ts` | PASS: 2/2; all three examples exercised against the actual existing tailnet HTTP preview with live CDN |

The browser suite's error/recovery test uses its own ephemeral local preview;
the URL override applies to the three-example success scenario. All test-owned
previews and Chromium instances close in `finally`. No long-running checks remain.
Logs: `/tmp/opencode/text-flow-showcase-{root-tests,app-tests,build}.log`.

Risk-based browser regression assertions now cover:

- Complete normalized `pdftotext -raw` extraction in authored order for **both**
  PNG PDFs, including every repeated paragraph and final attribution, not markers
  alone. `qpdf --check` passes all three PDFs.
- `pdfimages -list`: exactly one page-one image plus one page-one soft mask, no
  images/masks on subsequent pages. Actual brown preview pixels on both sides.
- Extracted first-page word-box geometry: changing side edges by over 25pt, and
  text entering the image's transparent bounding-box margin on each side, rather
  than rectangular wrapping. No private host internals or reconstruction API.
- Browser-decoded reference pixels with alpha >16/255: zero outside the authored
  polygon and zero inside extracted first-page text word boxes. This is a scoped
  reference-art regression, not an exact antialias/per-pixel general guarantee.
  Initial outline checks failed at 618 then 157 uncovered pixels; the final contour
  passes without relaxing that threshold or the zero-overlap expectation.
- Actual blue `#3498db` Path pixels, no PDF image, source TSX with literal `d`,
  and no source-code leakage into extracted document text.
- Default lazy loading, PDF.js worker use, downloadable multi-page PDF/preview,
  source disclosure, external failure and recovery.

Ignored fresh artifacts in `artifacts/showcase/`:

- `text-flow-showcase-{left,right,path}.pdf`
- `text-flow-showcase-{left,right,path}.png` — full UI/screenshots
- `text-flow-showcase-{left,right}-overlay.png` — first-page canvas, green authored
  contour and purple extracted word boxes, added **only by tests after** clean UI
  capture; never added to the app UI or PDF.

Both overlays and all three example UI screenshots were visually inspected:
correct unmirrored placement, changing intervals, no visible artwork/text overlap,
full-width continuation, and an actual blue zigzag. Artifact files are regenerated
by browser runs; the last run was offline replay of the same reference bytes.

## Hosting, costs and Auditor handoff

The existing preview PID **665048**, bound to **100.74.77.69:5182**, was preserved.
The actual browser success run used `http://100.74.77.69:5182/updf/` in its insecure
HTTP context without an allow-host or Tailscale configuration change. This tests
reachability from this machine, **not another device's ACL or browser**.
Normal app builds replaced dist while that preview stayed running; transient mixed
assets were possible during builds. Builds/checks are now finished: refresh after
handoff. Parent should freeze rebuilds during independent app audit.

Final emitted direct optional chunks (not full retained closure/incremental costs):
PNG examples approximately **10.79 kB / 3.87 kB gzip**; Path example approximately
**3.74 kB / 1.47 kB gzip**, plus shared layout/text-flow/geometry dependencies.
These nonzero chunks are selection-lazy. No claim of zero cost or new paired
runtime optimization is made.

Protected tracked diff (`packages`, `scripts`, root lockfile, Biome config) SHA-256
before and after:
`3943c245112606f3ab8b71ab6c6c04e8cbcdab28eb146e0caedfc0af58a811b4`.
Inherited untracked package/script file hashes were also recorded for comparison.
No runtime source was edited by this slice.

Universal/code-principles checklist: correctness validated; no avoidable unsafe
patterns added; defaults followed; cohesive files below 400 lines; functions below
50 lines and nesting at most three; comments explain intent/invariants; risk-based
tests above; lint/tests pass. **No approved exceptions.** No numerical/runtime
contract changed, so existing numerical/Node-browser parity tests are reused rather
than adding runtime tests. No changeset: private app-only behavior, no publishable
package change.

Auditor: review the actual app/test/doc delivery against the inherited dirty state,
reproduce all three selector IDs, inspect clean and overlay images plus PDFs, check
the exact lazy graph/metadata assertions and the preserved asset lifecycle, and
independently confirm protected runtime hashes. Remaining acceptance is independent
apps audit, not implementation or a pending local gate. No tracker exists for this
assignment and none was mutated.
