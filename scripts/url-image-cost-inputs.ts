import { readFileSync } from "node:fs";
import { fixture } from "../packages/png/test/helpers.js";

export function urlImageInput(codec: "png" | "jpeg" | "mixed" = "mixed") {
  const png = JSON.stringify([...fixture()]);
  const jpeg = JSON.stringify([...readFileSync("tests/fixtures/jpeg/color-2x2.jpg")]);
  const formats = codec === "mixed" ? ["png", "jpeg"] : [codec];
  return `
    import {h} from '@updf/core/vdom';
    import {Image,images as preparedImages} from '@updf/images';
    import {images,createAssetLoader} from '@updf/images/load';
    ${formats.map((kind) => `import {${kind}Images} from '@updf/images/${kind}';`).join("\n")}
    ${formats.map((kind) => `import {prepare${kind === "png" ? "Png" : "Jpeg"},${kind}Provider} from '@updf/${kind}';`).join("\n")}
    import {Document,Flow} from '@updf/layout';
    import {render} from '@updf/layout/render';import {renderAsync} from '@updf/layout/async';
    ${codec === "mixed" ? "import {floatable,textFlow} from '@updf/text-flow';const Floating=floatable(Image);" : ""}
    export async function proof(){
      const bytes={${formats.map((kind) => `${kind}:new Uint8Array(${kind === "png" ? png : jpeg})`).join(",")}};
      let fetches=0,policies=0;
      const loader=createAssetLoader({baseURI:'https://fixture.invalid/',allowUri:()=>{policies++;return true;},
        fetch:async uri=>{fetches++;return new Response(bytes[uri.includes('jpeg')?'jpeg':'${formats[0]}']);}});
      const extension=images({loader,formatHandlers:[${formats.map((kind) => `${kind}Images()`).join(",")}]});
      const sources={${formats.map((kind) => `${kind}:await prepare${kind === "png" ? "Png" : "Jpeg"}(bytes.${kind})`).join(",")}};
      const tree=(prepared)=>h(Document,{children:h(Flow,{pageSize:{width:200,height:200},margins:{top:0,right:0,bottom:0,left:0},children:[
        h(Image,{src:prepared?sources.${formats[0]}:'${formats[0]}',style:{width:40,height:30}}),
        h(${codec === "mixed" ? "Floating" : "Image"},{src:prepared?sources.${formats.at(-1)}:'${formats.at(-1)}',style:{width:60,height:40${codec === "mixed" ? ",float:'right'" : ""}}})
      ]})});
      const flow=${codec === "mixed" ? "[textFlow()]" : "[]"};
      const actual=await renderAsync(tree(false),{extensions:[extension,...flow]});
      const control=render(tree(true),{resources:{${formats.map((kind, i) => `Prepared${i}:sources.${kind}`).join(",")}},
        providers:[${formats.map((kind) => `${kind}Provider()`).join(",")}],extensions:[preparedImages(),...flow]});
      const expectedFetches=${formats.length};
      if(fetches!==expectedFetches)throw Error('unexpected per-operation fetch count');
      const again=await renderAsync(tree(false),{extensions:[extension,...flow]});
      if(fetches!==expectedFetches*2)throw Error('session persisted across render');
      return {fetches,policies,bytes:Array.from(actual),control:Array.from(control),again:Array.from(again)};
    }
  `;
}
