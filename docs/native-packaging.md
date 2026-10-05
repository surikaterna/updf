# Native module packaging

Node >=24 remains the supported baseline. All existing native exports have real
CommonJS implementations and explicit ESM facades; no default export is added.
`require()` does not depend on Node's experimental ESM loading capability.

## Graphs and identity

- `dist/cjs/**/*.js` is the canonical Node implementation graph, scoped by a
  generated `package.json` with `type: commonjs`.
- `dist/node/**/*.mjs` consists of generated, named ESM exports referring to the
  **same values** from that CommonJS graph. Node import and require therefore
  share prepared-font ownership, contexts, semantic recipes, adapters, classes,
  functions, and error identity, regardless of which loader runs first.
- The `browser` export condition selects the existing native `dist/**/*.js` ESM
  graph. It remains independently tree-shakeable and preserves optional/lazy
  adapter boundaries. Browser bundles must never include `dist/cjs` or
  `dist/node`. Bundlers should enable their normal browser condition.

The build checks the original sources with TypeScript before emitting either
graph. Facade names come from the checked module export symbols, resolving
aliases and excluding type-only exports; there is no second hand-maintained
list of public symbols. The manifest's explicit subpaths remain the public
entrypoint source of truth. A default export in source fails the native build.

## Declarations

Import selects `.d.mts` and require selects `.d.cts`. Both alias the canonical
CommonJS declaration graph rather than redeclaring nominal classes or unique
symbol brands. Browser type consumers also use that canonical graph. Packed
NodeNext `.mts`/`.cts` proofs check namespace assignability in both directions
for every public entry, including opaque font and context types. Existing
Bundler JSX consumers continue to compile and execute.

## Compatibility and optional dependencies

The original `dist/*.js` and `dist/*.d.ts` paths remain for existing direct-import
tests and browser graph evidence. These private direct paths select the browser
implementation, **not** the canonical Node graph: do not exchange owned objects
between them and package-name Node imports. Public package exports are the
supported mixed-loader contract. Neither API nor engine requirements change.

### Native tests and private fixtures

Run `npm run build` before native tests (or `npm run typecheck`, which builds first).
Native tests and shared fixtures use public package imports wherever available.
When testing private implementation details, import runtime values and types from
the corresponding `dist/cjs` paths so they share the canonical Node graph with
public imports. Do not substitute source aliases or private browser-graph imports:
nominal types, prepared-font records and WeakMap ownership must remain shared.
Pure numerical source tests that do not exchange owned objects may stay on source.
Browser-specific imports and graph evidence continue to use the browser graph.

Fontkit remains an optional peer of `@updf/fontkit`; core-only closures do not
install or load it. Loading the optional package without its peer fails with
`MODULE_NOT_FOUND` in Node, including through the ESM facade. Browser bundles
retain Fontkit's public browser export.

## Evidence

`npm run test:consumer` packs real tarballs, installs independent closures, checks
every existing native public subpath with both loaders in fresh processes and
both orders, and compares every exported value by identity. A separate process
uses `--no-experimental-require-module` to prove genuine CJS loading. Mixed
runtime proofs cover JSX, providers, recipes, adapters, cross-loader errors,
prepared fonts and rendering. Optional-peer absence and presence are exercised.
`npm run build:browser` and `npm run check:graphs` check browser ESM isolation,
tree-shaking boundaries and emitted rather than source-aliased package code.
