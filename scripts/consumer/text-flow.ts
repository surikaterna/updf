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
    const {createTextFlow}=await import('@updf/text-flow');
    const {createPathTextFlow}=require('@updf/text-flow/path');
    const {createAtomicTextFlow}=await import('@updf/text-flow/atomic');
    const {createHelvetica,fontRuntime,fontProvider}=require('@updf/fonts');
    const {h}=require('@updf/core/vdom');
    const {Document,Flow,Paragraph,layout,createExtensions}=await import('@updf/layout');
    const {render,DocumentError}=await import('@updf/core');
    const runtime=fontRuntime();
    const region={pageSize:{width:200,height:200},margins:{top:0,right:0,bottom:0,left:0}};
    for(const create of [createTextSelection,createTextComposition]) {
      const service=create({runtime,defaultFont:'Helvetica'});
      const options={...service,resources:{Helvetica:createHelvetica()},providers:[fontProvider(runtime)]};
      const rect=createTextFlow(service.capability), path=createPathTextFlow(service.capability);
      assert.deepEqual(Object.keys(rect).sort(),['Block','participation']);
      for(const f of [rect,path]) {
        const content=h(Document,{children:h(Flow,{pageSize:{width:200,height:200},margins:{top:0,right:0,bottom:0,left:0},participation:f.participation,children:[h(f.Block,{style:{width:20,height:20,float:'left'}}),h(Paragraph,{children:'mixed loader capability'})]})});
        const result=layout(content,options);
        assert.ok(render(result.document,options).length>500);
      }
      assert.throws(()=>layout(h(Document,{children:h(Flow,{...region,participation:{...rect.participation},children:h(rect.Block,{style:{width:20,height:20,float:'left'}})})}),options),DocumentError);
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
