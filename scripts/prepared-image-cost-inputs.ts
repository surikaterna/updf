export function preparedImageCostInputs(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const codec of ["png", "jpeg"]) {
    for (const floated of [false, true]) {
      result[`${floated ? "float" : "ordinary"}${codec.toUpperCase()}`] = `
        import {h} from '@updf/core/vdom';
        import {Document,Flow,Paragraph,Span} from '@updf/layout';
        import {render} from '@updf/layout/render';
        import {Image,images} from '@updf/images';
        import {prepare${codec === "png" ? "Png" : "Jpeg"},${codec}Provider} from '@updf/${codec}';
        ${
          floated
            ? `import {floatable,textFlow} from '@updf/text-flow';
          import {createHelvetica,fontProvider,fontRuntime} from '@updf/fonts';
          import {createTextService} from '@updf/text';`
            : ""
        }
        export async function pdf(bytes){
          const src=await prepare${codec === "png" ? "Png" : "Jpeg"}(bytes);
          ${floated ? "const runtime=fontRuntime();const FloatingImage=floatable(Image);" : ""}
          const content=h(Document,{children:h(Flow,{pageSize:{width:200,height:200},
            margins:{top:0,right:0,bottom:0,left:0},children:[
              h(${floated ? "FloatingImage" : "Image"},{src,style:{width:120,height:80${floated ? ",float:'left'" : ""}}})
              ${floated ? ",h(Paragraph,{children:['rich ',h(Span,{style:{fontSize:14},children:'image'}),' text '.repeat(50)]})" : ""}
            ]})});
          return render(content,{resources:{logo:src${floated ? ",Font:createHelvetica()" : ""}},
            providers:[${codec}Provider()${floated ? ",fontProvider(runtime)" : ""}],extensions:[images()${floated ? ",textFlow()" : ""}]
            ${floated ? ",text:createTextService({runtime,defaultFont:'Font'})" : ""}});
        }`;
    }
  }
  return result;
}
