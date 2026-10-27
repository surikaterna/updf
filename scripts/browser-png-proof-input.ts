const input = `
import {getDocument} from 'pdfjs-dist/build/pdf.mjs';
import {WorkerMessageHandler} from 'pdfjs-dist/build/pdf.worker.mjs';
globalThis.pdfjsWorker={WorkerMessageHandler};
import {h} from '@updf/core/vdom';
import {Image,images as preparedImages} from '@updf/images';
import {images,createAssetLoader} from '@updf/images/load';
import {browserPngImages} from '@updf/images/browser-png';
import {pngImages} from '@updf/images/png';
import {preparePng,pngProvider} from '@updf/png';
import {Document,Flow,Paragraph,Span} from '@updf/layout';
import {createHelvetica,fontProvider,fontRuntime} from '@updf/fonts';
import {createTextService} from '@updf/text';
import {render} from '@updf/layout/render';
import {renderAsync} from '@updf/layout/async';
import {floatable,textFlow} from '@updf/text-flow';
const Floating=floatable(Image);
export async function proof(input,dom=false){
 const bytes=new Uint8Array(input);
 const source=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
 const width=source.width,height=source.height;
 const reference=new OffscreenCanvas(width,height);
 const context=reference.getContext('2d',{alpha:true,colorSpace:'srgb'});
 context.drawImage(source,0,0);source.close();
 const rgba=Array.from(context.getImageData(0,0,width,height).data);
 const blob=await reference.convertToBlob({type:'image/png'});
 const prepared=await preparePng(new Uint8Array(await blob.arrayBuffer()));
 reference.width=0;reference.height=0;
 let fetches=0,decodes=0,encodes=0,policies=0;
 const offscreen=globalThis.OffscreenCanvas;
 const decode=globalThis.createImageBitmap,encode=offscreen.prototype.convertToBlob;
 globalThis.createImageBitmap=function(...args){decodes++;return decode.apply(this,args);};
 OffscreenCanvas.prototype.convertToBlob=function(...args){encodes++;return encode.apply(this,args);};
 const domEncode=HTMLCanvasElement.prototype.toBlob;
 HTMLCanvasElement.prototype.toBlob=function(...args){encodes++;return domEncode.apply(this,args);};
 if(dom)globalThis.OffscreenCanvas=undefined;
 const url='https://cdn.iconscout.com/icon/free/png-512/free-eevee-eievui-pokemon-dessin-anime-jeu-video-pokemongo-32216.png';
 const loader=createAssetLoader({allowUri:uri=>{policies++;return uri===url;},
   fetch:async()=>{fetches++;return new Response(bytes);}});
 const extension=images({loader,formatHandlers:[browserPngImages()]});
 const runtime=fontRuntime();
 const text={resources:{Helvetica:createHelvetica()},text:createTextService({runtime,defaultFont:'Helvetica'}),providers:[fontProvider(runtime)]};
 const pageWidth=Math.max(width*2,200);
 const tree=ready=>h(Document,{children:h(Flow,{pageSize:{width:pageWidth,height:height*2+200},
   margins:{top:0,right:0,bottom:0,left:0},children:[
   h(Image,{src:ready?prepared:url,style:{width,height}}),
   h(Floating,{src:ready?prepared:url,style:{width:width/2,height:height/2,float:'right'}}),
   h(Paragraph,{children:['Ordinary ',h(Span,{style:{fontSize:14},children:'rich text'}),' after a floating normalized image.']})]})});
 try {
   const control=render(tree(true),{...text,resources:{...text.resources,Prepared:prepared},providers:[...text.providers,pngProvider()],extensions:[preparedImages(),textFlow()]});
   const pdf=await renderAsync(tree(false),{...text,extensions:[extension,textFlow()]});
   const first={fetches,decodes,encodes,policies};
   const again=await renderAsync(tree(false),{...text,extensions:[extension,textFlow()]});
   let portable;
   try{await renderAsync(tree(false),{...text,extensions:[images({loader,formatHandlers:[pngImages()]}),textFlow()]});}
   catch(error){portable=error.diagnostics[0].code;}
   return {pdf:Array.from(pdf),control:Array.from(control),again:Array.from(again),first,
     total:{fetches,decodes,encodes,policies},width,height,pageWidth,rgba,portable};
 } finally {globalThis.createImageBitmap=decode;globalThis.OffscreenCanvas=offscreen;offscreen.prototype.convertToBlob=encode;HTMLCanvasElement.prototype.toBlob=domEncode;}
}
export async function raster(pdf,width,height){
 const task=getDocument({data:new Uint8Array(pdf),isEvalSupported:false,useSystemFonts:true});
 try{
  const document=await task.promise;
  const page=await document.getPage(1);
  const viewport=page.getViewport({scale:1});
  const canvas=globalThis.document.createElement('canvas');
  canvas.width=viewport.width;canvas.height=viewport.height;
  const context=canvas.getContext('2d',{alpha:true,colorSpace:'srgb'});
  try{await page.render({canvasContext:context,viewport}).promise;
   return Array.from(context.getImageData(0,0,width,height).data);
  }finally{canvas.width=0;canvas.height=0;}
 }finally{await task.destroy();}
}
`;

export function browserPngProofInput() {
  return input;
}
