# S5a.1 generic visual seam — implemented, ready for independent audit

Issue: N/A. This is implementation evidence, **not independent verification**.
Image, `images()`, image codecs/transport/geometry, S5a.2 and URL/S5b are **not
implemented**. No staging, commits, pushes, PRs, tracker mutations or delegation.

## Revision, scope and preservation

- Worktree: `/home/sprawl/projects/updf/trees/text-flow-design`.
- Branch: `feature/text-flow-design`.
- Base/HEAD: `fbf2f78fd59635c6b965f2a707f35508dc1e4392`.
- Original inherited scope: 70 tracked dirty + 27 untracked; 1,626 source paths.
- Completion inherited scope: 73 tracked dirty + 34 untracked, including the
  preceding generic-seam owner's 8 changed + 7 added paths. All were preserved.
- Original archive: `/tmp/opencode/updf-s5a1-current-baseline-20261023.tar.gz`.
  Original source/protected hashes and four frozen harness copies:
  `/tmp/opencode/updf-s5a1-before-20261023/manifest.json` and sibling files.
- Checkpoint hashes: `/tmp/opencode/updf-s5a1-checkpoint-state.json`.
- Final scope: 74 unstaged tracked modifications + 37 untracked paths; no staged
  files or new commits. `artifacts/text-flow/image-visual-seam-final/preservation.json`
  records exact hashes and deltas against **both** baselines. The completion adds
  the bridge, regression tests, consumer fixtures and cohesive evidence harnesses;
  inherited core/app/authoring migrations are not completion-owned changes.
- All 80 served showcase files, 5,288 historical artifacts, two HTTP fingerprints
  and preview PID 665048 remain unchanged. No app source, core, Paginator, math,
  font, image or geometry owner was changed. Browser/package build outputs were
  refreshed; the showcase was built only to the isolated path below.

## Owners and contracts

`extensions.ts` remains the installation owner. It recognizes only its owned
adapter sets, merges central and explicit local sets, accepts the same adapter
identity idempotently, and rejects conflicting same-name identities. Existing
compiler and bound measurement contexts transport the installation. The lazy
operation cache avoids repeated merges; no-contribution operations keep their
local installation without allocating a merge.

The private `internal-visual` factory creates a branded component and paired
outer/child adapter set. The lightweight ownership leaf is shared with `floatable`;
normal root imports do not retain the optional visual factory graph. Both routes
capture the same canonical Block and atomic child. Floating uses existing manual
participation and captured-body transport, not a second wrapper or painter.

The authorized private bridge lives in **existing `adapter-content.ts`**, not
public `content-measure`. `measureActualBlockContent` creates a private constraints
identity, opts that request into a lazy WeakSet, invokes the existing context
measurer once, and removes the identity in `finally`. Descriptor copying preserves
invalid array/prototype/accessor inputs for the usual validation instead of
reading getters or silently accepting them. Nested requests do not inherit opt-in.

After ordinary constraints validation and normalization, opted requests require
exactly one canonical Block and no constraints style wrapper. The existing compile,
complete selection/preparation, painting and native-ink validation run once.
Metadata is attached to the **final emission-aware snapshot identity**, never to a
copy: frozen width comes from the prepared root's natural size, height from the
actual selected/decorated fragment sum, not the bare natural hint or ink bounds.
The metadata owns only scalar size, lifetime and source path. `contentActualSize`
rejects unowned, forged, spread/copied and closed-lifetime reports; it exposes no
PreparedBlock or operation handle. There is no public constraints field, context
method, context registry or global current-request flag.

Ordinary visual measurement consumes that actual size during measurement and
returns one atomic unit with the same measured nodes. Public adapter measurement
still reports allocated width 100 for a 30×20 Block; only the private owned metadata
reports 30×20. Ordinary visuals now advertise width 30 rather than host width 100.
The floating run's host placement still spans its 100-point flow region; the visual
border-box/native coordinates and ink match the ordinary 30×20 canonical Block.
Unclipped identity paint groups may differ; they do not add box arithmetic.

Generic visuals reject `style.marginTop: "auto"` at the original authored field;
normal kept Block alignment remains supported. Existing floating margin limits
are unchanged. Floating metadata is read only as own data, never inherited values
or getters. No numerical comparison policy or native certificate changed.

## Risk-based coverage and checks

New/extended tests cover actual versus allocated size, exact report identity,
frozen scalars, closed lifetimes, one context call/capture/child measurement/query,
nested private and ordinary measurements, success/exception request cleanup,
array/root/style/width validation, and decorated actual height differing from its
natural hint. Visual tests compare plain Block native coordinates/ink with padded,
bordered/background, min/max, hidden/error overflow and ordinary/floating routes;
they also cover original style paths and getter/prototype refusal.

Central-installation tests cover Block/Row/Column, regions, table/inline adapters
inside nested bound measurement, exact identity idempotence/conflicts, missing,
structurally forged and foreign-instance installations, and options snapshots.
Path/ordinary/floating coexistence retains existing source keys and participation.
Generic packed types preserve required/literal visual props and mandatory floating
style. The packed fixture actually paints ordinary + floated visuals using mixed
`import`/`require` owners, without source aliases. No Image-specific type was added.

Commands run serially from this worktree unless stated otherwise:

