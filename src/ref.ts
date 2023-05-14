export default class Ref {
  _doc: any;
  _index: any;
  _obj: any;
  constructor(doc: any, index: any, obj: any) {
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
