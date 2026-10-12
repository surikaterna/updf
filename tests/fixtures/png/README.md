# Original PNG alpha artwork

The 32×24 samples are original synthetic artwork, Copyright (c) 2026 Surikat AB,
under the repository MIT license. No external image assets or trademarks are used.

`color-alpha.png` is 8-bit RGBA; `gray-alpha.png` is 8-bit grayscale+alpha.
Both are non-interlaced. The four quadrants have opacity 255, 128, 0 and 255 in
reading order. The transparent quadrant deliberately retains blue (or gray)
color samples to demonstrate straight alpha rather than premultiplication.

Regenerate from the worktree root with:

```sh
npx tsx tests/fixtures/png/generate.ts
```

The generator uses Node zlib; preparation uses native Web Compression Streams.
Browser assets are fetched only when selected; generation is development-only.
