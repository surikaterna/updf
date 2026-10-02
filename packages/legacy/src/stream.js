export default class Stream {
  constructor(doc) {
    this._doc = doc;
    this._content = Buffer.from('');
  }
  append(data) {
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
