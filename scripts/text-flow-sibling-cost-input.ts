/** A real styled sibling document; initialization lays out and serializes the PDF. */
export function siblingCostInput(): string {
  return `import {layout,Document,Flow,Paragraph,Span} from '@updf/layout';
    import {h} from '@updf/core/vdom';
    import {createTextFlow} from '@updf/text-flow';
    import {createTextSelection} from '@updf/text/selection';
    import {createHelvetica,fontRuntime,fontProvider} from '@updf/fonts';
    import {render} from '@updf/core';
    const runtime=fontRuntime();
    const composition=createTextSelection({runtime,defaultFont:'Helvetica'});
    const f=createTextFlow(composition.capability);
    const options={resources:{Helvetica:createHelvetica()},...composition,providers:[fontProvider(runtime)]};
    const content=h(Document,{children:h(Flow,{pageSize:{width:220,height:260},margins:{top:10,right:10,bottom:10,left:10},participation:f.participation,children:[
      h(f.Block,{style:{width:72,height:96,float:'left',backgroundColor:[0.2,0.4,0.6]}},'visual'),
      h(Paragraph,{children:['Rich ',h(Span,{style:{color:[1,0,0],backgroundColor:[0.9,0.9,0.2]},children:'styled span'}),' first paragraph.']},'first'),
      h(Paragraph,{children:'Second paragraph has full width text below the float. '.repeat(20)},'second')]})});
    export const result=layout(content,options);
    export const pdf=render(result.document,options);`;
}
