# S0 — frozen text-flow migration baseline

Issue: N/A. **S0 implemented, ready for independent audit; not independently
verified.** This is a baseline freeze, not runtime migration or permission to
start S4. The caller reports independent approval of the
[authoring plan](../architecture/text-flow-authoring.md) and
[migration matrix](text-flow-migration-matrix.md); no audit report, tracker state
or fresh runtime audit is inferred. Their historical planning status is unchanged.

## Scope and reference semantics

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`.
- Committed PR/HEAD: `882d6d38f432edcac97e962fbf446062c1483c3d`.
- Pre-feature library: `244c0932c733accace68b7d8fb85cdc8f851d4e8`.
- Actual inherited delivery: **143 dirty paths: 41 tracked unstaged and 102
  nonignored untracked**. This includes side-path fixes, apps and plans; neither
  Git reference alone represents it. No staged changes at entry or handoff.
- This assignment owns only new `scripts/text-flow-migration-baseline.ts`, this
  document, and ignored `artifacts/text-flow/migration-baseline/`. All inherited
  paths remain other owners' work. No stage, commit, push, PR, tracker mutation,
  delegation, discard, runtime edit or showcase build was performed.
- Final source scope: the inherited 143 paths plus these two untracked files,
  **145 dirty paths: 41 tracked unstaged + 104 untracked**. No new commits.

## Immutable evidence and recovery

The new driver reserves its output directory exclusively. All JSON/artifact
writes are exclusive; byte-identical partial representative PDF/raster captures
may be explicitly reused, never replaced. Existing baseline directories reject
capture. Its `verify` mode is read-only and prints the fingerprint and manifest
SHA-256. Do not run capture again in this worktree or delete the reserved baseline.

Files under `artifacts/text-flow/migration-baseline/`:

| File | Meaning |
| --- | --- |
| `before.json` | Exact cwd/branch/revisions, Git dirty/staged list, 1,577 inherited file hashes, 2,567 generated output hashes, 3,638 historical text-flow artifact hashes, project/agent instruction hashes, versions and preview observation |
| `source.tar.gz`, `archive.json` | Recoverable archive of all 1,577 existing inherited tracked/nonignored files, including the 102 inherited untracked files, with archive SHA-256; 2,867,397 compressed bytes |
| `current/report.json`, consumer bundles/metafiles, package tarballs | Fresh current-runtime cost report, emitted inventory, exact inputs, parsed consumer graphs and payloads |
| `costs.log`, `cost-summary.json` | Exact reused runner output, 238 paired rows and aggregate totals |
| `legacy-rect-{left,right}.*`, `legacy-rectangle.json` | Before-fix omitted-shape negative-leading inputs, bundles, PDFs, rasters, placements, qpdf and full extracted text |
| `representative.json`, named PDFs/rasters/bundles | Current representative output and historical PDF parity where explicitly compared |
| `after.json` | Final generated-output/preview inventory, dirty list and hashes of both owned files |
| `manifest.json` | Every generated S0 artifact hash, excluding itself to avoid self-reference; external SHA-256 supplied in handoff |

Inherited source fingerprint (SHA-256 of the sorted path/hash JSON):
`292d31e1e5ad496f30d1f7d8da4be3b19d234695111a7709a3b7db9b3ee9ee8d`.
The initial dirty list includes the newly added driver (103 untracked at capture);
`excludedOwned` distinguishes it from the 102 inherited untracked files. Both owned
files are intentionally outside the inherited archive/fingerprint and covered by
the final manifest through `after.json`, avoiding stale or circular self-hashes.

The archive excludes ignored outputs, node_modules, Git metadata/caches and remote
assets. Secret-like filenames reject capture; no remote image was fetched or
redistributed. The driver hashes symlink identities without traversing them.
Deleted tracked paths would be retained in Git status, not invented as archived
files. Recovery uses the existing Git references plus archive overlay; inspect
`before.json` before restoring elsewhere, never over this protected live worktree.
Verification compares archive paths and contents with the inherited source tree.
The manifest is a preservation checksum, not a signed attestation or tamper-proof
storage. Historical artifacts are hashed in place, not duplicated into the archive.

## Fresh costs versus reused history

The existing cost runner was reused without modification. It ran `npm run build`
for package outputs only, packed with `--ignore-scripts`, and bundled consumers.
The lock was measured from the actual current file, not copied from a report:
`d215481cbe03738b857a5f8e5148bf55fd13d7c20a40cd5b884368a0b326c018`.
Node `v24.22.0`, npm `11.19.1`, tsx `4.23.15`, TypeScript `5.9.3`, esbuild `0.28.2`,
qpdf `12.4.2`; exact runner flags and tool versions remain in the reports.

**238/238 metric keys reproduced, 40 consumer builds, zero nonzero deltas** versus
`side-path-fixed-vs-before/report.json`, with identical lock hashes. Ten existing
consumer names each have browser/Node × raw/minified output and level-9 gzip:
`drawing`, `ordinaryText`, `preparedFont`, `jpeg`, `textFlow`, `layout`,
`textFlowExclusion`, `textFlowProfile`, `textFlowSiblings`, `textFlowPath`.
These are the existing profiles, **not** all ten proposed canonical profiles.

| Aggregate | Bytes |
| --- | ---: |
| Packed package payload | 702,233 |
| Unpacked package payload | 3,871,049 |
| Browser ESM JS / declarations | 830,022 / 331,882 |
| Node facade JS / declarations | 13,858 / 2,964 |
| CJS JS / declarations | 957,525 / 331,882 |

Payload is not installed dependency closure. Node facades retain CJS semantics;
browser tree-shaking is not a Node isolation proof. Existing graph assertions ran
as part of the cost runner and root tests; no new canonical packaging claim.

Historical `library-baseline/report.json` names pre-feature `244c093…`, has 188
metrics and lock `3c04c00b757259552db74da30a6d28bc09fbf8c4d0a7d41d3feaf86358e24cba`.
`side-path-fixed-vs-library/report.json` and `side-path-fixed-vs-before/report.json`
name `882d6d3…` but contain dirty-runtime results with 238 metrics and the current
lock above. They and **all 3,638 historical text-flow files** are preserved by
path/hash and rechecked; none was rebuilt or re-certified. In particular, the
pre-feature comparison is not same-lock and not a fresh S0 pair. Committed HEAD
is recorded as a reference, not misrepresented as a freshly rebuilt clean tree.

Planned syntax, compound/multi-interval, URL/cache cold/warm and PNG alpha
extraction profiles remain unavailable, not zero-cost. Composition-only isolation,
installed dependency footprint, fresh latency/memory/fetch/decode measurements and
new no-tree-shaking format closures are future bounded milestone work.

## Runtime diagnosis, not a safety waiver

The omitted/legacy rectangular route at full width 200, visual height 36,
fontSize 20 and `lineHeight: pt(2)`, text “A”, produces **75 exact red pixels** in
the protected visual region on both left and right. Both PDFs pass qpdf and
extract `A`; neither fact proves safe geometry. This is the known **S4 release
blocker**, not a passing production regression test or approved exception.
The diagnostic asserts that the unsafe before result is observable.

Fresh representative qpdf/text/raster evidence covers ordinary no-extension,
installed participation without a float, normal rectangle, current negative-leading
Path, normal Path/sibling consumers, atomic flow and edge profile. The last four
PDFs are byte-identical to execution of the preserved historical consumer bundles.
Normal rectangles and no-float controls capture current behavior, not S4 acceptance.
`side-path-fixed-vs-before/fix-proof.json` preserves historical output/PDF/source
charge parity, and its `native/` tree preserves normal rectangle/slope/tail cases;
source charges were **not freshly instrumented** here. Root tests additionally
exercise source progress, budgets, lifecycle, admission and native painting.
These checks are not a new comprehensive runtime audit or full source-charge proof.

Two representative driver input mistakes were corrected before sealing (atomic
paragraph field and unsupported Path background style). Successful partial captures
were reused only after exact-byte checks and are labeled in `representative.json`.
The failed `path-negative-leading.mjs` bundle is retained as diagnostic provenance;
the successful case is `path-negative-leading-current`, not the failed attempt.

## Protected preview and image inventory

PID `665048` remains the existing Vite preview, cwd `apps/showcase`, command
`vite preview --host 127.0.0.1 --host 100.74.77.69 --port 5182 --strictPort`.
The observed listener is `100.74.77.69:5182`; local HTTP GET
`http://100.74.77.69:5182/updf/` returns **200** before/after. Response bytes,
all **80** dist path/content hashes and all inherited app source hashes are checked
for preservation. No process writes, restart or app dist rebuild occurred.
This is not a claim about another device, routing, authentication or ACLs.

