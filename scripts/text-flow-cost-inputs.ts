import { costInputs, jpegCostInputs } from "./consumer/cost-inputs.js";

export function textFlowCostInputs(): Record<string, string> {
  const existing = costInputs(false);
  return {
    drawing: existing.drawing!,
    ordinaryText: existing.helvetica!,
    preparedFont: existing.prepared!,
    jpeg: jpegCostInputs().jpeg!,
    textFlow: `import {layout,document,flow,createExtensions,extension} from '@updf/layout';
      import {createAtomicTextFlow} from '@updf/text-flow/atomic';
      import {createTextComposition} from '@updf/text/composition';
      import {createHelvetica,fontRuntime,fontProvider} from '@updf/fonts';
      import {render} from '@updf/core';
      const runtime=fontRuntime();
      const composition=createTextComposition({runtime});
      const {textFlowAdapter}=createAtomicTextFlow(composition.capability);
      const options={resources:{Helvetica:createHelvetica()},...composition,providers:[fontProvider(runtime)]};
      export const pdf=paragraphs=>render(layout(document({children:flow({pageSize:{width:300,height:200},margins:{top:0,right:0,bottom:0,left:0},extensions:createExtensions([textFlowAdapter]),children:extension(textFlowAdapter,{paragraphs,style:{width:240,maxHeight:160}})})}),options).document,options);`,
    layout: `import {measure,paragraph} from '@updf/layout';
      import {createHelvetica,fontRuntime} from '@updf/fonts';
      import {createTextService} from '@updf/text';
      const options={resources:{Helvetica:createHelvetica()},text:createTextService({runtime:fontRuntime(),defaultFont:'Helvetica'})};
      export const size=text=>measure(paragraph({children:text,style:{fontSize:10,lineHeight:12}}),{width:100},options);`,
  };
}

export function exclusionCostInput(): string {
  return textFlowCostInputs().textFlow!.replace(
    "{paragraphs,style:",
    "{paragraphs,exclusion:{shape:'rect',side:'left',width:80,height:40,top:8},style:",
  );
}
