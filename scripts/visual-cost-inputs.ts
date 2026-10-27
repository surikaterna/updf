/** Both profiles paint the same authored border-box; only participation differs. */
export function visualCostInputs(): Record<string, string> {
  const base = `import {h} from '@updf/core/vdom';
    import {Document,Flow,layout} from '@updf/layout';
    import {defineVisual} from '@updf/layout/internal-visual';
    import {createOperationCapability,defineOperationExtension} from '@updf/core/internal';
    FLOAT_IMPORT
    const visual=defineVisual({name:'cost.visual',capture:p=>({props:{style:p.style},visual:{}}),
      measure:(_p,c)=>({fragmentation:'atomic',extent:1,naturalSize:{width:c.width,height:4},
        next:()=>({end:1,height:4,nodes:[{type:'rect',x:0,y:0,width:c.width,height:4,paint:{fill:[0,0,1],stroke:null}}]})})});
    const installed=defineOperationExtension({},createOperationCapability(()=>()=>({})),visual.adapters);
    const Component=COMPONENT;
    export const result=()=>layout(h(Document,{children:h(Flow,{
      pageSize:{width:100,height:100},margins:{top:0,right:0,bottom:0,left:0},
      children:h(Component,{style:{width:30,height:20,padding:2,border:{width:1,color:[1,0,0]},backgroundColor:[0,1,0]FLOAT_STYLE}})
    })}),{extensions:[installedFLOAT_EXTENSION]});`;
  return {
    visualOrdinary: base
      .replace("FLOAT_IMPORT", "")
      .replace("COMPONENT", "visual.Component")
      .replace("FLOAT_STYLE", "")
      .replace("FLOAT_EXTENSION", ""),
    textFlowVisual: base
      .replace("FLOAT_IMPORT", "import {floatable,textFlow} from '@updf/text-flow';")
      .replace("COMPONENT", "floatable(visual.Component)")
      .replace("FLOAT_STYLE", ",float:'left'")
      .replace("FLOAT_EXTENSION", ",textFlow()"),
  };
}
