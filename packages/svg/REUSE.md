# Optional SVG adaptation ledger

Read-only legacy source: UPDF7782bb3ba468a721ef7bd68fedd19b8f6c029d16,
https://github.com/surikaterna/updf. Root package declares MIT/author Surikat AB;
no standalone authoritative copyright notice was recovered, and none is invented.
Fontello arc reuse retains geometry/LICENSE.svgpath at its pinned upstream revision.

| New responsibility/functions | Inspected legacy family | Reuse/adaptation/replacement |
| --- | --- | --- |
| xml.element/attributes/children/text/parseXML | content/util/parseXml.js Parser._element,_attributes,_attribute,_children,_text,parse | Adapted recursive element/props/children structure, balanced close names and XML head; strict self-close/EOF/quoted duplicate attrs, XML names/namespaces/entities/comments/CDATA, spans and budgets replace permissive Lexer token skipping |
| xml-lex name/comment/entities/sourceCheck | content/util/Lexer.js TokenTypes/rExtract/peek + parseXml token boundaries | Replaced limited token patterns/peek side effects with explicit anchored consumption and full EOF; no DTD/entities/PI execution or external resolution |
| inspect.visit / compile.emit | svg/svgFactory.js map + content/util/transform.js convertProps/transform | Retained SVG/g/path/shape/style/title/defs mapping approach; immutable explicit attribute conversion and strict unsupported features replace binding/context mutation/Number fallback |
| shapes.geometry/rect | svg/Rect,Line,Circle,Ellipse,Polygon,Polyline,Path | Retained attribute families and dispatch, using PASS1 reusable commands/arc/ellipse/polygon; fixed rounded radii semantics, polygon close and zero geometry |
| css.stylesheet/declarations | styles/cssParser.js + util/asStyle.js | Adapted class-rule/declaration structure; strict full consumption/properties/spans/source order replaces split/splice and arbitrary selectors; no !important/at rules/refs |
| style.cascade/apply/resolved | styles/Css.js computeStyles, classRule + svg/Style.js | Retained presentation/inherited values -> class rules -> inline ordering; fixed multiple class tokens and source-order specificity, validated inherited paint copied per shape, no shared mutable style context |
| transform.operation/transform | svg/_applyStyles.js transformer map | Retained named operation dispatch; added scale/center rotation/skew, strict arity/finite composition/full consumption instead of console-skipping |
| viewport.viewBox/viewport/compile root/nested | svg/Svg.js render viewBox/translate/scale | Adapted viewBox translation/scaling to explicit top-left affine/clip; corrected dimension order and meet/slice/none alignment; no legacy style-dimension heuristics/hooks |
| tree.nodeTree/Svg/createSVGTree | svg/SvgFromText wrapper concept | Thin immutable AST->native VDOM bridge; no render hooks, global JSX augmentation, callbacks, serializer access or React |

The legacy CMR logo file in Lynx3 was read only to inventory used features:
viewBox, defs/style, `.cls-*`, fills, path curves/arcs, translate and invalid CSS
`stroke:'none'`. No customer logo coordinates/artwork or signature was copied.
All checked-in logo-like/signature-like comparison fixtures are original simple
unbranded geometry. The invalid quoted none declaration is discarded with an
observable warning exactly like native CSS, never normalized into valid none.
compileSVG reports warnings; renderSVG rejects them unless callers explicitly
choose compileSVG and inspect/accept diagnostics.

Assessment: legacy mapping/parser/class families provide useful structure, but
hooks and permissive style/transform continuation could not enforce the new data
boundary. Pure geometry is reused from PASS1, not duplicated. Unsupported
gradients/filters/masks/use/images/SVG text/references/events fail closed; unknown
style/transform continuation is removed and external fetching is absent.
Legacy asStyle quote stripping incorrectly made quoted none valid; this adapter
instead retains native-CSS discard semantics. Overall opacity other than1 rejects (no incorrect group
alpha distribution). Images and later layout features remain deferred; the
Diplomat-owned roadmap directory and root/monorepo files were not edited.

Correctness refinements: source spans use original UTF16 offsets; style text
concatenates across comments/CDATA and carries decoded-to-original boundary maps.
CSS comments use a forward quote-aware scan, not an unanchored rescanning regex.
Root transforms act outside viewBox around the initial viewport center, with
caller placement/clip outside them. Generic VDOM remapping retains source spans.
Rounded rect mirrors raw radius before separate width/height
clamping. A nested viewport can extend beyond its parent only under an already
bounded ancestor native clip. Node/class/command/source budgets are checked before
further allocation/expansion. Primitive q/Q and byte/resource behavior remain PASS1.

Independent visual criterion: native Chromium SVG image on white versus Poppler
PDF at144dpi, same pixel dimensions; bbox tolerance1 pixel, 1-pixel antialias edge
band excluded, per-channel interior threshold3/255, <=0.5% remaining-ROI mismatch.
All foreground pixels additionally participate in symmetric1px hue/coverage
matching: normalized white-composited contrast hue<=0.08, <=0.5% weighted unmatched
foreground and <=3% ink-mass delta. Same-bbox negative controls reject thin wrong
colors, missing/moved strokes and opacity loss even with zero interior mismatch.
The mass allowance covers measured cross-renderer antialias differences (signature
~2.28%); the comparison no longer ignores all thin-stroke colors in edge bands.
This permits renderer edge rasterization, not arbitrary geometry/color differences.
Actual JSON reports and both PNGs are retained; comparisons are not blind goldens.
