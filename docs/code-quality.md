# Current native quality gates

`npm run lint` runs Biome lint at error severity, then the TypeScript AST
checker. `npm run format:check` checks formatting separately. Existing CI
already runs both commands. Import organization remains an editor/assist action,
not a lint gate; it was previously bundled into `biome check`.

## Rule mapping

The former native configuration used **typescript-eslint recommended**, not
ESLint's separate `eslint:recommended` preset. Biome recommended rules remain
enabled, with these migration equivalents explicitly set to errors:

| Former typescript-eslint rule | Biome rule(s) |
| --- | --- |
| ban-ts-comment | noTsIgnore (partial; see below) |
| no-array-constructor | useArrayLiterals |
| no-duplicate-enum-values | noDuplicateEnumValues (pinned nursery rule) |
| no-empty-object-type | noEmptyInterface + noBannedTypes |
| no-explicit-any | noExplicitAny |
| no-extra-non-null-assertion | noExtraNonNullAssertion |
| no-misused-new | noMisleadingInstantiator |
| no-namespace | noNamespace |
| no-non-null-asserted-optional-chain | noNonNullAssertedOptionalChain |
| no-require-imports | noCommonJs |
| no-this-alias | noUselessThisAlias |
| no-unnecessary-type-constraint | noUselessTypeConstraint |
| no-unsafe-declaration-merging | noUnsafeDeclarationMerging |
| no-unsafe-function-type, no-wrapper-object-types | noBannedTypes |
| no-unused-expressions | noUnusedExpressions |
| no-unused-vars | noUnusedVariables + noUnusedImports |
| prefer-as-const | useAsConstAssertion |
| prefer-namespace-keyword | useNamespaceKeyword |
| triple-slash-reference | No exact Biome counterpart |

These are equivalents, not identical implementations. In particular, Biome
does not reproduce the old ts-expect-error description requirement, ts-nocheck
ban, or triple-slash reference policy. It bans CommonJS exports as well as
require imports, and its unused-variable and banned-type semantics differ.
Those intentional tool-policy differences do not change the exact three
principle boundaries below. No new custom general-purpose lint engine is added.

The public JSX runtimes retain a narrow namespace exception. Biome has no
`allowDeclarations` option, so `packages/core/src/jsx-runtime.ts` and
`packages/svg/src/jsx-runtime.ts` disable `noNamespace` for their type-only,
module-scoped JSX declarations; the SVG development runtime re-exports that
namespace. Auditors should ensure these declarations remain module-local, not
global namespace augmentations. Other warning-only policies retain their previous
severities.

## Exact principle boundaries

`scripts/check-code-principles.ts` checks native `.ts`/`.tsx` (including `.d.ts`)
under packages, apps, tests, scripts and examples. Git supplies tracked and
non-ignored untracked files; deleted paths are skipped. Legacy and docs stay
outside the gate. Generated/historical directory exclusions match Biome:
node_modules, dist, dist-*, build, out, artifacts, archive, snapshots,
__snapshots__, generated-reports. This aligns AST selection with the already
tested preserved-byte policy rather than inspecting generated/historical code.

- Files: at most 400 physical lines, including blanks/comments; a terminal
  newline does not add a line. LF, CRLF, CR and Unicode line separators count.
- Functions: at most 49 lines, including signatures, braces, blanks/comments
  and nested functions. Methods, constructors and accessors count. Direct IIFEs
  retain the historical exemption; declarations without bodies do not count.
- Depth: at most three nested if/switch/try/loop/with statements. Else-if does
  not add depth; functions and class static blocks reset depth. Standalone
  braces, object literals, comments and strings do not add depth.

Boundary, negative, scope and CLI fixtures live in
`tests/integration/code-quality.test.ts`. Babel/ESLint/Mocha and their dependencies
are retired from the active workspace tooling. Legacy now uses TypeScript
`allowJs` compilation and a bounded Node test adapter, outside native lint scope.
Its historical tests still fail; exact baseline comparison passes without
changing original assertions. See [legacy tooling retirement](migration/legacy-tooling-retirement.md).
Historical configs, manifests, locks and evidence remain immutable archives, not
active quality policy.
