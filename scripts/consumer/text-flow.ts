import { execute } from "./install.js";

/** Real mixed-loader use of owned capabilities/resources, beyond export-name identity. */
export async function textFlowProof(directory: string) {
  await execute(
    directory,
    `
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';
    const require=createRequire(import.meta.url);
    const {createTextSelection}=require('@updf/text/selection');
    const {createTextComposition}=await import('@updf/text/composition');
    const {floatable,textFlow}=await import('@updf/text-flow');
    const {Path,pathShapes}=require('@updf/text-flow/path');
    const {Source}=require('@updf/text-flow/sources');
    assert.equal(Source,(await import('@updf/text-flow/sources')).Source);
    const {createAtomicTextFlow}=await import('@updf/text-flow/atomic');
    const {createHelvetica,fontRuntime,fontProvider}=require('@updf/fonts');
    const {h}=require('@updf/core/vdom');
    const {Block,Document,Flow,Paragraph,layout,createExtensions}=await import('@updf/layout');
    const {render,DocumentError}=await import('@updf/core');
    const {render:renderAuthored}=require('@updf/layout/render');
    ${genericVisualRuntime} const {createTextService}=require('@updf/text');
    const runtime=fontRuntime();
    const region={pageSize:{width:200,height:200},margins:{top:0,right:0,bottom:0,left:0}};
    const canonicalOptions={text:createTextService({runtime,defaultFont:'Custom'}),extensions:[textFlow()],resources:{Custom:createHelvetica()},providers:[fontProvider(runtime)]};
    const FloatingBlock=floatable(Block);
    const canonical=h(Document,{children:h(Flow,{...region,children:[h(FloatingBlock,{style:{width:20,height:20,float:'left'}}),h(Paragraph,{children:'canonical mixed loader'})]})});
    assert.deepEqual(renderAuthored(canonical,canonicalOptions),render(layout(canonical,canonicalOptions).document,canonicalOptions));
    for(const create of [createTextSelection,createTextComposition]) {
      const service=create({runtime,defaultFont:'Helvetica'});
      const options={...service,extensions:[textFlow({handlers:[pathShapes()]})],resources:{Helvetica:createHelvetica()},providers:[fontProvider(runtime)]};
      const rect={Block:floatable(Block)}, path={Block:floatable(Block)};
      for(const f of [rect,path]) {
         const content=h(Document,{children:h(Flow,{pageSize:{width:200,height:200},margins:{top:0,right:0,bottom:0,left:0},...(f.participation?{participation:f.participation}:{}),children:[h(f.Block,{style:{width:20,height:20,float:'left'}}),h(Paragraph,{children:'mixed loader capability'})]})});
        const result=layout(content,options);
        assert.ok(render(result.document,options).length>500);
      }
      const ordinary=h(Document,{children:h(Flow,{...region,children:h(Path,{d:'M0 0H20V20H0Z',fill:'#000000',style:{width:20,height:20}})})});
      assert.ok(layout(ordinary,{extensions:[textFlow({handlers:[pathShapes()]})]}).pageCount===1);
      assert.throws(()=>layout(h(Document,{children:h(Flow,{...region,participation:{},children:h(rect.Block,{style:{width:20,height:20,float:'left'}})})}),options),DocumentError);
    }
    const combined=createTextComposition({runtime,defaultFont:'Helvetica'});
    const atomic=createAtomicTextFlow(combined.capability);
    const extensions=createExtensions([atomic.textFlowAdapter]);
    const options={...combined,resources:{Helvetica:createHelvetica()},providers:[fontProvider(runtime)]};
    const paragraph={runs:[{text:'atomic mixed'}],defaultStyle:{font:'Helvetica',fontSize:10,color:[0,0,0]},lineHeight:12,align:'left',whiteSpace:'preserve',breakLongWords:'error'};
    const result=layout(h(Document,{children:h(Flow,{...region,extensions,children:h(atomic.TextFlow,{paragraphs:[paragraph],style:{maxHeight:100}})})}),options);
    assert.ok(render(result.document,options).length>500);
  `,
  );
}

const genericVisualRuntime = `
  const {defineVisual}=require('@updf/layout/internal-visual');
  assert.equal(defineVisual,(await import('@updf/layout/internal-visual')).defineVisual);
  const {createOperationCapability,defineOperationExtension}=await import('@updf/core/internal');
  const badge=defineVisual({name:'packed.badge',capture:p=>({props:{style:p.style},visual:{}}),
    measure:(_p,c)=>({fragmentation:'atomic',extent:1,naturalSize:{width:c.width,height:4},
      next:()=>({end:1,height:4,nodes:[{type:'rect',x:0,y:0,width:c.width,height:4,paint:{fill:[0,0,1],stroke:null}}]})})});
  const FloatingBadge=floatable(badge.Component);
  assert.equal(FloatingBadge,require('@updf/text-flow').floatable(badge.Component));
  const installed=defineOperationExtension({},createOperationCapability(()=>()=>({})),badge.adapters);
  const badges=h(Document,{children:h(Flow,{pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},
    children:[h(badge.Component,{style:{width:30,height:20}}),h(FloatingBadge,{style:{width:30,height:20,float:'left'}})]})});
  const badgeResult=layout(badges,{extensions:[textFlow(),installed]});
  assert.equal(badgeResult.placements[0].box.width,30);
  assert.ok(render(badgeResult.document).length>100);
  assert.throws(()=>layout(badges,{extensions:[textFlow()]}),DocumentError);
`;
