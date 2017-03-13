import should from 'should';
import PdfDoc from '../src';
import text from '../src/content/text';
import box from '../src/content/box';
import block from '../src/content/block';
import page from '../src/content/page';
import buildProps from '../src/content/_buildProps';

should();

const isFunction = (obj) => typeof obj === 'function';

class Page {
  constructor(page) {
    this._page = page;
  }
}

/*
function _render(node) {
  const ch = (node.props && node.props.children && node.props.children.map(child => render(child))) || [];
  const newProps = Object.assign({}, node.props, { children: ch.join('\n') });
  const res = (node.type && node.type(newProps)) || node;
  return res;
}*/

const isComponent = (node) => node.type && isFunction(node.type);

const buildComponent = (node, context) => {
  return node.type(buildProps(node), context);
}

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

function trav(vnode, context) {
  let node = vnode;
  // traverse all components until we get a node which is a "proper" vdom node
  while (isComponent(node)) {
    node = buildComponent(node, context);
  }

  if (typeof (node) === 'string') {
    node = text({ str: node });
  }

  let children;
  if (node === null) {
    throw new Error('Null returned from render fn');
    //node = {};
  } else if (Array.isArray(node)) {
    // For convenience, fake it into a seq vnode
    children = node;
  } else {
    children = node.children;
  }

  if (children) {
    //console.log('>>', node.type, children);
    const chlds = children.map(child => trav(child, context));
    console.log('CC', chlds);
    node.children = chlds;
  }

  return node;
}

function solve(vnode, context) {
  return trav(vnode, context);
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
    console.log(out.join(''));
  });
  it.only('stream', () => {
    const doc = new PdfDoc();
    const r = page({ mediaBox: [0, 0, 595.28, 841.89] },
      block({ style: { top: 0, left: 100, position: 'absolute' } },
        ['Hello world!', 'Again!'])
    );
    console.log('STREAM: ', JSON.stringify(r, null, 2));
    console.log('S STREAM:\n', JSON.stringify(solve(r), null, 2));
    console.log('R STREAM:\n', JSON.stringify(render(r, { doc }), null, 2));
    const out = [];
    try {
      doc.write((e) => out.push(e));
    } catch (e) {
      console.log(doc._objects);
      console.error(e);
    }
    console.log('RR STREAM:\n\n', out.join(''));
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
