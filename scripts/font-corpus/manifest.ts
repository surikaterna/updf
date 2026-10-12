import { type Asset, type CorpusFont, validateCorpus } from "./types.js";

export const revision = "66928797f271fed5ee428544e7229685e2d90127";
const licenses: Readonly<Record<string, readonly [number, string]>> = {
  lato: [4407, "74ba064d03f1f1c4a952da936c3eb71866c34404916734de3cae73b34357e59e"],
  ptserif: [4434, "ddf311c28ddf5a5ad9747649837346b67bed9d356789c3072bb27dbce49e514d"],
  ptsans: [4425, "2758cf7a872827f39661cf8cc24188113c030447aefb5ca7145993650076ca8c"],
  ibmplexmono: [4456, "7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da"],
  inconsolata: [4350, "29bd0cfd0fb2a45f9b057c834a057724bae1f63b525a8ac83d3e7525706d9f80"],
  crimsontext: [4393, "50fd67cddc097377a5c871e8452b778bc5aedfa3480a705cb27c5e3a078218df"],
  anton: [4484, "ee67e6ee22790b7929f1a3769ca2801d565c64b5a9096942c1adf5596de9c9e4"],
  roboto: [4394, "061402327a96aadb0bfb694a960ed289ecd38d383e396243831ab81feb109c41"],
  notosans: [4396, "cee9892f9f0cc8fe882c9e9537ee6a89621d86ee7ceaf70b02e2b2b1c25c061a"],
};
type Selection = readonly [family: string, file: string, size: number, sha256: string, tags: string];
const selections: readonly Selection[] = [
  [
    "lato",
    "Lato-Regular.ttf",
    656568,
    "d636e4683231f931eda222d588e944d082bfd3bdba02f928bee461c0f185b251",
    "sans regular upem-2000 loca-long",
  ],
  [
    "lato",
    "Lato-Bold.ttf",
    656544,
    "8a0aace75d33794eece4b28187bfc1df0bbd2888b5d8a56e01788c8d65d16be1",
    "sans bold upem-2000 loca-long",
  ],
  [
    "lato",
    "Lato-Italic.ttf",
    722900,
    "e399c44efe1387100531d26c7e4800c5d12251b890d6654a3098c7c679cb1786",
    "sans italic upem-2000 loca-long",
  ],
  [
    "ptserif",
    "PT_Serif-Web-Regular.ttf",
    359048,
    "a4951fade06ff8f09b7673aa81ffb65a8cd409e24d3289a6dc670bc4dda2557a",
    "serif regular os2-v3 loca-long",
  ],
  [
    "ptserif",
    "PT_Serif-Web-Bold.ttf",
    339996,
    "038ba7336bd7ea14f12ad155bed51a4345cac5153275d521dec3ba04021c526e",
    "serif bold os2-v3 loca-short",
  ],
  [
    "ptserif",
    "PT_Serif-Web-Italic.ttf",
    375356,
    "f57e95ff9dc85691a3b2e193f2028db36f6663939a46c0fc4f286d618b80b7ce",
    "serif italic os2-v3 loca-long",
  ],
  [
    "ptsans",
    "PT_Sans-Web-Regular.ttf",
    442960,
    "9cc831490532009bae2b3ce0d39c62adfc889060beb421593bfd9d2396d0f10a",
    "sans regular os2-v3 loca-long",
  ],
  [
    "ptsans",
    "PT_Sans-Web-Bold.ttf",
    470240,
    "3128bd5ecf01816e59a23d54c57a7a6b14615b07db53ff277c77376010265b05",
    "sans bold os2-v3 loca-long",
  ],
  [
    "ptsans",
    "PT_Sans-Web-Italic.ttf",
    436452,
    "5a90fe2d0cd798700935240580bdcc12c0ffc9102c0c7163b3418e13bc21debd",
    "sans italic os2-v3 loca-long",
  ],
  [
    "ibmplexmono",
    "IBMPlexMono-Regular.ttf",
    135580,
    "6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46",
    "mono regular loca-short",
  ],
  [
    "ibmplexmono",
    "IBMPlexMono-Bold.ttf",
    137784,
    "ac27abd6450a64dd94467580a02fe6235156d5b92f2926ebbc8e7489df64e0be",
    "mono bold loca-short",
  ],
  [
    "ibmplexmono",
    "IBMPlexMono-Italic.ttf",
    143920,
    "3362fc791b0652193328b862c1c5f23a789bc7288b1617fa63302f88689a2a34",
    "mono italic loca-short",
  ],
  [
    "inconsolata",
    "static/Inconsolata-Regular.ttf",
    105628,
    "0f11ac40d1618e1aa1adb7322a14980a0b0c943421124022073f83236d15f0d5",
    "mono regular loca-short",
  ],
  [
    "inconsolata",
    "static/Inconsolata-Bold.ttf",
    107220,
    "69deb4d3626bcdce00331458e62de49e0ae58236626841014939dd8c5119abb4",
    "mono bold loca-short",
  ],
  [
    "inconsolata",
    "static/Inconsolata-CondensedRegular.ttf",
    105580,
    "a39d4d3a256fb07ee56e2b2e508daf1113e7f09f7f65ba7b012d7781f43a04d3",
    "mono condensed loca-short",
  ],
  [
    "crimsontext",
    "CrimsonText-Regular.ttf",
    107200,
    "48e6c5d5ad1d01599d374ecb817e15890d1feb3b8a3a88e527d44c90389e1f06",
    "serif regular upem-1024 loca-short",
  ],
  [
    "crimsontext",
    "CrimsonText-Bold.ttf",
    112796,
    "a3a0765fc5e8d0b49b540a23aefe0184887dd79f06a0bdf4db7035cea6befa93",
    "serif bold upem-1024 loca-short",
  ],
  [
    "crimsontext",
    "CrimsonText-Italic.ttf",
    110216,
    "4ed1699ac7c64e8b3d33f6bb8323c3d7206b0d7bacb9ee2d65c697e6014d29de",
    "serif italic upem-1024 loca-short",
  ],
  [
    "anton",
    "Anton-Regular.ttf",
    170812,
    "a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab",
    "display regular upem-2048 loca-short",
  ],
  [
    "roboto",
    "Roboto[wdth,wght].ttf",
    488584,
    "d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134",
    "variable unsupported",
  ],
  [
    "notosans",
    "NotoSans[wdth,wght].ttf",
    2049096,
    "bfb7bb691513f12e734dc346c03a03f784912432d7e3fa8e56efcf906fe86b3d",
    "variable unsupported",
  ],
];

function asset(path: string, size: number, sha256: string): Asset {
  return {
    url: `https://raw.githubusercontent.com/google/fonts/${revision}/${path.split("/").map(encodeURIComponent).join("/")}`,
    size,
    sha256,
  };
}
function font([family, file, size, sha256, labels]: Selection): CorpusFont {
  const license = licenses[family]!;
  const tags = labels.split(" ");
  return {
    id: file
      .replace(/^static\//u, "")
      .replace(/\.ttf$/u, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/-$/u, ""),
    font: asset(`ofl/${family}/${file}`, size, sha256),
    license: asset(`ofl/${family}/OFL.txt`, license[0], license[1]),
    licenseId: "OFL-1.1",
    tags,
    expected: tags.includes("variable")
      ? {
          kind: "unsupported",
          code: "FONT_FORMAT",
          message: "Unsupported font table HVAR",
          reason: "Variable fonts are outside the static profile",
        }
      : { kind: "supported" },
  };
}
export const corpus: readonly CorpusFont[] = selections.map(font);
validateCorpus(corpus);