- `npm exec -- tsx --test packages/layout/test/adapter-content-actual-size.test.ts packages/layout/test/central-adapters.test.ts packages/text-flow/test/owned-visual.test.ts packages/layout/test/natural-complete.test.ts packages/layout/test/prepared-line-reports.test.ts packages/text-flow/test/own-source-handlers.test.ts`:
  focused bridge/visual and owner regressions pass; the final full suite includes
  the later table/inline and nested-private additions.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`: pass;
  the final root suite has **1,636 passed, zero failed**.
  Lint includes the project file/function/nesting checker. Final logs use
  `/tmp/opencode/updf-s5a1-final-*`; no approved principle exceptions.
- `npm run build:browser` then `npm run check:graphs`: pass against fresh outputs.
- `npm run test:consumer`: all fifteen clean external tarball closures pass,
  including NodeNext/Bundler and mixed-loader visual ownership. An initial combined
  command timed out; the standalone rerun completed.
- `npm exec -- vite build --config apps/showcase/vite.config.ts --outDir /tmp/opencode/updf-s5a1-final-showcase-20261023-5B5hm8`:
  pass. No app build/restart touched the protected served dist.
- `SHOWCASE_OUT_DIR=/tmp/opencode/updf-s5a1-final-showcase-20261023-5B5hm8 npm run test:browser`
  and the same environment with `npm run test:showcase`: **22/22** and **105/105**
  pass in `/tmp/opencode/updf-s5a1-final-runtime-5B5hm8`, a disposable test/scripts/
  app/example mirror sharing package outputs. Its artifact writes cannot overwrite
  historical worktree artifacts. Earlier incomplete mirror/JSX configuration runs
  failed; they were corrected, not waived. A 300-second showcase attempt was
  interrupted; the final 600-second allowance completed normally.

Code-principles self-check: correctness and unsafe-pattern review completed;
defaults followed with no approved exception; files remain cohesive and at most
400 lines; functions under 50 lines and control-flow nesting at most three;
comments explain intent/invariants; boundary/regression coverage is proportional
to risk; lint/typecheck/tests pass. No Changesets infrastructure is used here.

## Paired costs, absolute profiles and retained graphs

Final cost command:
`npm exec -- tsx scripts/text-flow-costs.ts --out artifacts/text-flow/image-visual-seam-final --compare /tmp/opencode/updf-s5a1-before-20261023/report.json`.
It rebuilds packages before measuring emitted browser/Node raw/minified closures
and tarball payloads. All 286 original metrics remain paired; 16 visual metrics
are new absolute costs, not fabricated before/after pairs.

`node /tmp/opencode/updf-s5a1-fresh-baselines.mjs` independently rebuilt the
original archive after checking all 1,626 source hashes, then reconstructed and
hash-checked checkpoint runtime/package/harness sources. Both rebuilt sets reproduce
all 286 recorded metrics **exactly**. `fresh-baselines.json` retains paths and
provenance. Neither historical baseline files nor harness tables were overwritten.

| Metric, bytes | Original | Checkpoint | Final | Final − checkpoint | Final − original |
| --- | ---: | ---: | ---: | ---: | ---: |
| Core package compressed | 139,097 | 139,097 | 139,097 | 0 | 0 |
| Core package unpacked | 813,949 | 813,949 | 813,949 | 0 | 0 |
| Layout package compressed | 199,327 | 203,445 | 204,646 | +1,201 | +5,319 |
| Layout package unpacked | 1,213,698 | 1,235,345 | 1,242,770 | +7,425 | +29,072 |
| Text-flow package compressed | 40,920 | 41,484 | 41,543 | +59 | +623 |
| All packages compressed | 728,952 | 733,634 | 734,894 | +1,260 | +5,942 |
| Ordinary layout browser minified | 184,909 | 185,768 | 186,112 | +344 | +1,203 |
| Ordinary layout browser gzip | 59,839 | 60,154 | 60,281 | +127 | +442 |
| Rectangle siblings browser minified | 235,380 | 236,544 | 236,989 | +445 | +1,609 |
| Rectangle siblings browser gzip | 76,402 | 76,820 | 76,984 | +164 | +582 |

These are real additional costs of the generic installation/ownership seam and
private actual-size branch. They are **not** an optimization or a micro-cost
budget waiver. Core emitted/package/drawing metrics are all exactly unchanged.
No unrequested Image, codec, SVG or font-parser graph is retained by these profiles.

`npm exec -- tsx scripts/visual-seam-evidence.ts` writes `summary.json`: complete
original and checkpoint comparisons, source-pair hashes, fresh unshaken CJS module
inventories and bytes, and three fresh-process timing samples per new visual
profile. Ordinary layout unshaken CJS grows 4,593 bytes/one module versus original
(1,819 bytes/zero modules versus checkpoint); rectangle siblings grows 6,127 bytes/
two modules (2,070 bytes/zero modules versus checkpoint). Drawing and ordinary text
unshaken bytes/modules are unchanged. Factory/predicate graph separation is checked
for both shaken consumers and unshaken loads.

New real profiles paint the **same 30×20 box**, padding 2, border 1, green background
and blue native rectangle. Ordinary browser minified/gzip is **174,428/55,725**;
floating is **214,071/68,637**. Both browser/Node raw/minified graphs are retained.
Absolute local timing samples include cold import, first layout, five batches of
100 warm layouts after 20 warmups, and post-GC heap deltas. These noisy samples
are evidence, not a speed or memory-leak claim; no historical timing pair exists.

The full historical `artifacts/text-flow/library-baseline/report.json` comparison
is also retained separately in `summary.json`, including its actual revision,
source hashes, flags and differing lock identity. It is context for inherited
feature cost, **not** a same-lock matched slice comparison. No old cost disappears.

## Handoff

All S5a.1 acceptance is implemented and ready for independent Auditor review of
the actual uncommitted scope and paired evidence. Confirm ownership/lifetime and
emission identity, canonical Block/native geometry, preserved S2/S3 behavior,
packed types/load ownership, and the explicitly nonzero ordinary-consumer costs.
Image S5a.2 and URL/S5b remain separate, unimplemented assignments.
