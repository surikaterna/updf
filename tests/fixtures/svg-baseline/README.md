# Frozen SVG XML consumer baseline (MIT)

`modules.json` contains verbatim UTF-8 sources from this repository at commit
`21dcd483dcd84961a24f5823e95a586ea25dd534`, keyed by their original Git paths.
All 18 production TypeScript modules under `packages/svg/src` at that commit are
included, including the erased type module and optional tree entry, so the source
snapshot is complete. These are test data, not a second production implementation.
The sources retain the repository's MIT license (see the root `LICENSE`).

The consumer helper pins SHA-256
`d158acf0456357ebddb799d51d040d7128ae8b1d0d13eb531e7f6d505c0495d5`
over UTF-8 `JSON.stringify(snapshot)` (commit first, then the source map in
lexicographic Git-path order). This anchor is outside the fixture; modifying a
source, deleting a module, or changing provenance fails before compilation.
JSON whitespace may change without changing the decoded source bytes.

Sources were checked byte-for-byte against `git show <commit>:<path>` during
fixture preparation. Tests never read Git history or fetch sources. The esbuild
plugin transpiles every reached SVG dist module from these sources with the
existing ES2022 TypeScript options; other dependencies remain current built
packages, identically for baseline and current consumers. Missing SVG modules
fail closed, rather than falling back to current code or skipping comparison.

Keep this snapshot immutable. Negative controls exercise source/provenance
integrity and compilation failure for both a missing historical module and a
new current-only authoring module. The cost and PDF comparisons still compile
the same exported XML operation with browser/ESM conditions and dynamically
render red and blue graphics, including root transform and viewBox geometry.

## Source-byte SHA-256 provenance

Paths below are relative to `packages/svg/src/` at the pinned commit.

| Module | SHA-256 |
| --- | --- |
| attributes.ts | `716a892771f8d534588e34320fa77bdb7ad5e3754a4c6c576b9971854349b4f8` |
| comments.ts | `c61ce70c42206ffeaa9c5a71e8175498f6bdd358aeecca3f61521399d3dc7811` |
| compile.ts | `0330327291bde9f49612c94e4a91c2243fadbb3f39f6160967491649a56aebcc` |
| css.ts | `ab209919a879753485f685e0294a544dbaecb963bf7e1f917ec252c237d91930` |
| declaration.ts | `6c1bf5a95d5a74d59b6e49e31da168a9f6c44599c10343a7f0a0147d93429edf` |
| error.ts | `82a08527dcd240ec27e3936eca7269fb1c720c6f6758318abf11efa443ca7d54` |
| index.ts | `e6f7aa28a20970fed733d3252d68fa13c22d673f90248b5da886375685f79863` |
| inspect.ts | `f35f66957627f87592e4afabe1803c4f667e663efb8e6829ca8b1a1acd45571c` |
| numbers.ts | `c18ef71fc3c428ff08d9e82de55f62d170150c2ad92df7dd8a6866549dd3b1ee` |
| shapes.ts | `ed1da486d2039cf627bb0612ff86f10f561222652449efd75234fbef6983d463` |
| source.ts | `d5f5b63e43f55538bac51152f58f03ecf8c22861bf5cda93e8b4e81805c8f605` |
| style.ts | `750e5735cff38a51706361f99e69f4d87b6e50b229301f0a68525c27f971bce2` |
| transform.ts | `8e29f1d640fac02731dcab2c3e9311f99eda56e1df02278e8f424037d4f81e6b` |
| tree.ts | `b2ba687e79f6c96398e92222cc5dfaaff0a74ac4d084b6fba18858dc3483aee0` |
| types.ts | `75cb662e250700bba9ba4eaff83d7387b9ae1dccc1f5b97b7c37e2846dd4fb5e` |
| viewport.ts | `54e88639914d5263d25742631a490d3260e159d282a3818ac53d4deb3617ce98` |
| xml-lex.ts | `961a456c7ef1b6bd794cb5608e8d2f4fc69e21958b397dfb5c401bf5e4b461e8` |
| xml.ts | `acd7653b6eb480bd7fbb30695c752434537eb0348965bd6394062a476a73f5f3` |
