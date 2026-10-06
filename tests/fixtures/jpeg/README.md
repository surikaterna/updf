# Original JPEG fixtures

These 32×24 asymmetric four-region images are original test artwork, generated
by `generate.ts`; no downloaded assets or external licenses are involved (MIT,
like this repository). Color regions are red/green above blue/yellow. Grayscale
is derived from the same artwork. `hashes.json` records encoder and SHA-256.

Regenerate with `npx tsx tests/fixtures/jpeg/generate.ts` using the pinned
ImageMagick 7.1.2-31 Q16-HDRI build. Settings: stripped metadata, baseline,
quality 90, standard non-optimized Huffman coding, 444/422/420 or grayscale 1×1.
This development tool is not part of the package or runtime.
