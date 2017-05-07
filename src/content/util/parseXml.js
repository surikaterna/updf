import Lexer from './Lexer';

class Parser {
  constructor(str) {
    this._lexer = new Lexer(str);
  }

  parse() {
    return this._element();
  }

  _element() {
    const node = {};
    const token = this._next('startTag');
    console.log('>', token.text);
    node.type = token.text;
    node.props = this._attributes();
    node.children = this._children();
    const end = this._next('endTag');
    console.log('<', token.text);
    if (end.text && end.text !== node.type) {
      throw new Error(`Start / End tag does not match: ${node.type} | ${end.text}`);
    }
    return node;
  }
  _attributes() {
    const props = {};
    let found = false;
    while (this._lexer.isNext('attributeName')) {
      found = true;
      Object.assign(props, this._attribute());
    }
    return found ? props : undefined;
  }
  _attribute() {
    const name = this._lexer.next();
    this._next('assign');
    return { [name.text]: this._value() };
  }
  _value() {
    const t = this._lexer.next();
    return t.text;
  }
  _children() {
    const children = [];
    let child;
    while (child = this._child()) { // eslint-disable-line no-cond-assign
      children.push(child);
    }
    return children;
  }

  _child() {
    console.log('ch', this._lexer.peek());
    let res;
    if (this._lexer.isNext('startTag')) {
      res = this._element();
    } else {
      res = this._text();
    }
    return res;
  }
  _text() {
    let res;
    if (this._lexer.isNext('text') || this._lexer.isNext('string')) {
      res = this._next().text;
    }
    //   } else if (this._lexer.isNext('string')) {
    // //      res = `"${this._next().text}"`;
    // //  }
    return res;
  }
  _next(expected) {
    const next = this._lexer.next();
    if (expected && next.type !== expected) {
      throw new Error(`Unable to parse, expected: ${expected}`);
    }
    return next;
  }
}

export default function parseXml(str) {
  return new Parser(str).parse();
}