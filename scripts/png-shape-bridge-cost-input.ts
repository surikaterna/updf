/** Retain the active private bridge via native PNG resources, PDF output and reference reports. */
export const bridgeCostInput = () => `
import {render} from '@updf/core';
import {h} from '@updf/core/vdom';
import {Image} from '@updf/images';
import {images,createAssetLoader} from '@updf/images/load';
import {pngImages} from '@updf/images/png';
import {resolveImageResource} from '@updf/images/internal-preparation';
import {Document,Flow} from '@updf/layout';
import {defineParticipation,participationComponent} from '@updf/layout/internal-participation';
import {visualCapture} from '@updf/layout/internal-visual-owner';
import {definePreparationResource,replaceParticipationData,prepareDocument,layoutPrepared} from '@updf/layout/internal-preparation';
export {createAssetLoader};
export async function inspect(loader,src,mask){
  const reports=[];
  const owner=defineParticipation((sources,context)=>({
    blocks:sources.map(source=>{const block=context.prepare(source);reports.push(context.reference(source,block));return block;}),close(){}
  }));
  const capture=visualCapture(Image);
  const Marker=participationComponent(owner,(input,path)=>{
    const props=capture(input,path);return {props,body:props.children,data:{mask}};
  },Image);
  const metadata=definePreparationResource({
    identity:owner,slot:'participation-data',capture:(_props,_path,captured)=>captured,
    resolve:async()=>{throw Error('session required')},
    replace:(captured,resource,id)=>replaceParticipationData(captured,resource,id,{resource,id}),
    session:context=>({resolve:async captured=>{
      const resource=await resolveImageResource(context,captured.data.mask,'/mask');
      context.retain(resource,'/mask');return resource;
    },close(){}})
  });
  const content=h(Document,{children:h(Flow,{
    pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},participation:owner,
    children:h(Marker,{src,style:{width:30,height:20,paddingLeft:1.25}})
  })});
  const result=layoutPrepared(await prepareDocument(content,{extensions:[metadata,images({loader,formatHandlers:[pngImages()]})]}));
  return {pdf:render(result.document,result.options),reports,resources:Object.keys(result.options.resources)};
}`;
