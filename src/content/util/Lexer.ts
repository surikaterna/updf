const rMatch = (re: any, process: any) => {
  // eslint-disable-line arrow-body-style
  return {
    match: (stream: any) => re.test(stream),
    process
  };
};

const rExtract = (re: any, len: any) => (token: any, stream: any) => {
  const match = stream.match(re);
  const result = token;
  result.text = match[1];
  result.length = match[0].length;
  if (len) {
    result.length += len;
  }

  // hack for string match
  if (!token.text) {
    result.text = match[0].substring(1, match[0].length - 1);
  }
};

const rToken = (re: any, len: any) => rMatch(re, rExtract(re, len));
const feeder = (startChar: any, endChar: any) => (token: any, stream: any) => {
  let pos = 0;
  let end;
  let count = 0;
  const result = token;
  while (!end) {
    switch (stream[pos++]) {
      case startChar:
        count++;
        break;
      case endChar:
        count--;
        if (!count) {
          end = pos;
        }
        break;
      default:
    }
  }
  result.length = end;
  result.text = stream.substring(1, end - 1);
};

/* order is important as it matches from top to bottom, if it finds a match it is done */
export const TokenTypes = {
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  xmlHead: rToken(/^<\?xml .*\?>/),
  '>': rMatch(/^>/, null),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  ws: rToken(/^(\s+)/),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  assign: rToken(/^(=)/),
  // expression: rMatch(/^{/, feeder('{', '}')),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  comment: rToken(/^<!--(.*?)-->/),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  startTag: rToken(/^<([A-Za-z][A-Za-z0-9]*)[\s|>]?/),
  attributeName: rToken(/^([A-Za-z0-9:]+)[\s]*?=/, -1),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  string: rToken(/^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  endTag: rToken(/^\/>|^<\/(.+?)>/),
  // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
  text: rToken(/^([^<^>]+)/)
};

export default class Lexer {
  _pos: any;
  _stream: any;
  constructor(xml: any) {
    this._pos = 0;
    this._stream = xml;
    // this['>'] = function () {
    //   this._fwd(1);
    //   return this.peek();
    // };
  }
  peek() {
    let token;
    for (const type in TokenTypes) {
      if (TokenTypes.hasOwnProperty(type)) {
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (TokenTypes[type].match(this._stream)) {
          // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          const process = TokenTypes[type].process;
          if (!process) {
            // skip char if no process method
            this._fwd(type.length);
          } else if (type === 'ws') {
            const ws = {};
            process(ws, this._stream);
            // @ts-expect-error TS(2339): Property 'length' does not exist on type '{}'.
            this._fwd(ws.length);
          } else {
            token = { type };
            // @ts-expect-error TS(1313): The body of an 'if' statement cannot be the empty ... Remove this comment to see the full error message
            if (process(token, this._stream));
            break;
          }
        }
      }
    }
    if (!token) {
      throw new Error(`Lexing error: ${this._stream}`);
    }
    return token;
  }

  isNext(tokenType: any) {
    return this.peek().type === tokenType;
  }

  next() {
    const token = this.peek();
    // @ts-expect-error TS(2339): Property 'length' does not exist on type '{ type: ... Remove this comment to see the full error message
    this._fwd(token.length);
    return token;
  }

  _fwd(length: any) {
    this._pos += length;
    this._stream = this._stream.substring(length);
  }
}
