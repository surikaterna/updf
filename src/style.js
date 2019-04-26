export default class Style
{
	constructor(aFont, aSize) 
	{
		this.mFont = aFont;
		this.mSize = aSize;
		this.mTTFMetadata = aFont.mTTFMetadata;

		this.mIdentity = this.mFont.mIdentity;
		this.mLineHeight = this.scale(this.mTTFMetadata.LineHeight);
		this.mAscent = this.scale(this.mTTFMetadata.Ascent);
		this.mDescent = this.scale(this.mTTFMetadata.Descent);
		this.mLineGap = this.scale(this.mTTFMetadata.LineGap);
	}

	getGlyphIndex(aCharacter)
	{
		if (isNaN(aCharacter))
		{
			console.trace();
			throw "Errror: not a number: " + aCharacter;
		}

		var glyph = this.mTTFMetadata.GlyphIndex["" + aCharacter][0];
		this.mFont.registerGlyph(aCharacter, glyph);
		return glyph;
	}

	getAdvance(aCharacter)
	{
		return this.mSize * this.mTTFMetadata.GlyphMetrics[this.mTTFMetadata.GlyphIndex["" + aCharacter][1]][0] / this.mTTFMetadata.UnitsPerEm;
	}

	getLeftBearing(aCharacter)
	{
		return this.mSize * this.mTTFMetadata.GlyphMetrics[this.mTTFMetadata.GlyphIndex["" + aCharacter][1]][1] / this.mTTFMetadata.UnitsPerEm;
	}

	measureText(aText, aOffset, aLength)
	{
		var len = 0;

		for (var i = 0; i < aLength; i++)
		{
			len += this.getAdvance(aText.charCodeAt(aOffset + i));
		}

		return len;
	}

	scale(aValue)
	{
		return aValue * this.mSize / (this.mTTFMetadata.Ascent - this.mTTFMetadata.Descent);
	}
}