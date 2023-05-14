import A4 from './boxes/a4';
import { AddPageOptions, CatalogRef, Document, DocumentRef, FontRef, Page, PageRef, PagesRef, ResourcesRef, XObject } from './Document';
import Image from './image';
import Ref from './ref';
import Stream from './stream';
import Writer from './writer';

export default class UPDF implements Document {
  _cat: DocumentRef<CatalogRef>;
  _currentPage?: DocumentRef<PageRef>;
  _imageCount: number;
  _objects: Array<any>;
  _pages: DocumentRef<PagesRef>;

  constructor() {
    this._objects = [];
    this._pages = this.ref<PagesRef>({
      Count: 0,
      Type: 'Pages',
      Kids: []
    });

    this._cat = this.ref<CatalogRef>({
      Type: 'Catalog',
      Pages: this._pages
    });

    this._imageCount = 0;
  }

  addPage(options: AddPageOptions = {}): DocumentRef<PageRef> {
    const content = new Stream(this);
    const pages = this._pages.object;
    this._currentPage = this.ref<PageRef>({
      Type: 'Page',
      MediaBox: options.mediaBox || A4,
      Parent: this._pages,
      Contents: this.ref(content),
      Resources: this.ref<ResourcesRef>({
        Font: {
          G: this.ref<FontRef>({
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

  addImage(data: Buffer): XObject {
    const label = `Image${++this._imageCount}`;
    const image = Image.open(data, label);
    image.embed(this);
    const resources = this._currentPage?.object.Resources.object;
    // @ts-expect-error The error seem correct, but refraining from changing for now
    resources.XObject[image.label] = image.obj;
    // @ts-expect-error The error seem correct, but refraining from changing for now
    return resources.XObject;
  }

  ref<T extends object>(obj: T): Ref<T> {
    return new Ref<T>(this, this._objects.push(obj), obj);
  }

  write(fn: any) {
    const w = new Writer(fn || console.log);
    w.start(this);
  }
}
