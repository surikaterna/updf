export function imageCacheProofInput() {
  return `
import {h} from '@updf/core/vdom';
import {Image} from '@updf/images';
import {createImageCache} from '@updf/images/cache';
import {images,createAssetLoader} from '@updf/images/load';
import {browserPngImages} from '@updf/images/browser-png';
import {pngImages} from '@updf/images/png';
import {Document,Flow} from '@updf/layout';
import {renderAsync} from '@updf/layout/async';
export async function proof(input){
 const bytes=new Uint8Array(input);
 let fetches=0,decodes=0,encodes=0;
 const decode=globalThis.createImageBitmap,encode=OffscreenCanvas.prototype.convertToBlob;
 globalThis.createImageBitmap=function(...args){decodes++;return decode.apply(this,args);};
 OffscreenCanvas.prototype.convertToBlob=function(...args){encodes++;return encode.apply(this,args);};
 const cache=createImageCache({maxEntries:2,maxBytes:8388608,maxConsumers:2});
 const loader=createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>{fetches++;return new Response(bytes);}});
 const handler=browserPngImages();
 const doc=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},
  children:[h(Image,{src:'logo',style:{width:20,height:20}}),h(Image,{src:'logo',style:{width:40,height:40}})]})});
 const render=()=>renderAsync(doc,{extensions:[images({loader,cache,formatHandlers:[handler]})]});
 try{
  const cold=await render(),warm=await render();
  const counts={fetches,decodes,encodes};
  let portable;
  try{await renderAsync(doc,{extensions:[images({loader,cache,formatHandlers:[pngImages()]})]});}
  catch(error){portable=error.diagnostics[0].code;}
  return {cold:Array.from(cold),warm:Array.from(warm),counts,total:{fetches,decodes,encodes},snapshot:cache.snapshot(),portable};
 }finally{cache.dispose();globalThis.createImageBitmap=decode;OffscreenCanvas.prototype.convertToBlob=encode;}
}`;
}
