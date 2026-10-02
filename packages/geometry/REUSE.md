# Geometry / painting reuse ledger

Legacy source revision:7782bb3ba468a721ef7bd68fedd19b8f6c029d16 in
https://github.com/surikaterna/updf (inspected read-only, root unchanged).
The root package declares MIT and author Surikat AB; no standalone authoritative
project copyright notice was found/recovered. GitHub's license endpoint for that
revision returned404. No copyright name/year was invented. This ledger retains
source attribution; substantial arc math also has independently recovered upstream
MIT permission/notice in LICENSE.svgpath, included in package files.

Upstream arc source referenced by legacy a2c.js:
https://github.com/fontello/svgpath/blob/319b21683ec0af3f73e6cecb86448b1306780a09/lib/a2c.js
License fetched at the same revision:Copyright(C)2013-2015 Vitaly Puzrin, MIT.

| New function | Actual inspected source/function | Decision / reason |
| --- | --- | --- |
| arc-center.unitVectorAngle | vector/a2c.js unit_vector_angle (upstream319b216...) | Adapted TS names; sign/dot clamp/acos math unchanged |
| arc-center.arcCenter | vector/a2c.js get_arc_center | Adapted local scalar names, typed tuple; same endpoint-center math; safety checked by wrapper |
| arc-center.unitArc | vector/a2c.js approximate_unit_arc | Same4/3*tan(delta/4) controls; omit redundant segment-start coordinates |
| arc.arc | vector/a2c.js exported a2c | Adapted radius correction only when lambda>1 and≤90-degree split; immutable mapped output; validate flags/finite overflow; zero radii become line; force exact requested endpoint |
| normalize.endpoint/apply | vector/Context2d.js moveToR,lineToR,hLineTo(R),vLineTo(R),bezierCurveToR | Adapted relative/axis coordinate arithmetic to pure state/output, no Context2d, formatting or hooks copied |
| normalize.curve | Context2d.smoothCurveTo(R) / pathParser command dispatch | Adapted control reflection, corrected source-command gating; generated arc cubics do not incorrectly enable S reflection |
| normalize.quadratic | Context2d.quadraticCurveTo(R) | Replaced incorrect PDF v shortcut with exact quadratic-to-cubic formula (v is not quadratic) |
| scanner.arity / normalize.parsePathData | svg/pathParser.js npec/process repeated-M dispatch | Retained arities and repeated M->L semantics; replaced regex find-all/splice with strict full-consuming numeric scanner, signed exponents and compact flags |
| shapes.polygon | Context2d.polygon/polyline + svg/Polygon.js,Polyline.js | Adapted move/line/optional close pattern; no splice or caller mutation; Polygon legacy accidentally used polyline (fixed) |
| shapes.ellipse | Context2d.ellipse reviewed | Independently expressed standard four-cubic k=4*(sqrt(2)-1)/3 math; not literal SO extraction or rounded KAPPA copy |
| color.parseColor | vector/parseColor.js | Adapted short/long hex and rgb extraction; anchored validation, bounded channels, alpha no longer divided255/discarded; minimal named colors explicit |
| painting/pdf.operation | svg/_renderOp + Context2d fill/stroke/fillAndStroke | Adapted truth-table selection; explicit null/width0, evenodd f*/B*, no arbitrary operators; remove redundant B n |
| painting/pdf.painted / core/content group | svg/_applyStyles + Context2d transform/save/restore | Adapted RGB operator/matrix/q-Q concepts, not callbacks/context; validated six-coefficient affine, line/dash/alpha/clip support and state isolation |
| painting affine/bounds/style | No suitable pure legacy helper | New small validated modules; true transformed cubic extrema and conservative stroke/cap/join stretch bounds were absent |

Rejected reuse:vector/solveArc.js scales radii by lambda even below1 (wrong),
vague Inkscape/pdfkit provenance. Context2d also duplicates arc math and vectorAngle
computes both magnitudes from the first vector; not copied. The507-line mutable
Context2d, output hooks, four-decimal formatter, legacy binding/mutation and
console-skip/continue paths are not ported. svg/style/XML parsing is PASS2, not
silently claimed as completed here. Images remain deferred; roadmap drafts are
Diplomat-owned and were not edited.

Assessment: reusable math/arity/dispatch families are small and testable; legacy
state/style/parser coupling was not safe wholesale. Regressions cover all command
families, radius/flag/close/reflection fixes, strict consumption, immutable helpers,
native typed bounds and independent PDF raster/byte/state/resource behavior.
