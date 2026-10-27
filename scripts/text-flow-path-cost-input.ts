/** Separate Path fixture: existing rectangle/profile/sibling inputs remain byte-identical. */
export function pathCostInput(): string {
  return `import {layout,Document,Flow,Paragraph,Span} from '@updf/layout';
    import {h} from '@updf/core/vdom';
    import {Path,pathShapes} from '@updf/text-flow/path';
    import {floatable,textFlow} from '@updf/text-flow';
    import {createTextService} from '@updf/text';
    import {createHelvetica,fontRuntime,fontProvider} from '@updf/fonts';
    import {render} from '@updf/core';
    const runtime=fontRuntime();
    const FloatingPath=floatable(Path);
    const options={resources:{Helvetica:createHelvetica()},text:createTextService({runtime,defaultFont:'Helvetica'}),extensions:[textFlow({handlers:[pathShapes()]})],providers:[fontProvider(runtime)]};
    const content=h(Document,{children:h(Flow,{pageSize:{width:220,height:260},margins:{top:10,right:10,bottom:10,left:10},children:[
      h(FloatingPath,{d:'m0 0h100l-80 96h-20z',fillRule:'evenodd',fill:'#3498db',style:{width:100,height:96,float:'left'}},'path'),
      h(Paragraph,{children:['First ',h(Span,{style:{backgroundColor:[0.9,0.9,0.2]},children:'styled source'}),' paragraph with contour text.']},'first'),
      h(Paragraph,{children:'Second paragraph continues to full width. '.repeat(24)},'second')]})});
    export const result=layout(content,options);
    export const pdf=render(result.document,options);`;
}
