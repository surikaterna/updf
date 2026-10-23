/** Separate silhouette consumer: do not rewrite prior paired consumer inputs. */
export function profileCostInput(): string {
  return `import {layout,document,flow,createExtensions,extension} from '@updf/layout';
    import {createTextFlow} from '@updf/text-flow';
    import {createTextComposition} from '@updf/text/composition';
    import {createHelvetica,fontRuntime,fontProvider} from '@updf/fonts';
    import {render} from '@updf/core';
    const runtime=fontRuntime();
    const composition=createTextComposition({runtime});
    const {textFlowAdapter}=createTextFlow(composition.capability);
    const options={resources:{Helvetica:createHelvetica()},...composition,providers:[fontProvider(runtime)]};
    export const pdf=paragraphs=>render(layout(document({children:flow({
      pageSize:{width:300,height:200},margins:{top:0,right:0,bottom:0,left:0},
      extensions:createExtensions([textFlowAdapter]),children:extension(textFlowAdapter,{
        paragraphs,exclusion:{shape:'edge-profile',side:'right',top:8,
          points:[{x:80,y:0},{x:24,y:24},{x:64,y:40},{x:8,y:64}]},
        style:{width:240,maxHeight:160}})})}),options).document,options);`;
}
