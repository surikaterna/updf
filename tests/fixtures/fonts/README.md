# Liberation Sans prepared fixture

Original unmodified LiberationSans-Regular.ttf and matching LICENSE are from
the Liberation Fonts2.1.5 upstream binary release archive:
https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz

Archive SHA256:7191c669bf38899f73a2094ed00f7b800553364f90e2637010a69c0e268f25d0.
The release's SIL OFL1.1 notice/license accompanies the redistributed font.
No MDS font is used; no system-installed font is assumed to be licensed by its
mere availability. Font file SHA256:
76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8,
410712 bytes. This fixture uses developer-only FontTools preparation;
the parser-independent PDF/fonts entries do not import FontTools/Fontkit.
The isolated optional Fontkit entry is tested against this same unmodified asset.

`liberation-sans.json` is generated prepared metadata (2327 BMP cmap mappings,
2620 glyphs,2048 units/em) from FontTools4.61.0 TTX table dumps, including glyf
ink bounds and hmtx advances. It does not copy a parser into the runtime or
implement shaping/kerning. OS/2 fsType is0 (installable embedding).

Reproduce the developer-only preparation using a temporary FontTools4.61.0
environment, then from the subtree package cwd:

```sh
/tmp/opencode/updf-fonttools/bin/fonttools ttx -t GlyphOrder -t cmap -t head -t maxp -t hhea -t hmtx -t glyf -t OS/2 -t post -o /tmp/opencode/updf-liberation.ttx fixtures/fonts/LiberationSans-Regular.ttf
npm exec -- tsx scripts/prepare-fixture.ts /tmp/opencode/updf-liberation.ttx
```

The TS preparation tool asserts the pinned font digest and installable rights.
The font program is unmodified and fully embedded; the extracted FontFile2 hash
is asserted by tests. The adjacent LICENSE retains the upstream terms/copyright;
trailing blank-line whitespace was normalized without changing its terms.
