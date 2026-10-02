# Ghost-style layout and Biome alignment

Status: **implemented, not independently verified**. This is new evidence for
the current request, not a rewrite of the independently reviewed #34/#35 delivery
or its historical evidence. No tracker mutation, staging, commit, push, publish,
or nested delegation occurred. Integration owner: Engineer.

## Delivery identity and preservation

- Exact cwd/worktree: `/home/sprawl/projects/updf/trees/declarative-cmr-poc`.
- Branch: `feature/declarative-cmr-poc`.
- Base and HEAD: `7782bb3ba468a721ef7bd68fedd19b8f6c029d16` (unchanged).
- Read-only reference: `/home/sprawl/projects/ghost/biome.json`; Ghost's
  instructions, Bun, plugins and release infrastructure were not adopted.
- Before editing, `pwd`, `git status --short`, `git branch --show-current`,
  `git rev-parse HEAD`, and `git worktree list` confirmed the supplied worktree
  and existing delivery: 81 tracked paths, all 81 already dirty, 302 untracked
  files, no staged delta.
- The pre-change capture includes deleted tracked paths and SHA-256/byte counts
  of every existing tracked and nonignored untracked file, not just HEAD.
  `artifacts/ghost-biome-before.json` SHA-256:
  `2a82eed629e255ef1aacee0307a163d4a2ad90235ec92f90f0cccf6f6bc11500`.
- `npx tsx scripts/migration/alignment-capture.ts` persisted those 383 path
  records and the old-to-new mapping in **new**
  `docs/evidence/ghost-biome-history.json`. Its SHA-256 is
  `9585edb19ea4364b89d713c341dd5a1f0a214af31da7e0cb5728a2723bb20d7c`.
  The after hashes in that history identify the capture point, before subsequent
  quality-probe hardening and current README additions; they are not represented
  as final delivery hashes. `artifacts/ghost-biome-final.json` inventories the
  final delivery separately.
- A final hash check against the pre-change inventory confirmed **119 protected
  existing files byte-identical**: legacy files, prior evidence, roadmaps,
  migration history, licenses/notices and byte-sensitive font assets/metadata.
  Prior historical files were not regenerated to make comparisons pass.
- Existing reconciliation now follows `examples/` → `apps/` and `tools/` →
  `scripts/`. Only active package/tsconfig manifests and the fixture README can
  use the new recorded before/after history when changed; legacy, licenses,
  resources and historical evidence retain direct original-hash protection.
  The original inventory and reconciliation evidence remain unchanged.
- Final delivery: 81 tracked paths with unstaged deltas and 308 untracked files.
  No task commits or staged files. The tracked deletions and `.gitignore` delta
  are pre-existing; this task's tracked edits are root manifest/lock/README.
  Review untracked `apps`, `scripts`, native packages/tests/configs and the new
  evidence as well as `git diff`; HEAD alone does not describe the delivery.

## Implemented scope

- Four private workspace names/APIs retained, now under `apps/*`; libraries stay
  under `packages/*`, repository automation is under `scripts/*`, and npm root
  workspaces are exactly `packages/*` and `apps/*`.
- Active npm lock/workspace links, TypeScript includes, Vite configs and their
  consumers, browser/consumer/graph/size automation, current documentation and
  CLI usage paths are aligned. Old ignored `examples/*/dist*` build remnants
  are not active workspaces or gate inputs.
- Core root continues not to import VDOM. `/vdom`, `/jsx-runtime` and
  `/jsx-dev-runtime` remain core subpaths: thin wrappers do not justify a new
  package/isolation boundary. No dependency/export redesign or feature expansion.
- Pinned `@biomejs/biome@2.4.13`, matching the Ghost schema. Gitignore-aware
  allowlist covers native core/geometry/SVG/Fontkit, apps, scripts, tests
  (including declaration files), and maintained root JSON/configs.
- Adopted 2-space LF/120-column formatting, double quotes, semicolons, trailing
  commas, parenthesized arrows, import organization and recommended lint.
  Explicit any, unused imports/variables, default exports, type imports and
  useConst are errors. Non-null assertions, index keys, forEach and cognitive
  complexity over 15 are warnings; useLiteralKeys is off.
- ESLint TypeScript-recommended rules are retained, with unchanged 400-line
  files, 49-line functions and nesting depth 3. Formatting-triggered growth was
  resolved through cohesive validation/arc helpers and test constants/helpers,
  not relaxed gates. Manual lint edits preserve budget-update order, output
  literals, diagnostics, ownership and resource limits.
- `test:legacy:comparison`, migration reconciliation and audit report writers
  now write regenerated reports to `artifacts`, not historical evidence.

## Scoped exceptions and principles self-check

- Task-directed preservation exception: legacy is excluded from Biome and
  modern ESLint; it is intentionally byte-identical, not silently modernized.
  Prior evidence/roadmaps, archives, generated dist/build/out/artifacts,
  node_modules, lockfiles and byte-sensitive font fixtures are excluded.
