import { Document, DocumentRef } from './Document';

export default class Ref<T extends object = object> implements DocumentRef<T> {
  _doc: Document<T>;
  _index: number;
  _obj: T;

  constructor(doc: Document<T>, index: number, obj: T) {
    this._doc = doc;
    this._index = index;
    this._obj = obj;
  }

  get object(): T {
    return this._obj;
  }

  get index(): number {
    return this._index;
  }
}