Actual filenames (each exact hash is in `before.json`/`after.json`) include
`optional-text-flow-Cpt5HUff.js`, `optional-text-flow-path-xglsRASI.js`,
`color-alpha-DWTcQS99.png`, `gray-alpha-GUeEwaHV.png`,
`color-1x1-DBoq1SH4.jpg`, `gray-DtCKGs94.jpg`, `index.html` and `chunk-graph.json`.
This inventory does not prove remote Eevee availability, alpha contour extraction,
licensing or the future canonical image feature. No user network dependency added.

## Reproduction and validation

From this exact worktree, read-only verification:

```sh
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts verify
```

Creation sequence actually run (do not repeat against the reserved directory):

```sh
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts capture
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts costs
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts rectangle
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts representative
npm run format:check
npm run lint
npm run typecheck
npm test
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts seal
node_modules/.bin/tsx scripts/text-flow-migration-baseline.ts verify
```

Final format, lint (including AST code principles) and typecheck passed. Typecheck
ran its required package build; showcase outputs remained protected. `npm test`
passed **1,554/1,554**, zero failed/skipped/cancelled. A deliberate malformed
arithmetic negative control logs an esbuild error while its enclosing test passes;
it is not an ignored gate failure. Earlier scoped/root formatter failures were
corrected, not waived. Negative CLI tests rejected duplicate capture and invalid
mode while asserting `before.json` remained byte-identical. Seal/verify compare
inherited sources/history, archive, final owned hashes and package outputs,
preview identity/body/dist and unchanged HEAD/branch/empty staging.

No browser/showcase builds, standalone graph/packed-consumer/browser suites or
benchmark expansion were run for this evidence-only slice; no runtime semantics
changed. This does not waive later milestone gates. No Changeset workflow added.
Universal checklist: correctness/preservation checked; cohesive files, script at
most 400 lines, functions under 50 and nesting at most three (AST gate passed);
comments explain invariants; risk-based diagnostic/negative/preservation checks
added; lint/typecheck/tests pass. **No approved code-principle exceptions.**

Auditor should independently run verify, inspect actual untracked delivery and
manifest SHA-256, review recovery/exclusions and diagnostic labeling, confirm
the 238-row fresh pair and historical distinction, and check preview preservation.
Only independent S0 audit approval plus a fresh caller assignment may start S4.
