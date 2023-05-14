export interface Token {
  type: string;
  length?: number;
  text?: string;
}

const rMatch = (re: RegExp, process: any) => {
  // eslint-disable-line arrow-body-style
  return {
    match: (stream: any) => re.test(stream),
    process
  };
};

const rExtract = (re: RegExp, len?: number) => (token: Token, stream: string) => {
  const matches = stream.match(re);
  const result = token;
  result.text = matches?.[1];
  result.length = matches?.[0]?.length;
  if (len) {
    // @ts-expect-error This error seems correct, but refraining from changes for now
    result.length += len;
  }

  // hack for string match
  if (!token.text) {
    result.text = matches?.[0]?.substring(1, matches[0].length - 1);
  }
};

const rToken = (re: RegExp, len?: number) => rMatch(re, rExtract(re, len));

/* order is important as it matches from top to bottom, if it finds a match it is done */
export const TokenTypes = {
  xmlHead: rToken(/^<\?xml .*\?>/),
  '>': rMatch(/^>/, null),
  ws: rToken(/^(\s+)/),
  assign: rToken(/^(=)/),
  comment: rToken(/^<!--(.*?)-->/),
  startTag: rToken(/^<([A-Za-z][A-Za-z0-9]*)[\s|>]?/),
  attributeName: rToken(/^([A-Za-z0-9:]+)[\s]*?=/, -1),
  string: rToken(/^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/),
  endTag: rToken(/^\/>|^<\/(.+?)>/),
  text: rToken(/^([^<^>]+)/)
};

export default class Lexer {
  _pos: number;
  _stream: string;

  constructor(xml: string) {
    this._pos = 0;
    this._stream = xml;
  }

  peek(): Token {
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
            if (process(token, this._stream)) {
            }
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

  isNext(tokenType: string) {
    return this.peek().type === tokenType;
  }

  next() {
    const token = this.peek();
    // @ts-expect-error TS(2339): Property 'length' does not exist on type '{ type: ... Remove this comment to see the full error message
    this._fwd(token.length);
    return token;
  }

  _fwd(length: number) {
    this._pos += length;
    this._stream = this._stream.substring(length);
  }
}
