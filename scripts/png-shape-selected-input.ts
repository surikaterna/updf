export function pngShapeSelectedInput(extract: boolean): string {
  return `
import {render} from '@updf/core';
import {ownedResourceBytes} from '@updf/core/resources';
import {preparePng,pngProvider,png} from '@updf/png';
${extract ? "import {preparePngShape} from '@updf/text-flow/png-shape';" : ""}
export async function proof(bytes){
 const resource=await preparePng(bytes),before=ownedResourceBytes(resource);
 const image=png('image',{x:0,y:0,width:20,height:20});
 const children=[image];let commands=0;
 ${
   extract
     ? `const shape=await preparePngShape(resource);
 if(shape.kind==='contours'){commands=shape.commands.length;children.push({type:'path',commands:shape.commands,paint:{fill:[1,0,0],fillRule:shape.fillRule}});}`
     : ""
 }
 const pdf=render({version:1,pages:[{width:30,height:30,children}]},{resources:{image:resource},providers:[pngProvider()]});
 return {pdf:Array.from(pdf),commands,before,after:ownedResourceBytes(resource)};
}`;
}
