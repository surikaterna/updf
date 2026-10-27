/** Offline native-resource proof; the selected visual consumes its coordinator binding. */
export function visualPreparationCostInput(): string {
  return input;
}

const input = `
import {render,DocumentError} from '@updf/core';
import {name} from '@updf/core/pdf';
import {defineOperationExtension,createOperationCapability} from '@updf/core/internal';
import {createOwnedResource,resourceSlot,xObjectSlot} from '@updf/core/resources';
import {h,createContext,useContext} from '@updf/core/vdom';
import {jsx} from '@updf/core/jsx-runtime';
import {Document,Flow} from '@updf/layout';
import {floatable,textFlow} from '@updf/text-flow';
import {defineVisual} from '@updf/layout/internal-visual';
import {prepareDocument,layoutPrepared,definePreparationResource,replaceVisualResource} from '@updf/layout/internal-preparation';
${fakeFormProvider()}
export async function proof() {
  let captures=0,geometry=0,resolutions=0,prepared=0,sealed=false;
  const ids=[],paths=[],scopes=[],values=[],Theme=createContext('default');
  const resource=createOwnedResource({kind:'fake-visual'},{byteLength:7});
  const visual=defineVisual({name:'VisualPreparationProfile',
    capture(p){captures++;return {props:{style:p.style},visual:{src:p.src}};},
    prepare:(p,src,id)=>{prepared++;return {...p,src,id};},
    measure(p,c){geometry++;paths.push(c.sourcePath);if(!sealed||p.src!==resource||!ids.includes(p.id))throw Error('unbound visual');
      return {fragmentation:'atomic',extent:1,naturalSize:{width:c.width,height:4},
        next:()=>({end:1,height:4,nodes:[{type:'xObject',resource:p.id,x:0,y:0,width:c.width,height:4}]})};}});
  const preparation=definePreparationResource({identity:visual.preparationOwner,
    capture(p,path,captured){if(captured.visual.src!=='synthetic-request')throw Error('capture');return captured;},
    async resolve(){resolutions++;if(geometry)throw Error('early geometry');await Promise.resolve();return resource;},
    replace:(capture,owned,id)=>{ids.push(id);return replaceVisualResource(capture,owned,id);}});
  const Floating=floatable(visual.Component),style={width:20,height:14,padding:2};
  const Child=p=>{const value=useContext(Theme);scopes.push(value);
    return jsx(p.floating?Floating:visual.Component,{src:'synthetic-request',style:{...style,...(p.floating?{float:'right'}:{})}},p.floating?'floating':'ordinary');};
  const children=['left','right'].map((value,i)=>h(Theme.Provider,{value,children:h(Child,{floating:!!i})}));
  const provider=fakeFormProvider(resource,values);
  const input=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},children})});
  const handle=await prepareDocument(input,{providers:[provider],extensions:[preparation,textFlow(),
    defineOperationExtension({},createOperationCapability(()=>()=>null),visual.adapters)]});
  if(captures!==2||geometry||prepared!==2)throw Error('capture replay');sealed=true;
  const result=layoutPrepared(handle),bytes=render(result.document,result.options);
  let missingProviderRejected=false;
  try{render(result.document,{...result.options,providers:[]});}catch(error){
    if(!(error instanceof DocumentError)||!error.diagnostics.some(d=>d.code==='RESOURCE'))throw error;
    missingProviderRejected=true;}
  if(!missingProviderRejected||values.length!==2)throw Error('broken native resource chain');
  return {captures,geometry,resolutions,prepared,scopes,paths,ids,collections:values.length,missingProviderRejected,
    heights:result.placements.map(p=>p.box.height),keys:result.placements.map(p=>p.sourceKeys),bindings:Object.keys(result.options.resources),bytes:[...bytes]};
}
`;

function fakeFormProvider(): string {
  return `
function fakeFormProvider(resource,collections){
  const slot=resourceSlot();return {slot,collectXObject(site,c){if(site.resource!==resource)return;
    collections.push(site.resource===resource);
    const value=c.intern(slot,site.resource,()=>({category:'XObject',payload:null,phase:'content',reserve(w){const ref=w.reserve();
      return {ref,define:()=>w.defineStream(ref,['0 0 1 1 re f\\n'],{Type:name('XObject'),Subtype:name('Form'),BBox:[0,0,1,1]})};}}));
    c.bindPainting(site.identity,xObjectSlot,{resource:value,finish:()=>null});}};
}
`;
}
