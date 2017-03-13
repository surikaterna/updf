export default class Stream {
  constructor(doc) {
    this._doc = doc;
    this._content = [];
  }
  append(data) {
    this._content.push(data);
    return this;
  }
  get content() {
    return this._content.join('');
  }
}
