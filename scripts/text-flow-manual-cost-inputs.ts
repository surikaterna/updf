/** New profiles are absolute costs; shared legacy profiles retain their authored content. */
export function manualCostInputs(): Record<string, string> {
  const base = `import {h} from '@updf/core/vdom';
    import {Document,Flow,Block,layout} from '@updf/layout';
    import {floatable,textFlow} from '@updf/text-flow';
    import {pathShapes} from '@updf/text-flow/path';
    import {Source} from '@updf/text-flow/sources';
    const FloatingBlock=floatable(Block);
    export const result=shape=>layout(h(Document,{children:h(Flow,{
      pageSize:{width:220,height:260},margins:{top:10,right:10,bottom:10,left:10},
      children:h(FloatingBlock,{style:{width:100,height:96,float:'left',shapeOutside:SHAPE}})
    })}),{extensions:[textFlow({handlers:[pathShapes()HANDLERS]})]});`;
  return {
    textFlowSources: `export {Source} from '@updf/text-flow/sources';`,
    textFlowManualPath: base.replace("SHAPE", "Source.path(shape)").replace("HANDLERS", ""),
    textFlowPolygon: base.replace("SHAPE", "Source.polygon(shape)").replace("HANDLERS", ""),
    textFlowSyntax: `import {shapeSyntax} from '@updf/text-flow/syntax';\n${base.replace("SHAPE", "shape").replace("HANDLERS", ",shapeSyntax()")}`,
  };
}
