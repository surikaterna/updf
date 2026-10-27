/** Activated private proof: fake owned Form resource, no loader, codec or transport. */
export function resourcePreparationCostInput(): string {
  return `
import {render} from '@updf/core';
import {name} from '@updf/core/pdf';
import {semanticComponent,defineOperationExtension,createOperationCapability,validateDataObject} from '@updf/core/internal';
import {createOwnedResource,resourceSlot,xObjectSlot} from '@updf/core/resources';
import {h,createContext,useContext} from '@updf/core/vdom';
import {Document,Flow,defineBlockAdapter,extension,createExtensions} from '@updf/layout';
import {prepareDocument,layoutPrepared,definePreparationResource} from '@updf/layout/internal-preparation';
export async function proof() {
  const resource=createOwnedResource({kind:'test-preparation-form'},{byteLength:7});
  let calls=0,geometry=0,resolutions=0;
  const adapter=defineBlockAdapter({name:'PreparationProfile',validate:p=>p,
    measure(p,c){geometry++;return {fragmentation:'atomic',extent:1,naturalSize:{width:c.width,height:4},
      next:()=>({end:1,height:4,nodes:[{type:'xObject',resource:p.id,x:0,y:0,width:c.width,height:4}]})};}});
  const identity={};const Leaf=semanticComponent(identity,true);
  const preparation=definePreparationResource({identity,capture(p,path){validateDataObject(p,['request'],path);return p.request;},
    async resolve(){resolutions++;if(geometry!==0)throw Error('early geometry');await Promise.resolve();return resource;},
    replace:(_request,owned,id)=>extension(adapter,{id,owned})});
  const slot=resourceSlot();const provider={slot,collectXObject(site,c){if(site.resource!==resource)return;
    const value=c.intern(slot,site.resource,()=>({category:'XObject',payload:null,phase:'content',reserve(w){const ref=w.reserve();
      return {ref,define:()=>w.defineStream(ref,['0 0 1 1 re f\\n'],{Type:name('XObject'),Subtype:name('Form'),BBox:[0,0,1,1]})};}}));
    c.bindPainting(site.identity,xObjectSlot,{resource:value,finish:()=>null});}};
  const Theme=createContext('default'),values=[];
  const Child=()=>{calls++;const value=useContext(Theme);values.push(value);return h(Leaf,{request:value});};
  const child=h(Child,{});
  const input=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},
    children:[h(Theme.Provider,{value:'left',children:child}),h(Theme.Provider,{value:'right',children:child})]})});
  const handle=await prepareDocument(input,{providers:[provider],extensions:[preparation,
    defineOperationExtension({},createOperationCapability(()=>()=>null),createExtensions([adapter]))]});
  if(calls!==2||geometry!==0)throw Error('capture replay or geometry');
  const result=layoutPrepared(handle),bytes=render(result.document,result.options);
  return {calls,geometry,resolutions,values,bindings:Object.keys(result.options.resources),bytes:[...bytes]};
}
`;
}
