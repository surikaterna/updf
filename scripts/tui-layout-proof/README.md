# Static TUI integration proof

This directory is the runnable TUI integration, not a published Formbar package
or a web preset. It prints **static ASCII, cell-unit** layouts; it has no focus,
interactive widgets, input loop, or production terminal renderer.

## Where the integration happens

1. `source.mjs`: FSX form and schema.
2. `bridge.mjs`: public `@formbar/fsx-authoring` compilation, using application-private
   demo compile options and installation helpers from the pinned Formbar checkout.
3. The installed host supplies its real snapshot; the bridge disposes the session
   after the consumer finishes (including failures).
4. `box-bridge.ts` and `intervals.ts`: project that snapshot through public
   `@updf/layout-boxes/boxes`, allocation, and numeric entrypoints.
5. `terminal.ts`: static ASCII rendering; `cli.mjs`/`run.mjs`: terminal entrypoint.

The demo bridge is **app-private**, not a public production Formbar integration
API. Installed third-party dependencies are external to the size graph; reported
bundled bytes are not the full installed dependency footprint. Snapshots and
terminal output prove this bounded adapter, not production integration.

## Run from the uPDF checkout/worktree root

Requires Node 24+, installed uPDF dependencies, and a trusted, clean Formbar
checkout at **`4fc67c225ef9af80dd2345852df3b884e62656eb`** with its dependencies
already installed. Set the absolute path to that checkout (linked worktrees are
allowed). The proof reads Formbar source, not stale dist; it does not install,
build, fetch, or modify Formbar.

```sh
export FORMBAR_ROOT=/absolute/path/to/pinned/formbar
node scripts/tui-layout-proof/run.mjs --widths=32,80 --states=hidden,shown
node --test scripts/tui-layout-proof/live.test.mjs
node scripts/tui-layout-proof/profile.mjs
```

The first command prints four layouts directly in your terminal. The live tests
cover actual compilation, host state/disposal, and all 137 CLI widths in both
states. Current profiles write ignored bundles/metafiles and `report.json` under
`artifacts/layout-boxes-b/profile/`; these are local artifacts, not hosted
screenshots or public URLs. Current CLI/live tests/profiling need **no historical
uPDF Git object**, so they also work from a source archive with dependencies.

### Optional historical comparison

```sh
node scripts/tui-layout-proof/profile.mjs --baseline
```

Only this mode additionally requires the **actual uPDF repository/worktree root**
and locally available commit **`0bf8812b6c02c9e7114b75db02468ca4fe6f6147`**, including
the nine immutable source blobs listed in `baseline.mjs`. Use a full-history
checkout containing that revision. An archive nested inside some other Git repo
is not a valid root; a shallow checkout lacking the commit is not sufficient.
Preflight rejects before bundling or writing any artifacts, with the exact root
and revision prerequisite. It never fetches history, substitutes current code,
or silently skips comparison. To profile current code instead, explicitly omit
`--baseline`. Historical comparison output is under `artifacts/layout-boxes-a/baseline-profile/`.

Portable preflight regression tests need only Git and Node, not Formbar:

```sh
node --test scripts/tui-layout-proof/baseline.test.mjs
```

## Portable menu-left / form-right proof

```sh
./node_modules/.bin/tsx scripts/tui-layout-proof/menu-form-cli.ts
./node_modules/.bin/tsx --test tests/integration/tui-menu-form.test.ts tests/integration/tui-layout-proof.test.ts
```

`menu-form.ts` adapts the existing host snapshot profile plus host-owned menu and
button strings using lightweight `BoxView` references. It does not copy the
document tree, introduce a VDOM, or import document layout, core/PDF, or font
machinery. The integration test asserts the bundled host import graph. This is
a portable fixture, not evidence of live Formbar buttons or an interactive UI.

The natural-height root Row has an 8-cell sidebar, a 2-cell gap, and a flexible
form Column containing field Rows and a button Row. At width 32 the form is
22 cells wide and 5 cells high; at width 24 it is 14 cells wide and 7 cells high
after wrapping values. Fractional button tracks (10.5 or 6.5) project by flooring
absolute exact dyadic edges, as in the existing proof, rather than rounding each
width. Tests assert engine rectangles, cell positions/widths, complete output,
resize, and rejection of viewport/track overflow; there is no silent clipping.

The shared boundary is the kernel's indexed `BoxView` plus synchronous host
measurement and host rendering. Rows/Columns here are generic layout directions;
document Row wrappers impose their own atomic/pagination and scheduling rules.
Production PDF Rows and standalone Columns now use the same staged box engine.
Staged means runtime allocation/measurement/completion, not Git staging; this TUI
uses the synchronous convenience API sharing those internals.
The geometry engine can run synchronously for this TUI, without borrowing those
document policies. No vertical grow, scrolling, keyboard handling, or new engine
capability is claimed. Existing static and fragmentation proofs remain separate.

## Separate kernel-only fragmentation/type proof

```sh
./node_modules/.bin/tsx scripts/tui-layout-proof/fragment-cli.ts
./node_modules/.bin/tsx scripts/tui-layout-proof/fragment-cli.ts --two-regions
```

This entrypoint uses public kernel boxes/fragmentation and its own cell-unit
provider; it prints geometry/count JSON, not the live Formbar form. It requires
neither Formbar nor historical Git. The public consumer type proof is separately
in `tests/consumer/types/kernel-fragmentation-template.ts` (`npm run test:consumer`).

Generic fragment utilities remain a separate shared-package subpath so terminal
providers do not acquire document/PDF dependencies. Root and box-only graphs do
not retain fragmentation; hosts still own region policy and rendering.
