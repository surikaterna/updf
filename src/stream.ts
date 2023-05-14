import { Document } from './Document';

export default class Stream {
  _content: Buffer;
  _doc: Document;

  constructor(doc: Document) {
    this._doc = doc;
    this._content = Buffer.from('');
  }

  append(data: Buffer): Stream {
    this._content = Buffer.concat([this._content, Buffer.from(data)]);
    return this;
  }

  get content(): Buffer {
    return this._content;
  }

  get length(): number {
    return this._content.length;
  }
}
