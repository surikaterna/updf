# Legacy UPDF compatibility package

Private workspace preserving version 0.4.15, Babel 6, Mocha 2 and ESLint 2.
`require('@updf/legacy').default` constructs the legacy document. The actual main
is `lib/index.js`; `lib` deep imports remain supported. The root `index.js` shim
imports `src` and needs Babel; it is not the package main.

Inherited tests fail and tooling has known vulnerabilities. See
`docs/migration/legacy.md` in the repository for migration and baseline evidence.
The package declares MIT and historical author Surikat AB; an authoritative
standalone project copyright/license notice has not been recovered. Distribution
needs provenance resolution before any release. No attribution has been invented.
Fontello arc math's known upstream notice is preserved in `LICENSE.svgpath`.
