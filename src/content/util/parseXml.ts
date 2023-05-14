import Lexer from './Lexer';

class Parser {
  _lexer: any;
  constructor(str: any) {
    this._lexer = new Lexer(str);
  }

  parse() {
    this._head();
    return this._element();
  }
  _head() {
    if (this._lexer.isNext('xmlHead')) {
      return this._lexer.next();
    }
    return null;
  }

  _element() {
    const node = {};
    this._comments();
    const token = this._next('startTag');
    // @ts-expect-error TS(2339): Property 'type' does not exist on type '{}'.
    node.type = token.text;
    // @ts-expect-error TS(2339): Property 'props' does not exist on type '{}'.
    node.props = this._attributes();
    // @ts-expect-error TS(2339): Property 'children' does not exist on type '{}'.
    node.children = this._children();
    const end = this._next('endTag');
    // @ts-expect-error TS(2339): Property 'type' does not exist on type '{}'.
    if (end.text && end.text !== node.type) {
      // @ts-expect-error TS(2339): Property 'type' does not exist on type '{}'.
      throw new Error(`Start / End tag does not match: ${node.type} | ${end.text}`);
    }
    return node;
  }
  _comments() {
    while (this._lexer.isNext('comment')) {
      this._lexer.next();
    }
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
    while ((child = this._child())) {
      // eslint-disable-line no-cond-assign
      children.push(child);
    }
    return children;
  }

  _child() {
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
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      res = this._next().text;
    }
    //   } else if (this._lexer.isNext('string')) {
    // //      res = `"${this._next().text}"`;
    // //  }
    return res;
  }
  _next(expected: any) {
    const next = this._lexer.next();
    if (expected && next.type !== expected) {
      throw new Error(`Unable to parse, expected: ${expected} got ${next.type}`);
    }
    return next;
  }
}

export default function parseXml(str: any) {
  return new Parser(str).parse();
}
