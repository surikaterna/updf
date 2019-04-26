import StreamBuffer from '../src/streambuffer';

export default class Font
{
	constructor(aFontBinaryData, aTTFMetadata, aIdentity) 
	{
		this.mFontBinaryData = aFontBinaryData;
		this.mTTFMetadata = aTTFMetadata;
		this.mIdentity = aIdentity;
		this.mGlyphMap = {};
	}

	registerGlyph(aGlyph, aCharacter)
	{
		this.mGlyphMap["" + aGlyph] = aCharacter;
	}

	generateCMap()
	{
		var output = "";
		output += "/CIDInit /ProcSet findresource begin\n";
		output += "12 dict begin\n";
		output += "begincmap\n";
		output += "/CIDSystemInfo\n";
		output += "<< /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n";
		output += "/CMapName /Adobe-Identity-UCS def\n";
		output += "/CMapType 2 def\n";
		output += "1 begincodespacerange\n";
		output += "<0000> <FFFF>\n";
		output += "endcodespacerange\n";

		var keys = Object.keys(this.mGlyphMap);

		for (var outer = 0; outer < keys.length; outer += 100)
		{
			var size = Math.min(keys.length - outer * 100, 100);

			output += size + " beginbfchar\n";

			for (var inner = outer; inner < outer + size; inner++)
			{
				output += "<" + this.toHex(this.mGlyphMap[keys[inner]]) + "> <" + this.toHex(parseInt(keys[inner])) + ">\n";
			}

			output += "endbfchar\n";
		}

		output += "endcmap\n";
		output += "CMapName currentdict /CMap defineresource pop\n";
		output += "end\n";
		output += "end\n";

		return output;
	}


	toHex(aValue)
	{
		return ("0000" + aValue.toString(16)).substr(-4).toUpperCase();
	}


	print(aDocument)
	{
		var cmap = new StreamBuffer();
		cmap.append(this.generateCMap());

		var fontRef = aDocument.ref(this.mFontBinaryData);
		var cmapRef = aDocument.ref(cmap);
	
		var fontRef = aDocument.ref(
			{
				Type: 'Font',
				Subtype: 'Type0',
				BaseFont: this.mTTFMetadata.Name,
				DescendantFonts: 
					{
						Type: 'Font',
						Subtype: 'CIDFontType2',
						BaseFont: this.mTTFMetadata.Name,
						CIDSystemInfo: {
							Ordering: 'Identity',
							Registry: '(Adobe)',
							Supplement: 0
						},
						CIDToGIDMap: 'Identity',
						FontDescriptor: {
							Type: 'FontDescriptor',
							Ascent: this.mTTFMetadata.Ascent,
							CapHeight: this.mTTFMetadata.CapHeight,
							Descent: this.mTTFMetadata.Descent,
							Flags: 0,
							FontBBox: this.mTTFMetadata.FontBBox,
							FontFile2: fontRef,
							FontName: this.mTTFMetadata.Name,
							ItalicAngle: 0,
							StemV: 76
						}
					}
				,
				Encoding: 'Identity-H',
				ToUnicode: cmapRef
			});

		return fontRef;
	}
}