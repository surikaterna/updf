export default class Stream {
  _content: any;
  _doc: any;
  constructor(doc: any) {
    this._doc = doc;
    this._content = Buffer.from('');
  }
  append(data: any) {
    this._content = Buffer.concat([this._content, Buffer.from(data)]);
    return this;
  }
  get content() {
    return this._content;
  }
  get length() {
    return this._content.length;
  }
}