- Default-export exemptions list only the eight actual Vite configs and
  `eslint.config.ts`. No blanket test-any or declaration exclusion.
- Existing ESLint module-local JSX declaration exception remains confined to
  `packages/core/src/jsx-runtime.ts`; Biome required no namespace exception.
- Two line-local Biome suppressions explain non-DOM semantics: PDF control-byte
  escaping must retain its regex, and a compile-negative native JSX `onClick`
  probe is deliberately not valid interactive DOM. Neither suppresses file,
  function, depth, any, unused or type-import rules.
- Universal checklist: correctness validated; cohesive files; production files
  ≤400 lines; functions ≤49 lines; nesting ≤3; intent/invariant-only comments;
  proportional tests; lint/typecheck/tests pass for active code. No size/depth
  exception. Baseline legacy/audit failures below are not waived or green gates.
- Added two risk-based regression tests: Biome inclusion/exclusion and formatter
  idempotence/byte preservation; ESLint negative probes for 401-line files,
  50-line functions and fourth-level nesting in packages/apps/scripts/tests.
  Existing diagnostic/identity/immutability/CMR/raster/graph negative controls
  and all prior tests remain active. No Changesets system was introduced.

## Validation commands and outcomes

All commands ran in the exact worktree above with Node `v24.21.0`.

| Exact command | Result |
| --- | --- |
| `npm install --save-dev --save-exact @biomejs/biome@2.4.13 --ignore-scripts` | pass; exact dependency/lock |
| `npm ci --ignore-scripts` | pass; 483 installed packages; inherited deprecation notices remain |
| `npx biome check --write --diagnostic-level=error .` | pass after manual fixes; safe fixes only, no unsafe option |
| `npm run format:check` | pass; 179 files, no fixes |
| `npm run lint` | pass; Biome 181 files and unchanged ESLint principles/TS recommended |
| `npm run check:code-principles` | pass; also exercised separately |
| `npm run typecheck` | pass; includes all native/app builds, legacy compilation and root `tsc --noEmit` |
| `npm test` | pass; 91/91 = prior 89 retained + 2 quality regressions |
| `npx tsx --test tests/integration/code-quality.test.ts` | pass; checker probes also pass in final root test run |
| `npm run build:browser` | pass; all 8 Vite bundles |
| `npm run check:graphs` | pass; all 8 graphs; negative controls pass in `npm test` |
| `npm run test:browser` | pass; 3/3 Chromium gates, including unchanged tolerances for 11 SVG references |
| `npm run test:consumer` | pass; 5 clean external tarball closures, NodeNext/Bundler types and runtime ownership |
| `npm run check:licenses` | pass for retained notices/assets; unresolved attribution caveat remains |
| `node apps/node/dist/cli.js artifacts/cmr.pdf` | pass |
| `node apps/node/dist/fontkit-cli.js artifacts/cmr-unicode.pdf` | pass |
| `node apps/node/dist/font-proof.js` | pass |
| `node apps/node/dist/painting-proof.js` | pass |
| `node apps/node/dist/svg-proof.js` | pass |
| `npm run sizes` | pass; current measurements in `artifacts/sizes.json`, not an invented regression budget |
| `npm run test:legacy:comparison` | pass for equivalence only; raw exit 1; full 18 pass / 1 pending / 6 fail unchanged |
| `npm run test:legacy` | **known fail**, exit 1; inherited container fixture `undefined.toString` |
| `npx tsx scripts/migration/reconcile.ts` | pass; 293 accounted, 167 original-byte-identical, 126 explicit edits; output in artifacts |
| `npx tsx scripts/audit-report.ts` | **known fail**, npm audit exit 1; 45 inherited findings: 8 moderate / 10 high / 27 critical |
| `npm audit --omit=dev --ignore-scripts` | pass; 0 production vulnerabilities |
| `npm run format` (twice) | pass; both no fixes; full live-file hashes unchanged across both runs |
| `git diff --check` | pass |

CMR SHA-256 assertions remain:
`8316f7de647590dbfad97a7dff0aac7dd6dbde1ff98cbdff544387ca59c49a22`
(Helvetica) and
`cea1742abcfd3a21d2ebe6162967e9e4a9867653aee294cbf26bd658deca23e4`
(Unicode). SVG comparison thresholds and byte-sensitive fixture values were not
relaxed. Source and bundle byte measurements may change with formatting/helper
extraction; binary PDF contract digests do not.

## Handoff

Auditor should review the full dirty/untracked delivery against the pre-change
history and final inventory, confirm narrow exclusions/suppressions and unchanged
principles thresholds, inspect manual behavior-preserving edits and the new
reconciliation history, and independently check the acceptance evidence. Do not
infer verification from Engineer implementation checks. Authoritative standalone
project attribution is still unresolved; distribution remains unauthorized.
