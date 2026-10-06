export const nativeNodeInput = `
import {renderUnknown,DocumentError} from '@updf/core';
import {createLayoutOperation} from '@updf/core/internal';
import {h,lower} from '@updf/core/vdom';
import {createHelvetica,fontRuntime,fontProvider} from '@updf/fonts';
import {createTextService} from '@updf/text';
import {prepareJpeg,jpegProvider} from '@updf/jpeg';
const rect={type:'rect',x:20,y:20,width:10,height:10};
const leaves=[rect,{type:'line',x:20,y:20,x2:30,y2:30},
 {type:'path',commands:[{type:'move',x:20,y:20},{type:'line',x:30,y:30}]},
 {type:'richText',x:20,y:20,width:50,height:12,paragraphs:[{runs:[{text:'A B'}],defaultStyle:{font:'Helvetica',fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'}]},
 {type:'xObject',resource:'image',x:20,y:20,width:10,height:10}];
const group=(children,extra={})=>({type:'paintGroup',children,...extra});
const document=children=>({version:1,pages:[{width:100,height:100,children}]});
function vnode(node){const {type,...props}=node;return h(type,type==='paintGroup'?{...props,children:node.children.map(vnode)}:props);}
const tree=children=>h('document',{version:1,children:h('page',{width:100,height:100,children:children.map(vnode)})});
function error(run){try{run();return null;}catch(e){if(!(e instanceof DocumentError))throw e;return e.diagnostics;}}
export function run(bytes){
 const runtime=fontRuntime();
 const options={resources:{Helvetica:createHelvetica(),image:prepareJpeg(bytes)},text:createTextService({runtime,defaultFont:'Helvetica'}),providers:[fontProvider(runtime),jpegProvider()]};
 const modes=[leaves.concat(group([rect])),
  [group(leaves,{transform:[1,0,0,1,10,10],clip:{x:0,y:0,width:80,height:80}})],
  [group([group(leaves,{transform:[0,1,-1,0,70,0],clip:{x:0,y:0,width:80,height:80}})],{clip:{x:0,y:0,width:90,height:90}})],
  [group(leaves,{clip:{x:0,y:0,width:10,height:10}})]];
 const operation=createLayoutOperation(options);
 try{return modes.map(children=>({
  ast:lower(tree(children),options),pdf:renderUnknown(document(children),options),ink:operation.nativeInk(children),
  astErrors:leaves.map(node=>error(()=>renderUnknown(document([{...node,unsupported:1}]),options))),
  vdomErrors:leaves.map(node=>error(()=>lower(tree([{...node,unsupported:1}]),options))),
  geometryErrors:leaves.map(node=>error(()=>renderUnknown(document([{...node,x:-1}]),options))),
  resourceError:error(()=>renderUnknown(document([{...leaves[4],resource:'missing'}]),options))
 }));}finally{operation.close();}
}
`;
