const document = `const document = (text, font) => ({version: 1, pages: [{width: 200, height: 100, children: [{type: 'richText', x: 10, y: 10, width: 180, height: 40, paragraphs:[{runs:[{text}],defaultStyle:{font,fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'}]}]}]});`;
const paragraphs = `paragraphs:[{runs:[{text}],defaultStyle:{font:'Helvetica',fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'}]`;

export function costInputs(historical: boolean, measurer = true, discriminated = historical): Record<string, string> {
  const measurement = `{${discriminated ? "kind:'rich'," : ""}width:100,${paragraphs}}`;
  const fonts = historical ? "@updf/core/fonts" : "@updf/fonts";
  const text = historical ? "@updf/core/measurement" : "@updf/text";
  const composition = historical
    ? `const options = {};`
    : `import { createHelvetica, fontRuntime, fontProvider } from '@updf/fonts';
       import { createTextService } from '@updf/text';
       const runtime = fontRuntime();
       const options = {resources:{Helvetica:createHelvetica()}, text:createTextService({runtime,defaultFont:'Helvetica'}), providers:[fontProvider(runtime)]};`;
  const prepared = historical
    ? `const options = {resources:{Demo:font}};`
    : `const runtime = fontRuntime(); const options = {resources:{Demo:font}, text:createTextService({runtime,defaultFont:'Demo'}), providers:[fontProvider(runtime)]};`;
  const preparedImports = historical
    ? ""
    : `import { fontRuntime, fontProvider } from '@updf/fonts'; import { createTextService } from '@updf/text';`;
  const measureOptions = historical
    ? "const options = {};"
    : `import {createHelvetica,fontRuntime} from '@updf/fonts'; import {${measurer ? "createTextMeasurer" : "createTextService"}} from '@updf/text'; const options = {resources:{Helvetica:createHelvetica()},${measurer ? "measurer:createTextMeasurer" : "text:createTextService"}({runtime:fontRuntime()})};`;
  return {
    drawing: `import {render} from '@updf/core'; export const pdf = () => render({version:1,pages:[{width:200,height:100,children:[{type:'rect',x:10,y:10,width:100,height:50,paint:{fill:[0,0,0],stroke:null}}]}]});`,
    helvetica: `import {render} from '@updf/core'; ${composition} ${document} export const pdf = text => render(document(text,'Helvetica'),options);`,
    prepared: `import {render} from '@updf/core'; import {createPreparedFont} from '${fonts}'; ${preparedImports} ${document} export const pdf = input => {const font = createPreparedFont(input); ${prepared} return render(document('Москва','Demo'),options);};`,
    measurementFonts: `import {measureText} from '${text}'; ${measureOptions} export const measure = text => measureText(${measurement},options);`,
    fontkit: `import {render} from '@updf/core'; import {prepareFont} from '@updf/fontkit'; ${preparedImports} ${document} export const pdf = bytes => {const font = prepareFont(bytes); ${prepared} return render(document('Москва','Demo'),options);};`,
  };
}

export function hostCostInput(discriminated: boolean, measurer: boolean): string {
  return `import {createOwnedResource} from '@updf/core/resources';
    import {${measurer ? "createTextMeasurer" : "createTextService"},measureText} from '@updf/text';
    const runtime = {
      validateResource(){}, validateText(){},
      ${discriminated ? "fixedPolicy:()=>({baseline:'ascent',checkInk:false})," : ""}
      lineMetrics:()=>({ascent:8,descent:2}),
      measure:(_resource,text,_size,${discriminated ? "_mode," : ""}path)=>{
        if(typeof path!=='string'||!path.startsWith('/')) throw new Error('Missing source path');
        return {advance:text.length*5,left:0,right:text.length*5,ascent:8,descent:2,top:-8,bottom:2,empty:!text,run:Object.freeze({})};
      }, joinRuns:()=>Object.freeze({})
    };
    const options={resources:{Helvetica:createOwnedResource({host:true})},
      ${measurer ? "measurer:createTextMeasurer" : "text:createTextService"}({runtime})};
    export const measure=text=>measureText({${discriminated ? "kind:'rich'," : ""}width:100,${paragraphs}},options);`;
}
