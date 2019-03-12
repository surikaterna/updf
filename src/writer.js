import Ref from './ref';
import StreamBuffer from './streambuffer';

function isObject(obj) 
{
	return obj === Object(obj);
}

function _leftPad(str, i, ch = ' ') 
{
	while (str.length < i) str = ch + str;
	return str;
}

class Writer 
{
	constructor(aDoc, aStreamBuffer) 
	{
		this.mDocument = aDoc;
		this.mOffset = 0;
		this.mReferences = [];
		this.mStreamBuffer = aStreamBuffer;
	}

	append(aValue)
	{
		this.mStreamBuffer.append(aValue);
		this.mOffset += aValue.length;
		return this;
	}

	finish()
	{
		// xref
		const startxref = this.mOffset;
		const xrefs = this.mReferences.length + 1;
		this.append('xref\n')
		this.append('0 ' + (xrefs) + '\n');
		this.append('0000000000 65535 f\n')
		this.mReferences.forEach(xref => 
		{
			this.append(_leftPad(xref.toString(), 10, '0') + ' 00000 n\n');
		});

		// trailer
		this.append('trailer\n').any(
			{
			Size: xrefs,
			Root: this.mDocument.mCatalogRef
		})
			.append('startxref\n')
			.any(startxref)
			.append('\n%%EOF');
	}

	any(aParam) 
	{
		if (aParam instanceof Ref) 
		{
			this.append(`${aParam.index} 0 R`);
		}
		else if (aParam instanceof StreamBuffer) 
		{
			this.stream(aParam.content());
		}
		else if (aParam instanceof Buffer) 
		{
			this.stream(aParam);
		}
		else if (aParam && aParam.constructor === Array) 
		{
			this.append('[');
			aParam.forEach((e, i) => 
			{
				this.any(e);
				if (i + 1 !== aParam.length) 
				{
					this.append(' ');
				}
			});
			this.append(']');
		}
		else if (isObject(aParam)) 
		{
			this.dict(aParam);
		} 
		else if (typeof aParam === 'string') 
		{
			this.append('/' + aParam);
		} 
		else if (typeof aParam === 'number') 
		{
			this.append(aParam.toString());
		}
		else 
		{
			throw new Error('Unknown: ' + typeof aParam);
		}
		return this;
	}

	stream(aBuffer) 
	{
		this.any({
			Length: aBuffer.length
		});
		this.append('stream\n');
		this.append(aBuffer);
		this.append('endstream\n');
	}

	dict(dict) 
	{
		this.append('<<');
		const keys = Object.keys(dict);
		keys.forEach((k, i) => 
		{
			this.any(k).append(' ').any(dict[k]);
			if (i + 1 !== keys.length) 
			{
				this.append(' ');
			}
		});
		this.append('>>\n');
	}

	obj(obj) 
	{
		this.mReferences.push(this.mOffset);
		this.append(`${this.mReferences.length} 0 obj\n`);
		this.any(obj);
		this.append('endobj\n');

		return this.mReferences.length;
	}
}

export default Writer;