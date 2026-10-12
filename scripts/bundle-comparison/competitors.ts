export interface Profile {
  readonly id: string;
  readonly library: string;
  readonly features: string;
  readonly source: string;
  readonly measurement?: boolean;
}

const dataUri = `const uri = (bytes, type) => 'data:image/' + type + ';base64,' + btoa(String.fromCharCode(...bytes));`;

function pdfLib(images: boolean, customFont = false): Profile {
  return {
    id: customFont ? "pdf-lib-fontkit" : images ? "pdf-lib-images" : "pdf-lib-text",
    library: "pdf-lib",
    features: customFont ? "Text + TTF parser" : images ? "Text + JPEG + PNG/alpha" : "Standard-font text",
    source: `import { PDFDocument, StandardFonts } from 'pdf-lib';
      ${customFont ? "import fontkit from '@pdf-lib/fontkit';" : ""}
      export async function run(input) {
        const doc = await PDFDocument.create();
        ${customFont ? "doc.registerFontkit(fontkit);" : ""}
        const font = await doc.embedFont(${customFont ? "input.font" : "StandardFonts.Helvetica"});
        const page = doc.addPage([200,100]); page.drawText(input.text,{x:10,y:75,size:10,font});
        ${images ? "page.drawImage(await doc.embedJpg(input.jpeg),{x:10,y:10,width:60,height:40}); page.drawImage(await doc.embedPng(input.png),{x:80,y:10,width:60,height:40});" : ""}
        return doc.save();
      }`,
  };
}

function jsPdf(images: boolean): Profile {
  return {
    id: images ? "jspdf-images" : "jspdf-text",
    library: "jspdf",
    features: images ? "Text + JPEG + PNG/alpha" : "Standard-font text",
    source: `import { jsPDF } from 'jspdf'; export function run(input) {
      const doc = new jsPDF({unit:'pt', format:[200,100], orientation:'landscape'});
      doc.setFont('helvetica'); doc.setFontSize(10); doc.text(input.text,10,20);
      ${images ? "doc.addImage(input.jpeg,'JPEG',10,50,60,40); doc.addImage(input.png,'PNG',80,50,60,40);" : ""}
      return new Uint8Array(doc.output('arraybuffer'));
    }`,
  };
}

function pdfKit(images: boolean): Profile {
  return {
    id: images ? "pdfkit-images" : "pdfkit-text",
    library: "pdfkit",
    features: images ? "Text + JPEG + PNG/alpha" : "Standard-font text",
    source: `import {PDFDocument,registerStdFonts} from 'pdfkit-current'; import Helvetica from 'pdfkit-current/standard-fonts/Helvetica';
      registerStdFonts(Helvetica);
      export function run(input) { return new Promise((resolve,reject) => {
        const doc = new PDFDocument({size:[200,100],margin:0}); const chunks = [];
        doc.on('data', chunk => chunks.push(chunk)); doc.on('error',reject);
        doc.on('end',async () => resolve(new Uint8Array(await new Blob(chunks).arrayBuffer())));
        doc.font('Helvetica').fontSize(10).text(input.text,10,10);
        ${images ? "doc.image(input.jpeg,10,50,{width:60,height:40}); doc.image(input.png,80,50,{width:60,height:40});" : ""}
        doc.end();
      }); }`,
  };
}

function pdfMake(images: boolean, roboto = false): Profile {
  return {
    id: roboto ? "pdfmake-roboto" : images ? "pdfmake-images" : "pdfmake-text",
    library: "pdfmake",
    features: roboto ? "Text + bundled Roboto VFS" : images ? "Text + JPEG + PNG/alpha" : "Standard-font text",
    source: `import pdfMake from 'pdfmake/build/pdfmake.js'; ${images ? dataUri : ""}
      ${roboto ? "import vfs from 'pdfmake/build/vfs_fonts.js'; pdfMake.addVirtualFileSystem(vfs);" : "import helvetica from 'pdfmake/build/standard-fonts/Helvetica.js'; pdfMake.addFontContainer(helvetica);"}
      export async function run(input) {
        const content = [{text:input.text,absolutePosition:{x:10,y:10}}];
        ${images ? "content.push({image:uri(input.jpeg,'jpeg'),width:60,height:40,absolutePosition:{x:10,y:50}},{image:uri(input.png,'png'),width:60,height:40,absolutePosition:{x:80,y:50}});" : ""}
        const doc = pdfMake.createPdf({pageSize:{width:200,height:100},pageMargins:0,defaultStyle:{font:'${roboto ? "Roboto" : "Helvetica"}',fontSize:10},content});
        return new Uint8Array(await doc.getBuffer());
      }`,
  };
}

function reactPdf(images: boolean): Profile {
  return {
    id: images ? "react-pdf-images" : "react-pdf-text",
    library: "@react-pdf/renderer",
    features: images ? "React text + JPEG + PNG/alpha" : "React + standard-font text",
    source: `import {createElement as h} from 'react'; import {Document,Page,Text,Image,pdf} from '@react-pdf/renderer';
      ${images ? dataUri : ""}
      export async function run(input) {
        const children = [h(Text,{key:'text',style:{position:'absolute',left:10,top:10,fontSize:10}},input.text)];
        ${images ? "children.push(h(Image,{key:'jpeg',src:uri(input.jpeg,'jpeg'),style:{position:'absolute',left:10,top:50,width:60,height:40}}),h(Image,{key:'png',src:uri(input.png,'png'),style:{position:'absolute',left:80,top:50,width:60,height:40}}));" : ""}
        return new Uint8Array(await (await pdf(h(Document,null,h(Page,{size:[200,100]},...children))).toBlob()).arrayBuffer());
      }`,
  };
}

export function competitors(): Profile[] {
  return [
    pdfLib(false),
    pdfLib(true),
    pdfLib(false, true),
    jsPdf(false),
    jsPdf(true),
    pdfKit(false),
    pdfKit(true),
    pdfMake(false),
    pdfMake(true),
    pdfMake(false, true),
    reactPdf(false),
    reactPdf(true),
  ];
}
