import TextArea from '../src/textarea';
import StreamBuffer from './streambuffer';
import Font from './font';

export default class Page
{
	constructor(aDocument)
	{
		this.mDocument = aDocument;
		this.mFonts = {};
		this.mContent = new StreamBuffer();
		this.mParent = "";
	}

	append(aContent)
	{
		if (aContent instanceof TextArea)
		{
			this.mContent.append(aContent.produce(this));
		}
		else
		{
			this.mContent.append(aContent);
		}
	}

	registerFont(aFont)
	{
		if (!(aFont instanceof Font))
		{
			throw "argument not a font"
		}

		if (!this.mFonts[aFont.mIdentity])
		{
			this.mDocument.registerFont(aFont);

			this.mFonts[aFont.mIdentity] = aFont;
		}
	}

	close()
	{
		if (!this.mContentRef)
		{
			this.mContentRef = this.mDocument.ref(this.mContent);
		}
	}

	printHeader()
	{
		var fonts = {
			G: this.mDocument.ref(
				{
					Type: 'Font',
					Subtype: 'Type1',
					BaseFont: 'Helvetica'
				}).toString()
		};

		var keys = Object.keys(this.mFonts);
		for (var i = 0; i < keys.length; i++)
		{
			fonts[keys[i]] = this.mDocument.getFontRef(keys[i]);
		}

		var resourceRef = this.mDocument.ref({
				Font: fonts
			});

		var pageRef = this.mDocument.ref({
			Type: 'Page',
			MediaBox: [0, 0, 595, 842],
			// Parent: this.mParent,
			Contents: this.mContentRef,
			Resources: resourceRef
		});

		return pageRef;
	}
}