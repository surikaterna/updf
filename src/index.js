import Writer from './writer';
import Ref from './ref';
import Stream from './stream';
/*
function text() {

}

{
  $stream: ['asas', { $binary: '' }]
}
*/


export default class Document {
  constructor() {
    this._objects = [];
    this._pages = this.ref({
      Count: 0,
      Type: 'Pages',
      Kids: []
    });
    this._cat = this.ref(
      {
        Type: 'Catalog',
        Pages: this._pages
      }
    )
  }

  addPage(options = {}) {
    const content = new Stream(this);
    const pages = this._pages.object;
    this._currentPage = this.ref(
      {
        Type: 'Page',
        MediaBox: options.mediaBox || [0, 0, 595.28, 841.89],
        Parent: this._pages,
        Contents: this.ref(content),
        Resources: this.ref({
          Font: {
            G: this.ref(
              {
                Type: 'Font',
                Subtype: 'Type1',
                BaseFont: 'Helvetica'
              })
          }
        })
      })
    pages.Kids.push(this._currentPage);
    pages.Count++;
    return this._currentPage;
  }

  currentPage() {
    return this._currentPage;
  }

  ref(obj) {
    return new Ref(this, this._objects.push(obj), obj)
  }

  write(fn) {
    const w = new Writer(fn || console.log);
    w.start(this);
  }
}
