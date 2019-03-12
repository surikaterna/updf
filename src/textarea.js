import Paragraph from '../src/paragraph';
import Span from '../src/span';

export default class TextArea
{
	constructor(aBoundsTop, aBoundsLeft, aBoundsBottom, aBoundsRight, aParagraphs) 
	{
		this.mBoundsTop = aBoundsTop;
		this.mBoundsLeft = aBoundsLeft;
		this.mBoundsBottom = aBoundsBottom;
		this.mBoundsRight = aBoundsRight;
		this.mParagraphs = aParagraphs;
	}

	produce(aPage)
	{
		var content = "";
		
		content += "1 0 0 RG\n";
		content += this.mBoundsLeft + " " + this.mBoundsTop + " m\n";
		content += this.mBoundsRight + " " + this.mBoundsTop + " l\n";
		content += this.mBoundsRight + " " + this.mBoundsBottom + " l\n";
		content += this.mBoundsLeft + " " + this.mBoundsBottom + " l\n";
		content += "s\n";

		var boundsTop = this.mBoundsTop;

		for (var paraIndex = 0; paraIndex < this.mParagraphs.length; paraIndex++)
		{
			var paragraph = this.mParagraphs[paraIndex];
			var spans = paragraph.mSpans;

			var style = paragraph.mSpans[0].mStyle;
			aPage.registerFont(style.mFont);

			var targetY = boundsTop - style.mDescent - style.mLineHeight;

			for (var spanIndex = 0; spanIndex < spans.length; spanIndex++)
			{
				var span = spans[spanIndex];
				var text = span.mText;

				for (var textOffset = 0; textOffset < text.length;)
				{
					var targetX = this.mBoundsLeft;
					var currentX;

					for (;;)
					{
						var breakLine = [false];
						var nextSegmentLength = this.layoutLine(span, textOffset, targetX, breakLine, this.mBoundsRight);
						if (nextSegmentLength == 0)
						{
							break;
						}

						if (targetY < this.mBoundsBottom)
						{
							textOffset = text.length;
							break;
						}

						content += "BT\n";
						content += `/${style.mIdentity} ${style.mSize} Tf\n`;

						currentX = 0;

						var currentY = 0;

						for (var i = 0; i < nextSegmentLength; i++, textOffset++)
						{
							var ch = text.charCodeAt(textOffset);

							content += Number(targetX - currentX).toFixed(6) + " " + Number(targetY - currentY).toFixed(6) + " Td <" + ("0000" + style.getGlyphIndex(ch).toString(16)).substr(-4).toUpperCase() + "> Tj\n";

							currentX = targetX;
							currentY = targetY;

							targetX += style.getAdvance(ch);
						}

						targetY -= style.mLineHeight;

						if (breakLine[0])
						{
							break;
						}
					}

					content += "ET\n";
				}
			}

			boundsTop = targetY + style.mDescent + style.mLineHeight;
		}

		return content;
	}

	layoutLine(aSpan, aTextOffset, aTargetX, aBreakLine, aMaxLineLength)
	{
		var len = -1;

		for (var i = 1, limit = aSpan.mText.length - aTextOffset; i <= limit; i++)
		{
			if (i == limit)
			{
				len = limit;
				aBreakLine[0] = true;
				break;
			}

			var ch = aSpan.mText.charAt(aTextOffset + i);

			var x = aTargetX + aSpan.mStyle.measureText(aSpan.mText, aTextOffset, i);

			if (x > aMaxLineLength)
			{
				aBreakLine[0] = true;
				break;
			}
			if (ch == ' ')
			{
				len = i + 1;
			}
		}

		return len;
	}
}