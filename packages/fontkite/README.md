# `@updf/fontkite` — experimental lightweight TrueType preparation

An opt-in alternative to `@updf/fontkit`, not a drop-in replacement for the
Fontkit library. Both adapters produce the same `@updf/fonts` `PreparedFont`.
Existing consumers and the Fontkit adapter are unchanged. This private prototype
is not published and should not yet be treated as a general-purpose font parser.

```ts
import { prepareFont } from "@updf/fontkite";

const font = prepareFont(trustedStaticTrueTypeBytes);
// Use with the existing @updf/fonts runtime/provider and @updf/text service.
```

Optional loading stays under this package, outside the default runtime graph:

```ts
import { createAssetLoader } from "@updf/assets";
import { loadFont } from "@updf/fontkite/load";

const loader = createAssetLoader({ fetch: globalThis.fetch });
const font = await loadFont("https://example.com/static-font.ttf", { loader });
```

Byte sources need no loader. URI sources require explicit transport capability;
there is no implicit global fetch, font fallback, or Fontkit fallback. Future
capabilities can use subpath exports such as `/subset` or `/woff2`; these exports
do **not** exist yet. Subpaths isolate bundled JS, not installed package contents:
`@updf/assets` is an installed dependency but is not retained by the default entry.

Custom loaders require enumerable own function properties for both `resolve` and
`load`, even for byte sources. Getters and inherited methods reject without
execution. Validation does not call `resolve`; only the captured `load` function is
called, with the original receiver and source. Unstructured loader failures become
`FONT_LOAD` at `/font/source`,
without coercing the thrown value. Loader `DocumentError`s are preserved, and
`AssetError` keeps its diagnostic mapping (`LOAD` becomes `FONT_LOAD`). Subsequent
byte/format/rights/limit errors are not relabelled as transport failures.

## Supported prototype profile

- Single-face static TrueType sfnt (`0x00010000` or `true`) with `glyf` outlines.
- Unicode cmap format 4 or 12; format 12 is preferred, then Windows over Unicode
  platform records of the same format. Unsupported cmap subtables are not used.
- OS/2 version 2–5 with explicit cap height; name table format 0 with a Unicode
  PostScript name (Windows English preferred, otherwise first supported name).
- Horizontal advances, actual unhinted quadratic-outline ink bounds (rounded
  outward to font units), empty glyphs, and XY-positioned composite glyphs with
  unscaled offsets. Scale and affine component transforms are supported.
- Existing simple LTR Latin/Cyrillic and common punctuation/spacing profile from
  `@updf/fonts`, not all Unicode characters advertised by the font.
- Full original font-program embedding; no-subsetting rights remain respected.

Point-attached composites and explicitly scaled component offsets are rejected
when reached. OS/2 v0/v1, non-Unicode names, and other cmap-only fonts are outside
this prototype, even if Fontkit could read them. Fontkite computes the outward
integer bounds of quadratic extrema using exact rational arithmetic over the
decoder's finite binary64 coordinates. Integer/half-integer points use small
integers; other dyadics reuse the kernel's binary64 helpers. This certifies the
extrema rounding, not the preceding floating-point composite transforms or implied
midpoints. General bit-for-bit parity with Fontkit's curve implementation and all
composite conventions is not promised. Two bundled Liberation Sans faces
currently match every prepared metadata field and the comparison PDF bytes.

No kerning, shaping, bidi, fallback, variable fonts, collections, CFF, WOFF/WOFF2,
color/bitmap fonts, or subsetting. Fontkit's adapter still has its own explicit
profile; selecting it does not automatically enable those document capabilities.

## Bounds and safety

Input is copied, and every read is bounded to its table or glyph. Directory
duplicates/overlaps, selected cmap ranges, loca ranges, point streams, composite
references/cycles, and required metrics are checked. Limits per preparation:

- 4 MiB input; 128 tables and 128 cmap records.
- 65,535 format-12 inventory entries/groups; format-4 inventory is bounded by BMP.
- 16 nested glyph decodes, 65,535 decoded component records.
- 1,000,000 decoded/expanded points, including composite reuse. Glyph bounds are
  cached so character aliases cannot multiply outline-bound work.

The parser checks declared embedding restrictions, not legal ownership. It does
not verify table checksums, execute/validate hinting bytecode, fully validate
unused tables/glyphs, or sanitize the original embedded font. Use trusted fonts;
these structural/work limits are **not** a malicious-font or downstream PDF
viewer sandbox. Unsupported/malformed inputs fail with `DocumentError`; parser
work-limit failures use `LIMIT` and embedding restrictions use `FONT_RIGHTS`.

## Reproduction

From the workspace root:

```sh
npm run typecheck
npx tsx --test packages/fontkite/test/*.test.ts tests/consumer/fontkite-*.test.ts
npx tsx scripts/consumer/fontkite-cost.ts
```

The cost script compares equivalent browser applications and preparation-only
entry points, asserts emitted dependency isolation, executes both browser ESM
application bundles in Node, and compares PDF bytes for both fixture faces.
It writes reports/PDFs under ignored `artifacts/fontkite/`. Preparation timings
are local warmed medians, not a performance guarantee. Font assets and PDF size
are unchanged: this experiment reduces JavaScript, not embedded font programs.

For broader compatibility testing, see the [on-demand corpus](../../docs/font-corpus.md)
and [current bounds evidence](../../docs/evidence/fontkite-bounds-fix.md). The optional
independent bounds check passes the current corpus while preserving the reported
Fontkit disagreements; exact parity is not used as a substitute for correctness.
This does not imply general compatibility. The cost script also measures pre-prepared
JSON metadata plus original font bytes, not just the JavaScript bundle alone.
