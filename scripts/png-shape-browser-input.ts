export function pngShapeBrowserInput() {
  return `
import {h} from '@updf/core/vdom';
import {render} from '@updf/core';
import {ownedResourceBytes} from '@updf/core/resources';
import {Document,Flow} from '@updf/layout';
import {prepareDocument,layoutPrepared} from '@updf/layout/internal-preparation';
import {Image} from '@updf/images';
import {images,createAssetLoader} from '@updf/images/load';
import {browserPngImages} from '@updf/images/browser-png';
import {createImageCache} from '@updf/images/cache';
import {readPngAlpha} from '@updf/png/alpha';
import {preparePngShape} from '@updf/text-flow/png-shape';
export async function proof(input){
 const bytes=new Uint8Array(input);let fetches=0;
 const cache=createImageCache({maxEntries:2,maxBytes:8388608,maxConsumers:2});
 const loader=createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>{fetches++;return new Response(bytes);}});
 const options={extensions:[images({loader,cache,formatHandlers:[browserPngImages()]})]};
 const doc=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},children:h(Image,{src:'logo',style:{width:20,height:20}})})});
 try{
  const prepared=layoutPrepared(await prepareDocument(doc,options));
  const resource=Object.values(prepared.options.resources)[0];
  const before=cache.snapshot(),resourceBytes=ownedResourceBytes(resource),pdf=render(prepared.document,prepared.options);
  const plane=await readPngAlpha(resource);const shapes=[];
  for(const shapeImageThreshold of [0,.15,1]){
   try{const shape=await preparePngShape(resource,{shapeImageThreshold});shapes.push({shapeImageThreshold,shape});}
   catch(error){shapes.push({shapeImageThreshold,error:error.diagnostics[0].code});}
  }
  const warm=layoutPrepared(await prepareDocument(doc,options));
  const again=render(warm.document,warm.options);
  return {shapes,width:plane.width,height:plane.height,alpha:plane.kind==='alpha'?Array.from(plane.bytes):null,
   sourceBytes:bytes.length,resourceBytes,afterResourceBytes:ownedResourceBytes(resource),before,after:cache.snapshot(),fetches,
   sameResource:Object.values(warm.options.resources)[0]===resource,pdf:Array.from(pdf),again:Array.from(again),
   frozen:shapes.every(x=>!x.shape||Object.isFrozen(x.shape)&&(x.shape.kind==='empty'||Object.isFrozen(x.shape.commands)&&x.shape.commands.every(Object.isFrozen)))};
 }finally{cache.dispose();}
}`;
}
