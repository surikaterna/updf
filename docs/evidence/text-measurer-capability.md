# Standalone text-measurer capability — implementation evidence

Objective: split standalone text measurement from the full render/layout service,
preserving validation and measurement semantics while reducing both measured closures.
Issue: N/A (authorized post-PR-64 slice). Ready for independent audit, not verified,
published, or delivered. Parent Builder owns integration.

## Delivery state and contract

- Worktree: `/home/sprawl/projects/updf/trees/text-measurer-capability`.
- Branch: `feature/text-measurer-capability`.
- Base/HEAD: `d179f0123b833c96531c7a4695ccd5e4bdb3a2e8` (merged PR 64).
  Its tracked tree matches PR head `6205c91980f7bc00709b5939d37ca2f7e376a9c2`.
- Initially clean; this slice is entirely unstaged modifications/new files.
  No staging, commit, push, PR, tracker mutation, or other worktree edit.
- `TextMeasurer` is structural in `@updf/core/resources`; it has only `measure`.
  `@updf/text` exports `createTextMeasurer`, `TextMeasurerOptions`, and `MeasureOptions`.
- Both standalone entry points now accept only `MeasureOptions`: required `measurer`,
  optional `resources`, `profile`, and `limits`. Old `text`/`providers` keys are
  explicitly rejected, even when empty. There is no overload/projection/fallback.
  See [migration](../migration/fonts-text.md).
- Full `createTextService` retains nine methods for render/layout/component/table
  measurement. Both factories share the same measurement closure and capture all
  six runtime capabilities, including unused `lineMetrics`. No implicit Helvetica.
- Generic resource binding capture/accounting is shared, including unique owned
  identities, unused resources, escaped paths, and fresh standalone ledgers.
  Full service output validation uses the same factored measurement validator;
  its remaining validators are static per-method captures, not a dynamic dispatcher.
- All actual standalone consumers were migrated; rendering compositions remain
  separate. Full layout operations, component lifetime guards, rendering input keys,
  font runtime/algorithms, JPEG, and PDF writer implementation were not changed.

## Matched size evidence

Node `v24.21.0`, npm `11.19.0`, esbuild `0.28.2`, TypeScript `5.9.3`, Vite `7.3.6`.
Installed package exports, browser conditions, ES2022, minified ESM, no source aliases.
JS/gzip bytes are actual emitted bytes, not discovered-module counts.

| Profile | Merged base JS / gzip | Current JS / gzip | Delta JS / gzip |
| --- | ---: | ---: | ---: |
| Drawing | 33,426 / 11,537 | 33,586 / 11,546 | +160 / +9 |
| Helvetica render | 58,859 / 20,046 | 59,093 / 20,135 | +234 / +89 |
| Prepared render | 63,133 / 21,289 | 63,366 / 21,375 | +233 / +86 |
| Fonts measurement | 32,987 / 11,182 | 27,906 / 9,657 | **−5,081 / −1,525** |
| Fontkit render | 436,407 / 174,794 | 436,647 / 174,852 | +240 / +58 |
| Host measurement | 28,899 / 9,645 | 23,827 / 8,120 | **−5,072 / −1,525** |

Both measurement profiles retain zero bytes from core `text-service.js` and
nonmeasurement-only `text-output.js`, text `service.js`, `inline.js`, and
`inline-paint.js`. Before, the first four retained respectively 670, 3,317, 854,
and 1,356 bytes in each profile. Measurement shape validation and shared helpers
remain, as do the required plain fixed-policy and rich/join algorithms. The graph
test has used full-service and full-operation negative controls: it is not a
vacuous import-only assertion. It also excludes layout-operation/native input
validation/VDOM normalization from emitted standalone measurement.

Historical `f347be43b245f6420818e0eb072a6877877af24a` still measures 20,353 / 7,354
for fonts measurement; current remains **+7,553 / +2,303** versus that older implicit
API. This slice removes the demonstrated full-service retention, not the entire
structural-validation cost. Rendering cost remains materially above the historical
baseline and grows slightly here; any further investigation is a separate assignment.
No claim is made that this removes the PDF writer from measurement (it was not
retained there), or that these numbers are universal budgets.

### Reproducible proofs

