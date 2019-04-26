import Writer from './writer';
import Ref from './ref';
import Page from '../src/page';
import Font from '../src/font';
import StreamBuffer from './streambuffer';


export default class Document 
{
	constructor(aStreamBuffer) 
	{
		this.mPages = [];
		this.mFonts = {};
		this.mFontRefs = {};
		this._objects = [];

		const version = '1.3';

		this.mWriter = new Writer(this, aStreamBuffer);
		this.mWriter.append('%PDF-' + version + '\n');
	}

	addPage() 
	{
		var page = new Page(this);
		this.mPages.push(page);
		return page;
	}

	registerFont(aFont)
	{
		if (!(aFont instanceof Font))
		{
			throw "argument not a font"
		}

		this.mFonts[aFont.mIdentity] = aFont;
	}

	getFontRef(aIdentity)
	{
		return this.mFontRefs[aIdentity];
	}

	close()
	{
		this.mPages.forEach(page => page.close());

		var keys = Object.keys(this.mFonts);
		for (var i = 0; i < keys.length; i++)
		{
			this.mFontRefs[keys[i]] = this.mFonts[keys[i]].print(this);
		}

		var pages = [];
		this.mPages.forEach(page => pages.push(page.printHeader()));

		var pagesRef = this.ref({
			Count: this.mPages.length,
			Type: 'Pages',
			Kids: pages
		});

		this.mCatalogRef = this.ref({
			Type: 'Catalog',
			Pages: pagesRef
		});

		this.mWriter.finish();
	}

	ref(aObject) 
	{
		var index = this.mWriter.obj(aObject);

		return new Ref(this, aObject, index);
	}
}
