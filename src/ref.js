export default class Ref 
{
	constructor(doc, obj, index) 
	{
		this.mDocument = doc;
		this.mIndex = index;
		this.mObject = obj;
	}

	get object() 
	{
		return this.mObject;
	}

	get index() 
	{
		return this.mIndex;
	}

	toString()
	{
		return this.mIndex + " 0 R";
	}
}