Before editing, archived the exact merged base into
`/tmp/opencode/updf-text-measurer-base-d179`, installed its own dependencies using
`npm ci`, and ran its unchanged size script:

```sh
# cwd: /tmp/opencode/updf-text-measurer-base-d179
npm ci
npm run sizes -- . current /tmp/opencode/updf-text-measurer-base-sizes
# cwd: assigned worktree
npm run sizes
npx tsx scripts/consumer/measurement-capability-proof.ts /tmp/opencode/updf-text-measurer-base-d179 /tmp/opencode/updf-text-measurer-base-sizes artifacts/font-extraction/current
npm run sizes -- /tmp/opencode/updf-develop-integration-f347be4-20261005 baseline
npx tsx scripts/consumer/cost-provenance.ts /tmp/opencode/updf-develop-integration-f347be4-20261005
npx tsx scripts/consumer/cost-proof.ts /tmp/opencode/updf-develop-integration-f347be4-20261005
```

All pass. The merged proof checks all 1,021 tracked source blobs, isolated package
links, matching tools, and baseline absence of the new factory. It compares 30
plain/rich DTO/error cases across Helvetica, prepared Unicode, and host metrics,
plus configured quotas. Bundled fonts measurement DTOs and drawing/Helvetica/
prepared PDF bytes match the merged base exactly. Retained-module assertions and
all-profile deltas are written to `artifacts/text-measurer/merged-base-proof.json`.
Before/current size reports contain the exact input programs and every module's
`bytesInOutput`. The historical provenance checks all 950 tracked files and tool/
package-link isolation; its existing cost proof passes qpdf, font inspection,
extraction, raster equality, Helvetica byte equality, measurement DTO equality,
and CMR ASCII/Unicode preservation. Historical configuration is not rewritten.

## Gates and risk-based coverage

All final gates pass:

- `npm ci`: isolated dependencies installed; no dependency/lockfile changes.
- `npm run format:check`, `npm run lint`: formatting, Biome, and AST principles
  (400 lines/file, at most 49 lines/function, depth at most 3).
- `npm run typecheck`: includes full workspace build and `tsc --noEmit`.
- `npm test`: **815/815**.
- `npm run test:consumer`: ten external tarball closures, NodeNext/Bundler types,
  supported export inventory and canonical CJS/ESM dual-loader factory identity.
- `npm run check:licenses`: actual tarball licenses/notices.
- `npm run build:browser`, `npm run check:graphs`: all browser profiles.
- `npm run test:browser`: **11/11**, one default run; no artifact-based retry.
- `npm run build:showcase`, `npm run test:showcase`: **67/67**.
- `npm run build -w @updf/layout-playground`, `npm run test -w @updf/layout-playground`:
  **12/12**, including real qpdf/Poppler coordinate checks.
- `npm run test:browser -w @updf/layout-playground`: **5/5**.
- `git diff --check`: passes.

Initial lint/type/export-inventory failures were fixed. A showcase run was tool-
interrupted at 120 seconds (45 passes, seven cancellations); rerun with a 300-second
tool timeout passed. Initial playground tests raced that package rebuild and saw
temporarily absent dist files; sequential tests passed. These were scheduling
corrections, not browser-black retries or product changes. Logs are retained as
`/tmp/opencode/updf-text-measurer-*.log`; final application logs carry `-final`
where an earlier attempt existed. Raw historical legacy tests were not repaired
or represented as current gates.

Added/updated tests cover strict options and own descriptors without getters,
missing/inherited/extra capabilities, all six runtime callbacks without invocation,
complete output DTOs (styles, finite coordinates/ink, integer counts, ordered UTF16
spans), fractional coordinates, snapshot freezing, callback receiver/mutation/error
identity, retained-context behavior, fresh budgets, aliases/unused resources and
exact byte caps. Existing roundoff, wrap-work, prepared Unicode, host metrics,
default-font, scoped lifetime, render and browser parity coverage remains active.

Universal checklist: correctness checked; defaults followed; cohesive files and
size/complexity limits pass; comments explain intent/invariants; tests proportional
to the public breaking boundary; lint/tests pass. **No approved exception.** No
Changeset: this repository does not use Changesets and packages remain unpublished.
Auditor should independently review the complete unstaged/untracked scope, strict
contract/validation preservation, graph negative controls and provenance evidence.
