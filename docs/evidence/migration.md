# #34 then #35 — integrated migration handoff

Date: **2026-10-02**. Engineer is integration owner; no delegation.
**Implemented locally; NOT independently verified.** Both GitHub issues remain
open and untouched. No staging, commits, push, PR, publication or deployment.

The caller reports the prior painting/native SVG proof **VERIFIED after two
remediation rounds**, with 79 native tests, three Chromium gates and 11 SVG
references. `native-poc.md` and `native-poc-readme.md` retain that proof's original
historical bodies (including superseded pending-audit wording). That prior audit
does not verify migration. `migration-progress.md` retains the earlier slice-A
preparation checkpoint; its incomplete status is superseded by this handoff.

## Actual scope / preservation

- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/declarative-cmr-poc`.
- Branch: `feature/declarative-cmr-poc`; base/HEAD unchanged:
  `7782bb3ba468a721ef7bd68fedd19b8f6c029d16`.
- Private root workspaces plus core, geometry, SVG, Fontkit and legacy; private
  node/CMR/browser React/browser fonts examples. One active root lock; original
  root/POC locks and manifests archived as historical evidence.
- Sources, tests, assets, tools and all 12 roadmap documents are relocated.
  The binary font was hash-checked before/after relocation. Text patch moves
  normalized some EOL/EOF bytes; 21 otherwise unchanged files were restored only
  when the exact original inventory hash matched. No content was guessed.
- `migration-inventory.json` is the immutable pre-migration old→planned-new/hash
  inventory. `migration-reconciliation.json` records actual final destinations,
  SHA-256s and explicit transformed files: **293 accounted, 219 byte-identical,
  74 migration edits**. All original legacy src/test/config, generated lib,
  roadmap bodies, assets/provenance/notices, locks/manifests and historical
  evidence/README bodies are protected by exact hash checks. Active root config
  and relocated native imports/tools/tests are explicitly transformed, not lost.
- The original root README is preserved in `docs/migration/legacy-readme.md`;
  the detailed POC README is retained as historical evidence, with current native
  contracts in `docs/native-api.md`. Root keeps the single filename `readme.md`.
- No original experimental source remains under `experimental/declarative`.
  Existing ignored old build/browser/PDF artifacts and node_modules are retained
  there as historical generated work, not a facade. New gates do not read them.
- Tracked delivery: all **81 original tracked paths** have an unstaged delta:
  77 removals relocated to untracked destinations, and four replacements
  (`.gitignore`, package.json, package-lock.json, readme.md). No staged or
  committed delta. Untracked delivery is the complete new workspace/docs/tests/
  tooling tree; Auditor must inspect it as well as the tracked diff.

Final delivery checks from that exact cwd: `pwd`, `git worktree list`,
`git branch --show-current`, `git rev-parse HEAD`, `git diff --stat`,
`git diff --cached --stat`, `git diff --cached --quiet`, `git status --short`,
and `git log --oneline 7782bb3ba468a721ef7bd68fedd19b8f6c029d16..HEAD`.
Staged stat is empty/quiet succeeds; commit range is empty. Tracked unstaged scope
is all81 paths described above. `git ls-files --others --exclude-standard | rg -c
.` returns **302 untracked files**; scoped to docs/roadmap returns12. Scoped to
experimental/declarative returns no files. Final tracked whitespace check passes;
new text whitespace check passes with preserved legacy/roadmap/historical native
bodies and the binary font excluded:

```sh
git diff --check
git ls-files --others --exclude-standard -z -- docs examples packages tests tools eslint.config.ts tsconfig.base.json tsconfig.json ':!packages/legacy/**' ':!docs/roadmap/**' ':!docs/evidence/native-poc*' ':!tests/fixtures/fonts/LiberationSans-Regular.ttf' | xargs -0 -r -I{} sh -c 'git diff --no-index --check /dev/null "$1"; status=$?; test "$status" -le 1' sh "{}"
```

Exit1 for a normal new-file difference is expected, not a whitespace failure;
exit2+ remains failed. Unchanged historical whitespace is not silently reformatted.

## Contract implementation

Core runtime has zero dependencies and no CMR types. Native versions remain
private `2.0.0-poc.0`; legacy private `0.4.15` retains actual main `lib/index.js`,
default CommonJS semantics, lib deep imports and unchanged Babel 6/Mocha 2/ESLint 2
lifecycle/toolchain. No native CJS/wildcard exports or permanent umbrella facade.
Runtime/declaration exports are explicit; local native dependencies are exact.
Fontkit optional peer ^2.0.4 and pinned dev 2.0.4 belong exclusively to the adapter.
React/types belong to the React fixture. Native TS builds use ES2022/types[] with
strict NodeNext and no TS paths rescue. Root tooling/examples have their own
host/React ambient types. Native JSX importSource is core; React JSX is explicit.

Internal seams expose only existing shared validators/error identity and scanner.
Exact export inventories and allowed native importer paths are enforced with
negative controls. Tests inspect private built modules where needed without
broadening exports. No rendering, layout, editor or legacy algorithm modernization.

## Integrated gates (exact root cwd above)

Environment: Node `v24.21.0`, npm `11.19.0`, system Chromium, qpdf and Poppler.

| Command | Outcome |
| --- | --- |
| `npm ci --ignore-scripts` | pass; 481 installed workspace/toolchain packages |
| `npm run lint` | pass; modern native/tooling/fixture gates, legacy explicitly excluded |
| `npm run typecheck` | pass; includes ordered package/example build and legacy Babel compile |
| `npm run build` | pass separately during implementation and via final typecheck |
| `npm test` | **89 pass, 0 fail**: all prior 79 retained + 3 boundary controls + 2 README cases + 5 preparation/reconciliation cases |
| `npm run build:browser` | pass; **all eight targets regenerated from emitted package JS**, no old TS source alias |
| `npm run test:browser` | **3 actual Chromium gates pass**, ordinary React/Fontkit Unicode/native SVG reference |
| `npm run test:consumer` | pass; five real external clean production tarball closures, scripts disabled, explicit tarballs for dependency closure |
| `npm run check:graphs` | pass; regenerated graph counts core25/VDOM22/fonts5/app64/Fontkit74/font-browser107/geometry17/SVG51 |
| `npm run check:licenses` | pass for known notices/font asset exclusion; unresolved project attribution explicitly reported, not waived |
| `npm run test:legacy:comparison` | **real before/after equivalence pass**, not just repeatability |
| `npm run test:legacy` | **FAIL**, inherited raw container `.toString()` at 255:46, it.only433, zero passing/one failing |
| `node_modules/.bin/tsx tools/audit-report.ts` | **FAIL / npm audit exit1**, merged workspace 45 vulnerabilities: 0 low, 8 moderate, 10 high, 27 critical |
| `node_modules/.bin/tsx tools/migration/reconcile.ts` | pass; all293 accounted/protected hashes match |
| `npm run sizes` | pass; actual source, emitted, declaration, bundle/gzip, assets and PDF sizes |
| `qpdf --check artifacts/cmr.pdf`, `qpdf --check artifacts/cmr-unicode.pdf`, `qpdf --check artifacts/font-proof.pdf`, `qpdf --check artifacts/painting-proof.pdf`, `qpdf --check artifacts/svg-proof.pdf` | all five pass, PDF1.4 syntax/stream checks |

Legacy full-suite behavior is **18 passing, 1 pending, 6 failing** before/after,
with identical failed titles/messages, exit codes and generated 708-byte PDF hash.
The unchanged Windows fixture paths and caught missing-image exception remain
explicit inherited debt. External migrated legacy tarball actually requires the
main and lib deep imports and matches original 651-byte PDF bytes/digest. It is
not confused with the root shim that imports src under Babel.

Original root audit had **57 findings** (2 low/10 moderate/16 high/29 critical).
The new authoritative workspace lock resolves preserved legacy semver ranges in
a different hoisted/scoped graph, producing the current45. No audit fix or direct
legacy toolchain modernization ran. This is not a claim that all inherited
vulnerabilities were eliminated; `workspace-audit.json` retains exact current
advisories/scopes and nonzero audit outcome. No aggregate silently marks raw legacy
tests or audit green.

## Consumer, ownership and visual evidence

Real tarballs installed externally: core + CMR example only; core + geometry;
core + geometry + SVG/tree + CMR; core + Fontkit adapter absent/present peer;
legacy alone. Explicit native tarballs avoid registry/workspace fallback. Core
closure has no geometry/SVG/Fontkit/React/legacy. Geometry has no SVG/Fontkit.
Fontkit adapter is installed without the peer and its portable declarations compile;
runtime import fails as expected. Installing pinned Fontkit2.0.4 then prepares the
licensed real TTF, shares core-owned PreparedFont resources through VDOM lower and
render, and checks error identity. Core/painting/fonts/VDOM and both JSX runtimes
compile/execute independently. SVG VNode lowering and DocumentError/SVGError
identity work across installed packages. NodeNext and bundler consumers use only
ES2022, types[], emitted declarations (no DOM/Node/React/parser ambient rescue).
Installed native closure graphs are retained in `artifacts/installed-graphs.json`.

Browser graphs use Fontkit's public browser-module export; ordinary React/core/
VDOM exclude optional parsers, native closures exclude Node builtins/Buffer/process/
React/legacy. A third-party `restructure/src/Buffer.js` filename is a parser class,
not a Node Buffer ambient: the checker does not misclassify it; emitted native
code separately rejects actual Buffer/process accesses. Negative controls cover
builtins (with/without node:), optional/React/legacy leaks, importer and barrel drift.

All11 native SVG references preserve bbox0/interior0. Maximum weighted foreground
mismatch0.0011137855 (0.1114%) and ink mass0.0227623192 (2.2762%). Thresholds remain
0.5% foreground, 3% ink mass, bbox1px, the existing edge/interior/hue checks and
thin-stroke/color/missing/moved/opacity negative controls. No gate was weakened.
Actual paired rasters/report remain in `artifacts/`.

Both pinned CMR PDFs remain exact after migrated CLI/browser/consumer rendering:

- Helvetica: `8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22` (5779 bytes).
- Unicode: `cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4` (423448 bytes).

Final measured bundles raw/gzip: core30835/9940, VDOM29587/8674,
geometry11272/4089, SVG40055/12240, ordinary React225340/72417,
Fontkit490865/169063, font-browser414787/168201. Graph-module increases reflect
explicit shared-validator barrels, not runtime parser leakage or a budget promise.
Measurements do not complete issue32. CMR grids do not complete issue28.

## #35 documentation validation

Complete README TS and reusable typed TSX sources are synchronized by a test
against `examples/node/src/{hello,heading}` and executed as compiled modules.
Optional SVG/font complete source also executes with real fixture requirements.
The exact advertised commands were run:

```sh
node --input-type=module -e "for (const name of ['hello','heading']) { const {bytes} = await import('./examples/node/dist/' + name + '.js'); if (!(bytes instanceof Uint8Array) || bytes.length === 0) throw new Error(name); console.log(name, bytes.length); }"
node --input-type=module -e "const {svgBytes,fontBytes} = await import('./examples/node/dist/optional.js'); console.log(svgBytes.length, fontBytes.length);"
node examples/node/dist/cli.js artifacts/cmr.pdf
node examples/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf
node examples/node/dist/font-proof.js
node examples/node/dist/painting-proof.js
node examples/node/dist/svg-proof.js
npm run sizes
sha256sum artifacts/cmr.pdf artifacts/cmr-unicode.pdf
```

Results: hello634 bytes, heading644, optional SVG737/font412757; proof PDFs and
hashes above pass. HTTP GET/content type/bytes and POST rejection are exercised
by the migrated browser test. The compiled standalone server entry is also checked
as part of documentation validation. Read-only `gh api
"repos/surikaterna/updf/issues?state=all&per_page=100" --jq '.[] | select(.number >=
25 and .number <= 35) | [.number, .title, .state, .html_url]'` confirms all exact
#25–#35 titles/URLs and their open state. Original roadmap bodies/index remain
byte-identical, relocated, and linked through current docs rather than removed.

