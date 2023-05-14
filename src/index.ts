import A4 from './boxes/a4';
import Image from './image';
import Ref from './ref';
import Stream from './stream';
import Writer from './writer';

/*
function text() {

}

{
  $stream: ['asas', { $binary: '' }]
}
*/

export default class Document {
  _cat: any;
  _currentPage: any;
  _imageCount: any;
  _objects: any;
  _pages: any;
  constructor() {
    this._objects = [];
    this._pages = this.ref({
      Count: 0,
      Type: 'Pages',
      Kids: []
    });
    this._cat = this.ref({
      Type: 'Catalog',
      Pages: this._pages
    });
    this._imageCount = 0;
  }

  addPage(options = {}) {
    const content = new Stream(this);
    const pages = this._pages.object;
    this._currentPage = this.ref({
      Type: 'Page',
      // @ts-expect-error TS(2339): Property 'mediaBox' does not exist on type '{}'.
      MediaBox: options.mediaBox || A4,
      Parent: this._pages,
      Contents: this.ref(content),
      Resources: this.ref({
        Font: {
          G: this.ref({
            Type: 'Font',
            Subtype: 'Type1',
            BaseFont: 'Helvetica',
            Encoding: 'WinAnsiEncoding'
          })
        },
        XObject: {}
      })
    });
    pages.Kids.push(this._currentPage);
    pages.Count++;
    return this._currentPage;
  }

  currentPage() {
    return this._currentPage;
  }

  addImage(data: any) {
    const label = `Image${++this._imageCount}`;
    const image = Image.open(data, label);
    image.embed(this);
    const resources = this._currentPage.object.Resources.object;
    resources.XObject[image.label] = image.obj;
    return resources.XObject;
  }

  ref(obj: any) {
    return new Ref(this, this._objects.push(obj), obj);
  }

  write(fn: any) {
    const w = new Writer(fn || console.log);
    w.start(this);
  }
}
