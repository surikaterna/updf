import should from 'should';
import PdfDoc from '../src';
// import { doesNotMatch } from 'assert';
import A4 from '../src/boxes/a4';
import block from '../src/content/block';
import document from '../src/content/document';
import image from '../src/content/image';
import page from '../src/content/page';
import helvetica from '../src/font/helvetica';
import buildProps from '../src/vdom/buildProps';
import layouter from '../src/vdom/layouter';
import reduce from '../src/vdom/reduce';
import renderer from '../src/vdom/renderer';

should();

/*
function _render(node) {
  const ch = (node.props && node.props.children && node.props.children.map(child => render(child))) || [];
  const newProps = Object.assign({}, node.props, { children: ch.join('\n') });
  const res = (node.type && node.type(newProps)) || node;
  return res;
}*/

// This is done in a linear time O(n) without recursion
// memory complexity is O(1) or O(n) if mutable param is set to false
function flatten(array, mutable) {
  var toString = Object.prototype.toString;
  var arrayTypeStr = '[object Array]';

  var result = [];
  var nodes = (mutable && array) || array.slice();
  var node;

  if (!array.length) {
    return result;
  }

  node = nodes.pop();

  do {
    if (toString.call(node) === arrayTypeStr) {
      nodes.push.apply(nodes, node);
    } else {
      result.push(node);
    }
  } while (nodes.length && (node = nodes.pop()) !== undefined);

  result.reverse(); // we reverse result to restore the original order
  return result;
}


function solve(vnode, context) {
  return reduce(vnode, context);
}

function render(vnode, context) {
  const solved = solve(vnode, context);
  return solved.render(buildProps(solved), context);
}


// seq
// instr
// font
// xobject

describe('PdfDoc', () => {
  it('should create a file', () => {
    const doc = new PdfDoc();
    doc.addPage();
    doc.currentPage().object.Contents.object.append('BT /G 24 Tf 175 720 Td (Hello World!)Tj ET\nBT /G 24 Tf 175 620 Td (Hello PDF!)Tj ET');
    const out = [];
    try {
      doc.write((e) => out.push(e));
    } catch (e) {
      console.log(doc._objects);
      console.error(e);
    }
    // console.log(out.join(''));
  });

  it.only('Should create an image pdf', () => {
    try {
      let output = new Buffer('', 'ascii');
      const pages = [];
      const paths = [
        './test/images/portrait.jpg',
        './test/images/land.jpg'
      ];

      paths.forEach(path => {
        const i = image({}, [path]);
        const b = block({}, [i]);
        const p = page(Object.assign({ mediaBox: A4 }), [b]);
        pages.push(p);
      });

      const pdfDocument = document({}, pages);

      class Fonts {
        constructor() {
          this._fonts = {};
        }
        add(family, font) {
          this._fonts[family] = font;
          return font;
        }
        get(family) {
          return this._fonts[family];
        }
      }

      try {
        const context = {
          width: 500,
          height: 500,
          maxWidth: 500,
          maxHeight: 500,
          mediaBox: A4,
          ax: 0,
          ay: 0,
          fonts: new Fonts()
        };
        context.font = context.fonts.add('Helvetica', helvetica);
        const rb = reduce(pdfDocument, context);
        layouter(rb, context);
        const doc = renderer(rb, context);
        doc.write((e) => {
          output = Buffer.concat([output, Buffer.from(e)]);
        });
      } catch (error) {
        console.log('Failed to render document. Message: %s', error.message);
      }

      require('fs').writeFileSync('./image.pdf', output);
    } catch (error) {
      console.log(error);
    }
  });

  it('stream', () => {
    const doc = new PdfDoc();
    const r = page({ mediaBox: [0, 0, 595.28, 841.89] },
      block({ style: { top: 0, left: 100, position: 'absolute' } },
        ['Hello world!', 'Again!'])
    );
    // console.log('STREAM: ', JSON.stringify(r, null, 2));
    // console.log('S STREAM:\n', JSON.stringify(solve(r), null, 2));
    const out = [];
    try {
      doc.write((e) => {
        if (out.length === 0) {
        }
        out.push(e);
      });
    } catch (e) {
      console.log(doc._objects);
      console.error(e);
    }
    console.log('R STREAM:\n', JSON.stringify(render(r, { doc }), null, 2));
    console.log('RR STREAM:\n\n' + out.join(''));
    // console.log('REN2 STREAM:\n', _render(r));
  });
});
/*
const a = {
  type: 'content',
  props: {
    x: 200,
    y: 200,
    width: 100,
    children: [
      {
        type: 'text'
      }
    ]
  }
};

const FirstPage = (props) => {
  return (
    <Page>
      <Box>
        <Text>
          What we've got here is a failure to communicate!
        </Text>
      </Box>

    </Page>
  );
}

<Document>
  <Page mediaBox={[0, 0, 500, 800]} >
    <Box x={0} y={0} width={250} style={{ marginRight: 5 }}>
      <Text style={{ font: 'Helvetica', align: 'center' }}>
        Welcome to the new world
      </Text>
      <Text style={{ font: 'Helvetica', align: 'center' }}>
        Welcome to the new world
      </Text>
    </Box>
  </Page>
</Document>;
*/
