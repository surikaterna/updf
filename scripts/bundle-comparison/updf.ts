import { costInputs, hostCostInput, jpegCostInputs } from "../consumer/cost-inputs.js";
import type { Profile } from "./competitors.js";

const textImports = `import {createHelvetica,fontRuntime,fontProvider} from '@updf/fonts';
  import {createTextService} from '@updf/text';`;
const textOptions = `const runtime=fontRuntime(); const options={resources:{Helvetica:createHelvetica()},
  text:createTextService({runtime,defaultFont:'Helvetica'}),providers:[fontProvider(runtime)]};`;
const paragraph = `paragraphs:[{runs:[{text:input.text}],defaultStyle:{font:'Helvetica',fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'}]`;
const textNode = `{type:'richText',x:10,y:10,width:180,height:24,${paragraph}}`;

function imageProfile(text: boolean, jpeg: boolean, png: boolean): Profile {
  const formats = [...(jpeg ? ["jpeg"] : []), ...(png ? ["png"] : [])];
  const imports = formats
    .map((kind) => `import {prepare${kind === "jpeg" ? "Jpeg" : "Png"},${kind},${kind}Provider} from '@updf/${kind}';`)
    .join("\n");
  const prepare = formats
    .map((kind) => `const ${kind}Image=prepare${kind === "jpeg" ? "Jpeg" : "Png"}(input.${kind});`)
    .join("\n");
  const resources = formats.map((kind) => `${kind}Image`).join(",");
  const providers = formats.map((kind) => `${kind}Provider()`).join(",");
  const nodes = formats
    .map((kind, index) => `${kind}('${kind}Image',{x:${10 + index * 70},y:50,width:60,height:40})`)
    .join(",");
  return {
    id: `updf-${text ? "text-" : ""}${formats.join("-")}`,
    library: "uPDF",
    features: `${text ? "Helvetica text + " : ""}${formats.join(" + ")}`,
    source: `import {render} from '@updf/core'; ${imports} ${text ? textImports : ""}
      export function run(input) { ${prepare} ${text ? textOptions : "const options={resources:{},providers:[]};"}
        return render({version:1,pages:[{width:200,height:100,children:[${text ? textNode + "," : ""}${nodes}]}]},
          {...options,resources:{...options.resources,${resources}},providers:[...options.providers,${providers}]}); }`,
  };
}

function nativeTsx(): Profile {
  return {
    id: "updf-text-tsx",
    library: "uPDF",
    features: "Helvetica text + native TSX",
    source: `import {render} from '@updf/core'; import {lower} from '@updf/core/vdom'; ${textImports} ${textOptions}
      export function run(input) { const tree=<document version={1}><page width={200} height={100}>
        <richText x={10} y={10} width={180} height={24} paragraphs={[{runs:[{text:input.text}],defaultStyle:{font:'Helvetica',fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'}]} />
      </page></document>; return render(lower(tree,options),options); }`,
  };
}

function layoutProfile(tables: boolean, extras: boolean, fontkit: boolean): Profile {
  const extraImports = extras
    ? `import {renderSVG} from '@updf/svg'; import {prepareJpeg,jpeg,jpegProvider} from '@updf/jpeg'; import {preparePng,png,pngProvider} from '@updf/png';`
    : "";
  const extrasSetup = extras
    ? `Object.assign(options.resources,{photo:prepareJpeg(input.jpeg),logo:preparePng(input.png)}); options.providers.push(jpegProvider(),pngProvider());`
    : "";
  const table = `table({columns:[{width:100},{width:80}],style:{fontSize:10,lineHeight:1.2,padding:2,border:null},body:[{cells:[{children:input.text},{children:'Value'}]}]})`;
  const images = `{type:'fixed',height:50,children:[jpeg('photo',{x:0,y:0,width:60,height:40}),png('logo',{x:70,y:0,width:60,height:40})]},
    {type:'fixed',height:30,children:[renderSVG(input.svg,{x:0,y:0,w:60,h:30})]}`;
  return {
    id: `updf-${extras ? "full" : tables ? "tables" : "layout"}${fontkit ? "-fontkit" : ""}`,
    library: "uPDF",
    features: `${extras ? "Layout + tables + SVG + JPEG + PNG" : tables ? "Layout + tables" : "Layout + Paragraph/Span"}${fontkit ? " + TTF parser" : " + Helvetica"}`,
    source: `import {render} from '@updf/core'; import {layout,document,flow,paragraph,span,createExtensions} from '@updf/layout';
      ${tables ? "import {table,tableExtension} from '@updf/tables';" : ""} ${textImports} ${extraImports}
      ${fontkit ? "import {prepareFont} from '@updf/fontkit';" : ""}
      export function run(input) { ${textOptions} ${extrasSetup}
        ${fontkit ? "options.resources.Helvetica=prepareFont(input.font);" : ""}
        const children=[paragraph({style:{fontSize:10,lineHeight:1.2},children:[input.text,span({style:{color:[1,0,0]},children:' styled'})]})${tables ? "," + table : ""}${extras ? "," + images : ""}];
        const result=layout(document({children:flow({pageSize:{width:200,height:200},margins:{top:10,right:10,bottom:10,left:10},${tables ? "extensions:createExtensions([tableExtension])," : ""}children})}),options);
        return render(result.document,options);
      }`,
  };
}

function svgProfile(): Profile {
  return {
    id: "updf-svg",
    library: "uPDF",
    features: "Drawing + SVG adapter",
    source: `import {render} from '@updf/core'; import {renderSVG} from '@updf/svg';
      export function run(input) {return render({version:1,pages:[{width:200,height:100,children:[renderSVG(input.svg,{x:10,y:10,w:100,h:50})]}]});}`,
  };
}

export function updfProfiles(): Profile[] {
  const inputs = costInputs(false);
  const base = (id: string, features: string, source: string, call: string, measurement = false): Profile => ({
    id: `updf-${id}`,
    library: "uPDF",
    features,
    source: `${source}\nexport const run = input => ${call};`,
    measurement,
  });
  return [
    base("drawing", "Drawing only", inputs.drawing!, "pdf()"),
    base("text", "Standard-font text", inputs.helvetica!, "pdf(input.text)"),
    nativeTsx(),
    base("measurement-host", "Measurement only, host metrics", hostCostInput(false, true), "measure(input.text)", true),
    base("measurement-fonts", "Measurement only, Helvetica", inputs.measurementFonts!, "measure(input.text)", true),
    base("prepared", "Text + preprocessed TTF descriptor", inputs.prepared!, "pdf(input.prepared)"),
    base("fontkit", "Text + TTF parser", inputs.fontkit!, "pdf(input.font)"),
    base("jpeg", "JPEG only", jpegCostInputs().jpeg!, "pdf(input.jpeg)"),
    imageProfile(false, false, true),
    imageProfile(false, true, true),
    imageProfile(true, true, false),
    imageProfile(true, false, true),
    imageProfile(true, true, true),
    svgProfile(),
    layoutProfile(false, false, false),
    layoutProfile(true, false, false),
    layoutProfile(true, true, false),
    layoutProfile(true, true, true),
  ];
}
