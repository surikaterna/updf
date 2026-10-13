import type { Asset, CorpusFont, Expectation } from "./types.js";

interface Source {
  readonly repo: string;
  readonly revision: string;
  readonly license: Asset;
}
function asset(repo: string, revision: string, path: string, size: number, sha256: string): Asset {
  return { url: `https://raw.githubusercontent.com/${repo}/${revision}/${path}`, size, sha256 };
}
function source(repo: string, revision: string, path: string, size: number, sha256: string): Source {
  return { repo, revision, license: asset(repo, revision, path, size, sha256) };
}
const sans = source(
  "adobe-fonts/source-sans",
  "87b37a2daaed80fcb8e8ccb0085c4d72ddade12e",
  "LICENSE.md",
  4486,
  "56af9b9c6715597e458284a474dc118a50a4150e9d547c70f7b4a33c3e6a9328",
);
const serif = source(
  "adobe-fonts/source-serif",
  "80d3f8894c09c937bebfa9011247d2e1c79fd6f4",
  "LICENSE.md",
  4491,
  "c21d7293d87b6d7ab1d0229a2f55b77f33a7613a6a4e66f6693d68d7d8d09464",
);
const mono = source(
  "JetBrains/JetBrainsMono",
  "19371302b95d218af43299bce79ddbddd0bc364d",
  "OFL.txt",
  4399,
  "a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697",
);

function face(
  owner: Source,
  id: string,
  path: string,
  size: number,
  sha256: string,
  tags: string,
  expected: Expectation = { kind: "supported" },
): CorpusFont {
  return {
    id,
    font: asset(owner.repo, owner.revision, path, size, sha256),
    license: owner.license,
    licenseId: "OFL-1.1",
    tags: ["upstream", ...tags.split(" ")],
    expected,
  };
}
function unsupported(reason: string): Expectation {
  return {
    kind: "unsupported",
    code: "FONT_FORMAT",
    message: "Expected single-face glyf TrueType, not TTC/WOFF/CFF",
    reason,
  };
}
export const upstreamFonts: readonly CorpusFont[] = [
  face(
    sans,
    "sourcesans3-regular",
    "TTF/SourceSans3-Regular.ttf",
    431196,
    "4644c81b86ec9caaa76b634889968ed3c4f4f52f054855933acc7c2b21e53b0f",
    "sans regular cmap12 os2-v3 loca-long",
  ),
  face(
    sans,
    "sourcesans3-bold",
    "TTF/SourceSans3-Bold.ttf",
    428176,
    "9214b9d95e4231c609802815c2646c98174e2102d0d37f88978a7f8e71006e6a",
    "sans bold cmap12 os2-v3 loca-long",
  ),
  face(
    sans,
    "sourcesans3-italic",
    "TTF/SourceSans3-It.ttf",
    315812,
    "192afd78f0f54a3c69eaf02d43f4d9a821e9d6110e41d3d25d61a7385cd580e4",
    "sans italic cmap12 os2-v3 loca-long",
  ),
  face(
    sans,
    "sourcesans3-light",
    "TTF/SourceSans3-Light.ttf",
    414692,
    "fcc10d83a12844e7dc699b1bb85f65f0d1bb0179de216feb5d28f806500f7cef",
    "sans light cmap12 os2-v3 loca-long",
  ),
  face(
    sans,
    "sourcesans3-cff",
    "OTF/SourceSans3-Regular.otf",
    334924,
    "08df266400933d3178d081a45f94a08814c3e55b4b7dd2e0ff69cb1329f13ab6",
    "cff unsupported",
    unsupported("CFF OpenType is outside the glyf TrueType profile"),
  ),
  face(
    sans,
    "sourcesans3-woff2",
    "WOFF2/TTF/SourceSans3-Regular.ttf.woff2",
    109632,
    "53492fb3a0def77354f166a55d09b63a10855e91c206c7620a81cf56e97f8ec3",
    "woff2 unsupported",
    unsupported("WOFF2 containers require an optional decoder"),
  ),
  face(
    serif,
    "sourceserif4-regular",
    "TTF/SourceSerif4-Regular.ttf",
    261868,
    "e5a4ee6a3d87bb9024796be390c6771e2a0eb1883dae25effaf57ca01668e24b",
    "serif regular cmap12 os2-v3 loca-short",
  ),
  face(
    serif,
    "sourceserif4-bold",
    "TTF/SourceSerif4-Bold.ttf",
    271568,
    "7cf4f4e1ad74f45058d5bc61716b82560442fbdcd9d3654d2dea96bf6c683d86",
    "serif bold cmap12 os2-v3 loca-short",
  ),
  face(
    serif,
    "sourceserif4-italic",
    "TTF/SourceSerif4-It.ttf",
    187808,
    "9d2950a8f1da66e21502c35d646a1d2148e79f9ea43fd2158cf02f5232e7f430",
    "serif italic cmap12 os2-v3 loca-short",
  ),
  face(
    mono,
    "jetbrainsmono-regular",
    "fonts/ttf/JetBrainsMono-Regular.ttf",
    270224,
    "e6fd0d7e91550b3ed2b735d4312474362c4716edc4fc0577a0f61ed782d5aed1",
    "mono regular cmap12 os2-v4 loca-long",
  ),
  face(
    mono,
    "jetbrainsmono-bold",
    "fonts/ttf/JetBrainsMono-Bold.ttf",
    274096,
    "d22c4f3821d725eb01210d278d95dfcfcaadc34699a06658d47c8a5cc5830ada",
    "mono bold cmap12 os2-v4 loca-long",
  ),
  face(
    mono,
    "jetbrainsmono-italic",
    "fonts/ttf/JetBrainsMono-Italic.ttf",
    276084,
    "6dc8e1322d4b2013b64e277bf66abc6748207c46a590471d4296876c2c235d0c",
    "mono italic cmap12 os2-v4 loca-long",
  ),
  face(
    mono,
    "jetbrainsmono-bolditalic",
    "fonts/ttf/JetBrainsMono-BoldItalic.ttf",
    279172,
    "cec9b489af5c98a94cb8d8d8708ef1640cca0f296b207de1f50b2dd95e967bdf",
    "mono bold italic cmap12 os2-v4 loca-long",
  ),
];
export const upstreamRevisions = [sans, serif, mono].map(({ repo, revision }) => ({ repo, revision }));
