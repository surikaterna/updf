export function pngAlphaProofInput(browser = false, automatic = true) {
  return `
import {h} from '@updf/core/vdom';
import {render} from '@updf/core';
import {ownedResourceBytes} from '@updf/core/resources';
import {Document,Flow,Paragraph,pt} from '@updf/layout';
import {prepareDocument,layoutPrepared} from '@updf/layout/internal-preparation';
import {Image} from '@updf/images';
import {images,createAssetLoader} from '@updf/images/load';
import {createImageCache} from '@updf/images/cache';
import {${browser ? "browserPngImages" : "pngImages"} as format} from '@updf/images/${browser ? "browser-png" : "png"}';
import {createHelvetica,fontProvider,fontRuntime} from '@updf/fonts';
import {createTextComposition} from '@updf/text/composition';
import {floatable,textFlow} from '@updf/text-flow';
import {Source} from '@updf/text-flow/sources';
${automatic ? "import {pngAlphaShapes} from '@updf/text-flow/png-alpha';" : ""}
${automatic ? "" : "import {pathShapes} from '@updf/text-flow/path';"}
${browser ? "import {readPngAlpha} from '@updf/png/alpha';" : ""}
export async function proof(input){
 const bytes=new Uint8Array(input);let fetches=0;
 const cache=createImageCache({maxEntries:2,maxBytes:8388608,maxConsumers:2});
 const loader=createAssetLoader({baseURI:'https://fixture.invalid/',fetch:async()=>{fetches++;return new Response(bytes);}});
 const handler=format(),runtime=fontRuntime(),FloatingImage=floatable(Image);
 const options={resources:{Helvetica:createHelvetica()},...createTextComposition({runtime,defaultFont:'Helvetica'}),providers:[fontProvider(runtime)],
  extensions:[textFlow({handlers:[${automatic ? "pngAlphaShapes()" : "pathShapes()"}]}),images({loader,cache,formatHandlers:[handler]})]};
 const results=[];let first;${browser ? "let plane;" : ""}
 try{for(const threshold of [0,.15,1]){
  const children=[];
  for(let i=0;i<2;i++){
   children.push(h(FloatingImage,{src:'logo',style:{width:100,height:100,float:'left',${automatic ? "shapeOutside:Source.url('logo'),shapeImageThreshold:threshold" : "shapeOutside:Source.polygon([0,0,100,0,100,100,0,100])"}}}));
   children.push(h(Paragraph,{style:{fontSize:12,lineHeight:pt(15),color:[1,0,0]},children:'Automatic mask proof keeps native ordered text outside occupied pixels. '.repeat(5)}));
  }
  const tree=h(Document,{children:[0,2].map(i=>h(Flow,{pageSize:{width:400,height:600},margins:{top:0,right:0,bottom:0,left:0},children:children.slice(i,i+2)}))});
  const output=layoutPrepared(await prepareDocument(tree,options));
  const resources=Object.values(output.options.resources),image=resources.find(x=>x.metadata?.kind==='png');
  if(!first)first=image;
  ${browser ? "if(!plane){const p=await readPngAlpha(image);plane={width:p.width,height:p.height,alpha:p.kind==='alpha'?Array.from(p.bytes):null};}" : ""}
  const walk=(nodes,x=0,y=0)=>nodes.flatMap(n=>n.type==='xObject'?[{x:x+(n.x??0),y:y+(n.y??0),width:n.width,height:n.height}]:n.type==='paintGroup'?walk(n.children,x+(n.transform?.[4]??0),y+(n.transform?.[5]??0)):[]);
  ${browser ? "const textNodes=nodes=>nodes.flatMap(n=>n.type==='xObject'?[]:n.type==='paintGroup'?[{...n,children:textNodes(n.children)}]:[n]);const textPdf=Array.from(render({...output.document,pages:output.document.pages.map(p=>({...p,children:textNodes(p.children)}))},output.options));" : ""}
  results.push({threshold,${browser ? "textPdf," : ""}pdf:Array.from(render(output.document,output.options)),rects:output.document.pages.flatMap(p=>walk(p.children)),
   sameResource:image===first,imageBytes:ownedResourceBytes(image),resourceCount:resources.length,
   geometry:resources.filter(x=>x.metadata?.shape).map(x=>({bytes:ownedResourceBytes(x),commands:x.metadata.shape.kind==='empty'?0:x.metadata.shape.commands.length}))});
 }
 return {results,fetches,snapshot:cache.snapshot()${browser ? ",plane" : ""}};
 }finally{cache.dispose();}
}`;
}
