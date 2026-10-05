export const boxPropertyRuntime = `
import {layoutBoxes} from '@updf/layout-kernel/boxes';
const root = {id:'root'};
const view = {id:n=>n.id,path:n=>'/'+n.id,style:()=>({}),childCount:()=>0,childAt:()=>{throw new Error('leaf');},content:()=>undefined};
const baseline = layoutBoxes({root,view,width:20});
let reads = 0;
for (const key of ['gap','height','measure','exactInlineEdges','flexGrow','paddingTop']) {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype,key);
  const descriptor = Object.assign(Object.create(null),{configurable:true,get(){reads++;throw new Error('inherited '+key);}});
  Object.defineProperty(Object.prototype,key,descriptor);
  try {
    const actual=layoutBoxes({root,view,width:20});
    assert.deepEqual(actual,baseline);
    if(key==='height') assert.throws(()=>layoutBoxes({root,view:{...view,content:()=>root},width:20,measure:()=>({})}),LayoutInputError);
  } finally {
    if(previous) Object.defineProperty(Object.prototype,key,previous); else delete Object.prototype[key];
  }
}
assert.equal(reads,0);
for (const key of ['width','view','root']) {
  const input={root,view,width:20}; delete input[key];
  const previous=Object.getOwnPropertyDescriptor(Object.prototype,key);
  Object.defineProperty(Object.prototype,key,Object.assign(Object.create(null),{configurable:true,value:key==='width'?20:key==='root'?root:view}));
  try { assert.throws(()=>layoutBoxes(input),LayoutInputError); }
  finally { if(previous) Object.defineProperty(Object.prototype,key,previous);else delete Object.prototype[key]; }
}
const sentinel=new Error('proxy');
assert.throws(()=>layoutBoxes({root,view,width:20,limits:new Proxy({}, {ownKeys(){throw sentinel;}})}),error=>error===sentinel);
`;
