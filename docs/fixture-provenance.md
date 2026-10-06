# Current fixture reproduction and historical-document boundaries

Some original README/REUSE/roadmap files are migration hash-protected. They remain
byte-preserved historical records, not current installation commands or live status.
In particular, `docs/roadmap/README.md` and its original issue bodies describe the
`7782bb3` proof; [current.md](roadmap/current.md) is the maintained status index.
Geometry/SVG `REUSE.md` ledgers describe their inspection stage: project attribution
is now resolved as Copyright (c) 2026 Surikat AB in full MIT licenses. Their old
deferred-image/layout wording does not override today's APIs. SVG still rejects
embedded SVG images; separate [JPEG placement](jpeg-images.md) does not broaden it.

## Prepared font fixture (developer only)

The protected font-fixture README retains its original subtree-relative commands.
Current commands below run from the repository/worktree root with Python/pip and a
new temporary environment. FontTools **4.61.0** is a developer metadata tool,
not an npm/runtime dependency. Do not reuse a nonempty venv belonging to another owner.

```sh
python3 -m venv /tmp/opencode/updf-fonttools-reproduction
/tmp/opencode/updf-fonttools-reproduction/bin/pip install FontTools==4.61.0
/tmp/opencode/updf-fonttools-reproduction/bin/fonttools ttx -t GlyphOrder -t cmap -t head -t maxp -t hhea -t hmtx -t glyf -t OS/2 -t post -o /tmp/opencode/updf-liberation-reproduction.ttx tests/fixtures/fonts/LiberationSans-Regular.ttf
npx tsx scripts/prepare-fixture.ts /tmp/opencode/updf-liberation-reproduction.ttx
```

The last command intentionally overwrites `tests/fixtures/fonts/liberation-sans.json`;
it is not a normal build gate. No font regeneration was performed by this sweep.
The original font/metadata bytes, licenses and SHA-256 evidence remain unchanged.
For pinned upstream archive, regular/bold face hashes and embedding rights see
[original provenance](../tests/fixtures/fonts/README.md) and
[freight provenance](../tests/fixtures/fonts/FREIGHT.md). Preparation checks metadata
and owns bytes; it does not prove program/metric correspondence or grant a license.

## Original JPEG fixture

The four-region 32×24 color/gray artwork is original repository MIT material,
not downloaded photography or customer assets. The fixture generator pins the
full ImageMagick **7.1.2-31 Q16-HDRI x86_64 8309dc92a:20260903** build string;
`hashes.json` records actual outputs. Compiler/delegates are host-development tools,
not JPEG runtime dependencies. See [JPEG generator](../tests/fixtures/jpeg/README.md)
for settings and exact command. ImageMagick encodes fixtures; UPDF never decodes
entropy/pixels. qpdf/Poppler raster tests validate these fixtures independently,
not all structurally accepted or hostile images. No production tarball includes
the fixture images/fonts or their generator.
