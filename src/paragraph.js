import Span from '../src/span';

export default class Paragraph
{
	constructor() 
	{
		this.mSpans = [];

		for (var i = 0; i < arguments.length; i++)
		{
			if (!(arguments[i] instanceof Span))
			{
				throw "not a span";
			}

			this.mSpans[i] = arguments[i];
		}

		if (this.mSpans.length != 1)
		{
			throw "Sorry, only a single span per paragraph supported at this time!!";
		}
	}
}