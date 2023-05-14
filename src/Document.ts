import { Box } from './boxes/Box';

export interface Document<T extends object = any> {
  addPage(options?: AddPageOptions): DocumentRef<PageRef>;
}

export interface DocumentRef<T extends object> {
  _doc: Document<T>;
  object: T;
  index: number;
}

export type FontRef = {
  Type: 'Font';
  Subtype: string;
  BaseFont: string;
  Encoding: string;
};

export type PageRef = {
  Type: 'Page';
  MediaBox: Box;
  Parent: DocumentRef<PagesRef>;
  Contents: StreamRef;
  Resources: DocumentRef<ResourcesRef>;
};

export type PagesRef = {
  Type: 'Pages';
  Count: number;
  Kids: Array<any>;
};

export type ResourcesRef = {
  Font: {
    G: DocumentRef<FontRef>;
  };
  XObject: XObject;
};

export type StreamRef = any;

export type CatalogRef = {
  Type: 'Catalog';
  Pages: DocumentRef<PagesRef>;
};

export type AddPageOptions = {
  mediaBox?: Box;
};

export type Page = Record<string, unknown>;

export type XObject = any;
