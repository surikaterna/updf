const rMatch = (re, process) => { // eslint-disable-line arrow-body-style
  return {
    match: (stream) => re.test(stream),
    process
  };
};

const rExtract = (re, len) => (token, stream) => {
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

const rToken = (re, len) => rMatch(re, rExtract(re, len));
const feeder = (startChar, endChar) => (token, stream) => {
  let pos = 0;
  let end;
  let count = 0;
  const result = token;
  while (!end) {
    switch (stream[pos++]) {
      case startChar: count++; break;
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
  xmlHead: rToken(/^<\?xml .*\?>/),
  '>': rMatch(/^>/, null),
  ws: rToken(/^(\s+)/),
  assign: rToken(/^(=)/),
  // expression: rMatch(/^{/, feeder('{', '}')),
  comment: rToken(/^<!--(.*?)-->/),
  startTag: rToken(/^<([A-Za-z][A-Za-z0-9]*)[\s|>]?/),
  attributeName: rToken(/^([A-Za-z0-9:]+)[\s]*?=/, -1),
  string: rToken(/^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/),
  endTag: rToken(/^\/>|^<\/(.+?)>/),
  text: rToken(/^([^<^>]+)/)
};

export default class Lexer {
  constructor(xml) {
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
        if (TokenTypes[type].match(this._stream)) {
          const process = TokenTypes[type].process;
          if (!process) {
            // skip char if no process method
            this._fwd(type.length);
          } else if (type === 'ws') {
            const ws = {};
            process(ws, this._stream);
            this._fwd(ws.length);
          } else {
            token = { type };
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

  isNext(tokenType) {
    return this.peek().type === tokenType;
  }

  next() {
    const token = this.peek();
    this._fwd(token.length);
    return token;
  }

  _fwd(length) {
    this._pos += length;
    this._stream = this._stream.substring(length);
  }
}
