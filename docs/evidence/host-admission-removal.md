# Unused host admission session removed

Worktree `trees/flow-admission`, branch `feature/flow-admission`, unchanged HEAD
`b70da49ace00c19a8e570b4fc783806dffd6931c`. Uncommitted, self-validated cleanup;
not an independent final audit or publication approval.

## Reachability and scope

Removed the four private `flow-admission-{projection,scan,session,types}.ts` files
and their six dedicated test/fixture files. That removes 301 source lines and 720
test/fixture lines. Their only callers were within that implementation and its
tests. The old architecture test explicitly required production not to import it.
`@updf/layout` exposes only its root entry, which did not export these functions or
types. Source/import searches and consumer graph inspection found no supported
production path, dynamic loader, registration or public export using this session.

The package build nevertheless emitted every source file, and its `files` list
includes `dist`. Removal eliminates 24 emitted files totaling 40,613 uncompressed
bytes, including the associated declarations/maps and CommonJS output. This is
not a claim about compressed tarball savings. The removed source and tests are
archived in `artifacts/remove-host-admission/removed-files.json` for provenance.

The public kernel candidate API, all kernel source/tests, and the actual paginator,
prepared geometry, complete measurement and resolved-frame fit paths are unchanged.
The unrelated table-grid tests also named B1 remain untouched. Two small delivery
tests check that the removed files do not reappear in source/build output and that
the public kernel candidate API still works independently, including closure.

Current architecture documents now describe the actual production path rather than
require integration of the discarded experiment. Historical evidence is retained;
statements about B1 there describe those earlier checkpoints, not current scope.

## Validation

Passed:

- `npm run format:check`
- `npm run lint`, including AST code-principles checks
- `npm run typecheck`, including full workspace build
- `npm test`: 1,362 passed (28 B1-only tests removed, two delivery/API tests added)
- `npm run test:consumer`: 14 clean external tarball closures
- `npm run build:browser` and `npm run check:graphs`: 12 profiles
- `node artifacts/remove-host-admission/evidence.mjs before`
- `node artifacts/remove-host-admission/evidence.mjs after-final`

The core-only, full layout/table and layout-consumer profiles are byte-identical
before/after in both raw and minified output, not merely equal gzip sizes:

| Profile | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| Core only | 35,558 | 12,272 |
| Full layout/tables | 183,181 | 58,473 |
| Layout consumer | 163,401 | 52,244 |

Browser runtime, showcase, PDF/raster and timing suites were not repeated for this
unreachable-code deletion. Their prior results are recorded in
[resolved-frame fit](resolved-frame-fit.md); they are reused evidence, not new
runs. Unchanged production hashes and byte-identical consumer bundles justify that
scope. The earlier unreproduced SVG raster observation remains documented there.

An initial formatting failure in the new test was corrected. No runtime test
failures occurred. Logs and preservation hashes are in
`artifacts/remove-host-admission/`. Gates used the existing private disk-backed
wrapper with `root consumer browserBuild graphs`; no global mount/config changes.

No code-principles exceptions, Changesets (the project does not use them), staging,
commits, PRs or deployment. Independent final architecture/correctness reviews and
hosted CI remain outstanding. There is no remaining B1 integration task: any future
host admission framework needs a concrete requirement, not an inherited roadmap.