## Principles / risks / next owner

Checklist for the new native/tooling delta: correctness validated; strong defaults
followed; cohesive production files<=400/functions<50/nesting<=3 lint-enforced;
intent/invariant comments only; risk-based boundary/import/type/ownership/tarball/
documentation and preservation controls added; modern lint/typecheck/native and
browser tests pass. No new approved principle exception, Changeset (no workflow)
or rendering feature. Inherited legacy long/complex source, whitespace, fixtures,
focused tests and vulnerable toolchain are preserved, not silently modernized.
The project-wide raw legacy test/audit checklist is deliberately **not all green**.

Known Fontello MIT notices ship in geometry and legacy tarballs. Liberation font
and OFL/provenance remain together in tests; no font files/metadata ship in any
production package tarball. Metadata MIT/author Surikat AB is historical evidence;
authoritative standalone project attribution remains unresolved after base-revision
license lookup404. No notice/holder/year was invented. This is a distribution caveat,
not release permission; all packages stay private and no publishing occurred.

Auditor next independently reviews actual unstaged + untracked delivery against
the reconciliation map, native manifests/internal inventories and ambient-free
exports, real tarball/installed graph evidence, baseline legacy equivalence and
truthful README/status/licensing. Review all transformed74 files, not only the
tracked deletion diff. Mark verified only after independent audit; tracker is
unchanged and delivery operations remain unauthorized.
