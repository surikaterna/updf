export default class Ref {
  constructor(doc, index, obj) {
    this._doc = doc;
    this._index = index;
    this._obj = obj;
  }
  get object() {
    return this._obj;
  }
  get index() {
    return this._index;
  }
}
