import Ref from './ref';
import Stream from './stream';

function isObject(obj) {
  return obj === Object(obj);
}

function _leftPad(str, i, ch = ' ') {
  while (str.length < i) str = ch + str;
  return str;
}

/**
 * Object types:
  • Boolean values
  • Integer and real numbers
  • Strings (xx)
  • Names /Name
  • Arrays [A L L E L E M E N T S]
  • Dictionaries << /Key (value) >>
  • Streams dict stream...endstream
  • The null object
  index gen obj...endobj
  Ref object index gen R (12 0 R)
 */

/**
 * FS
 * header
 * body
 * crossref table (xref)
 *  index nr-of-items
 *  10digitbyteoffset 5cgen n|f
 * trailer
 *  trailer
 *  <<end of file dict>>
 *  startxref
 *  92151 //byteoffset
 *  %%EOF
 */


const version = '1.3';
class Writer {
  constructor(out) {
    this._offset = 0;
    this._out = (e) => {
      // console.log('!!!!!' + e + '%%%%');
      out(e);
      this._offset += e.length;
      return this;
    };
  }
  start(doc) {
    this._doc = doc;
    this._out('%PDF-' + version + '\n');
    // todo, store offsets;
    this._xref = [];

    this._doc._objects.forEach((o, i) => this.obj(o, i + 1));


    // xref
    const startxref = this._offset;
    const xrefs = this._xref.length + 1;
    this._out('xref\n');
    this._out('0 ' + (xrefs) + '\n');
    this._out('0000000000 65535 f\n');
    this._xref.forEach(xref => {
      this._out(_leftPad(xref.toString(), 10, '0') + ' 00000 n\n');
    });
    // trailer
    this._out('trailer\n').any({
      Size: xrefs,
      Root: doc._cat
    })
      ._out('startxref\n').any(startxref)
      ._out('\n%%EOF');


    // console.log('XR', this._xref);
  }
  any(any) {
    if (any instanceof Ref) {
      this._out(`${any.index} 0 R`);
    } else if (any instanceof Stream) {
      this.stream(any);
    } else if (any && any.constructor === Array) {
      this._out('[');
      any.forEach((e, i) => {
        this.any(e);
        if (i + 1 !== any.length) {
          this._out(' ');
        }
      });
      this._out(']');
    } else if (isObject(any)) {
      this.dict(any);
    } else if (typeof any === 'string') {
      this._out('/' + any);
    } else if (typeof any === 'number') {
      this._out(any.toString());
    } else {
      throw new Error('Unk' + typeof any);
    }
    return this;
  }

  stream(stream, noLength) {
    const content = stream.content;
    if (!noLength) {
      this.any({
        Length: content.length + 1
      });
    }
    this
      ._out('stream\n')
      ._out(content)
      ._out('\n')
      ._out('endstream\n');
  }

  dict(dict) {
    this._out('<<');
    const keys = Object.keys(dict);
    keys.forEach((k, i) => {
      if (k === 'stream') {
        return;
      }
      this.any(k)._out(' ').any(dict[k]);
      if (i + 1 !== keys.length) {
        this._out(' ');
      }
    });
    this._out('>>\n');
    keys.forEach((k, i) => {
      if (k === 'stream') {
        this.stream(dict[k], true);
        return;
      }
    });
  }

  obj(obj, index) {
    this._xref.push(this._offset);
    this._out(`${index} 0 obj\n`);

    /* if (index === 7) {
      console.log('*********', obj);
    } */
    this.any(obj);
    this._out('endobj\n');
  }
}

export default Writer;
