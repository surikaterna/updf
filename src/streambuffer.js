export default class StreamBuffer
{
	constructor() 
	{
		this.mOffset = 0;
		this.mBuffer = Buffer.alloc(4096);
	}

	append(aData) 
	{
		this.ensureCapacity(aData.length);

		if (aData instanceof StreamBuffer)
		{
			for (var i = 0; i < aData.length; i++)
			{
				this.mBuffer[this.mOffset++] = aData.mBuffer[i];
			}
		}
		else if (aData instanceof Buffer)
		{
			for (var i = 0; i < aData.length; i++)
			{
				this.mBuffer[this.mOffset++] = aData[i];
			}
		}
		else if (typeof aData == "string")
		{
			for (var i = 0; i < aData.length; i++)
			{
				this.mBuffer[this.mOffset++] = aData.charCodeAt(i);
			}
		}
		else
		{
			console.trace();
			throw "Unsupported: " + typeof aData;
		}
	}

	get length()
	{
		return this.mLength;
	}

	copyArray(aLength)
	{
		var tmp = Buffer.alloc(aLength);
		for (var i = 0; i < this.mOffset; i++)
		{
			tmp[i] = this.mBuffer[i];
		}
		return tmp;
	}

	content()
	{
		return this.copyArray(this.mOffset);
	}

	ensureCapacity(aLength)
	{
		if (this.mOffset + aLength > this.mBuffer.length)
		{
			this.mBuffer = this.copyArray((this.mOffset + aLength) * 3 / 2 + 1);
		}
	}
}
