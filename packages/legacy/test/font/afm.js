/**
Uncompresses data compressed into custom, base16-like format. 
@public
@function
@param
@returns {Type}
*/
var uncompress = function(data){

	var decoded = '0123456789abcdef'
	, encoded = 'klmnopqrstuvwxyz'
	, mapping = {}

	for (var i = 0; i < encoded.length; i++){
		mapping[encoded[i]] = decoded[i]
	}

	var undef
	, output = {}
	, sign = 1
	, stringparts // undef. will be [] in string mode
	
	, activeobject = output
	, parentchain = []
	, parent_key_pair
	, keyparts = ''
	, valueparts = ''
	, key // undef. will be Truthy when Key is resolved.
	, datalen = data.length - 1 // stripping ending }
	, ch

	i = 1 // stripping starting {
	
	while (i != datalen){
		// - { } ' are special.

		ch = data[i]
		i += 1

		if (ch == "'"){
			if (stringparts){
				// end of string mode
				key = stringparts.join('')
				stringparts = undef				
			} else {
				// start of string mode
				stringparts = []				
			}
		} else if (stringparts){
			stringparts.push(ch)
		} else if (ch == '{'){
			// start of object
			parentchain.push( [activeobject, key] )
			activeobject = {}
			key = undef
		} else if (ch == '}'){
			// end of object
			parent_key_pair = parentchain.pop()
			parent_key_pair[0][parent_key_pair[1]] = activeobject
			key = undef
			activeobject = parent_key_pair[0]
		} else if (ch == '-'){
			sign = -1
		} else {
			// must be number
			if (key === undef) {
				if (mapping.hasOwnProperty(ch)){
					keyparts += mapping[ch]
					key = parseInt(keyparts, 16) * sign
					sign = +1
					keyparts = ''
				} else {
					keyparts += ch
				}
			} else {
				if (mapping.hasOwnProperty(ch)){
					valueparts += mapping[ch]
					activeobject[key] = parseInt(valueparts, 16) * sign
					sign = +1
					key = undef
					valueparts = ''
				} else {
					valueparts += ch					
				}
			}
		}
	} // end while

	return output
}

var LZString = {

  writeBit : function(value, data) {
    data.val = (data.val << 1) | value;
    if (data.position == 15) {
      data.position = 0;
      data.string += String.fromCharCode(data.val);
      data.val = 0;
    } else {
      data.position++;
    }
  },
  
  writeBits : function(numBits, value, data) {
    if (typeof(value)=="string")
      value = value.charCodeAt(0);
    for (var i=0 ; i<numBits ; i++) {
      this.writeBit(value&1, data);
      value = value >> 1;
    }
  },
  
  produceW : function (context) {
    if (Object.prototype.hasOwnProperty.call(context.dictionaryToCreate,context.w)) {
      if (context.w.charCodeAt(0)<256) {
        this.writeBits(context.numBits, 0, context.data);
        this.writeBits(8, context.w, context.data);
      } else {
        this.writeBits(context.numBits, 1, context.data);
        this.writeBits(16, context.w, context.data);
      }
      this.decrementEnlargeIn(context);
      delete context.dictionaryToCreate[context.w];
    } else {
      this.writeBits(context.numBits, context.dictionary[context.w], context.data);
    }
    this.decrementEnlargeIn(context);
  },
  
  decrementEnlargeIn : function(context) {
    context.enlargeIn--;
    if (context.enlargeIn == 0) {
      context.enlargeIn = Math.pow(2, context.numBits);
      context.numBits++;
    }
  },
  
  compress: function (uncompressed) {
    var context = {
      dictionary: {},
      dictionaryToCreate: {},
      c:"",
      wc:"",
      w:"",
      enlargeIn: 2, // Compensate for the first entry which should not count
      dictSize: 3,
      numBits: 2,
      result: "",
      data: {string:"", val:0, position:0}
    }, i;
    
    for (i = 0; i < uncompressed.length; i += 1) {
      context.c = uncompressed.charAt(i);
      if (!Object.prototype.hasOwnProperty.call(context.dictionary,context.c)) {
        context.dictionary[context.c] = context.dictSize++;
        context.dictionaryToCreate[context.c] = true;
      }
      
      context.wc = context.w + context.c;
      if (Object.prototype.hasOwnProperty.call(context.dictionary,context.wc)) {
        context.w = context.wc;
      } else {
        this.produceW(context);
        // Add wc to the dictionary.
        context.dictionary[context.wc] = context.dictSize++;
        context.w = String(context.c);
      }
    }
    
    // Output the code for w.
    if (context.w !== "") {
      this.produceW(context);
    }
    
    // Mark the end of the stream
    this.writeBits(context.numBits, 2, context.data);
    
    // Flush the last char
    while (context.data.val>0) this.writeBit(0,context.data)
    return context.data.string;
  },
  
  readBit : function(data) {
    var res = data.val & data.position;
    data.position >>= 1;
    if (data.position == 0) {
      data.position = 32768;
      data.val = data.string.charCodeAt(data.index++);
    }
    //data.val = (data.val << 1);
    return res>0 ? 1 : 0;
  },
  
  readBits : function(numBits, data) {
    var res = 0;
    var maxpower = Math.pow(2,numBits);
    var power=1;
    while (power!=maxpower) {
      res |= this.readBit(data) * power;
      power <<= 1;
    }
    return res;
  },
  
  decompress: function (compressed) {
    var dictionary = {},
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = "",
        i,
        w,
        c,
        errorCount=0,
        literal,
        data = {string:compressed, val:compressed.charCodeAt(0), position:32768, index:1};
    
    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }
    
    next = this.readBits(2, data);
    switch (next) {
      case 0: 
        c = String.fromCharCode(this.readBits(8, data));
        break;
      case 1: 
        c = String.fromCharCode(this.readBits(16, data));
        break;
      case 2: 
        return "";
    }
    dictionary[3] = c;
    w = result = c;
    while (true) {
      c = this.readBits(numBits, data);
      
      switch (c) {
        case 0: 
          if (errorCount++ > 10000) return "Error";
          c = String.fromCharCode(this.readBits(8, data));
          dictionary[dictSize++] = c;
          c = dictSize-1;
          enlargeIn--;
          break;
        case 1: 
          c = String.fromCharCode(this.readBits(16, data));
          dictionary[dictSize++] = c;
          c = dictSize-1;
          enlargeIn--;
          break;
        case 2: 
          return result;
      }
      
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result += entry;
      
      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      
      w = entry;
      
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      
    }
    return result;
  }
};

xdescribe('afm', () => {
  describe('uncompress', () => {
    it('should decode object', ()=>{
      const orig = "{'widths'{k3p2q4mcx1w201n3r201o6o201s1q201t1q201u1q201w2l201x2l201y2l2k1w2l1w202m2n2n3r2o3r2p5t202q6o2r1n2s2l2t2l2u2r2v3u2w1w2x2l2y1w2z1w3k3r3l3r3m3r3n3r3o3r3p3r3q3r3r3r3s3r203t2l203u2l3v1w3w3u3x3u3y3u3z3r4k6p4l4m4m4m4n4s4o4s4p4m4q3x4r4y4s4s4t1w4u3m4v4m4w3r4x5n4y4s4z4y5k4m5l4y5m4s5n4m5o3x5p4s5q4m5r5y5s4m5t4m5u3x5v1w5w1w5x1w5y2z5z3r6k2l6l3r6m3r6n3m6o3r6p3r6q1w6r3r6s3r6t1q6u1q6v3m6w1q6x5n6y3r6z3r7k3r7l3r7m2l7n3m7o1w7p3r7q3m7r4s7s3m7t3m7u3m7v2l7w1u7x2l7y3u202l3rcl4mal2lam3ran3rao3rap3rar3ras2lat4tau2pav3raw3uay4taz2lbk2sbl3u'fof'6obo2lbp3rbr1wbs2lbu2obv3rbz3xck4m202k3rcm4mcn4mco4mcp4mcq6ocr4scs4mct4mcu4mcv4mcw1w2m2ncy1wcz1wdl4sdm4ydn4ydo4ydp4ydq4yds4ydt4sdu4sdv4sdw4sdz3xek3rel3rem3ren3reo3rep3req5ter3mes3ret3reu3rev3rew1wex1wey1wez1wfl3rfm3rfn3rfo3rfp3rfq3rfr3ufs3xft3rfu3rfv3rfw3rfz3m203k6o212m6o2dw2l2cq2l3t3r3u1w17s4m19m3r}'kerning'{5q{4wv}cl{4qs5kw5ow5qs17sv5tv}201t{2wu4w1k2yu}201x{2wu4wy2yu}17s{2ktclucmucnu4otcpu4lu4wycoucku}2w{7qs4qz5k1m17sy5ow5qx5rsfsu5ty7tufzu}2x{17sy5ty5oy5qs}2y{7qs4qz5k1m17sy5ow5qx5rsfsu5ty7tufzu}'fof'-6o7p{17sv5tv5ow}ck{4qs5kw5ow5qs17sv5tv}4l{4qs5kw5ow5qs17sv5tv}cm{4qs5kw5ow5qs17sv5tv}cn{4qs5kw5ow5qs17sv5tv}co{4qs5kw5ow5qs17sv5tv}cp{4qs5kw5ow5qs17sv5tv}6l{17sy5ty5ow}do{17st5tt}4z{17st5tt}7s{fst}dm{17st5tt}dn{17st5tt}5o{ckwclwcmwcnwcowcpw4lw4wv}dp{17st5tt}dq{17st5tt}7t{5ow}ds{17st5tt}5t{2ktclucmucnu4otcpu4lu4wycoucku}fu{17sv5tv5ow}6p{17sy5ty5ow5qs}ek{17sy5ty5ow}el{17sy5ty5ow}em{17sy5ty5ow}en{5ty}eo{17sy5ty5ow}ep{17sy5ty5ow}es{17sy5ty5qs}et{17sy5ty5ow5qs}eu{17sy5ty5ow5qs}ev{17sy5ty5ow5qs}6z{17sy5ty5ow5qs}fm{17sy5ty5ow5qs}fn{17sy5ty5ow5qs}fo{17sy5ty5ow5qs}fp{17sy5ty5qs}fq{17sy5ty5ow5qs}7r{5ow}fs{17sy5ty5ow5qs}ft{17sv5tv5ow}7m{5ow}fv{17sv5tv5ow}fw{17sv5tv5ow}}}";
      console.log(uncompress(orig));
const a = {widths:{'0':53,'32':28,'33':28,'34':35,'35':55,'36':55,'37':89,'38':66,'39':19,'40':33,'41':33,'42':39,'43':58,'44':28,'45':33,'46':28,'47':28,'48':55,'49':55,'50':55,'51':55,'52':55,'53':55,'54':55,'55':55,'56':55,'57':55,'58':28,'59':28,'60':58,'61':58,'62':58,'63':55,'64':101,'65':66,'66':66,'67':72,'68':72,'69':66,'70':61,'71':78,'72':72,'73':28,'74':50,'75':66,'76':55,'77':83,'78':72,'79':78,'80':66,'81':78,'82':72,'83':66,'84':61,'85':72,'86':66,'87':94,'88':66,'89':66,'90':61,'91':28,'92':28,'93':28,'94':47,'95':55,'96':33,'97':55,'98':55,'99':50,'100':55,'101':55,'102':28,'103':55,'104':55,'105':22,'106':22,'107':50,'108':22,'109':83,'110':55,'111':55,'112':55,'113':55,'114':33,'115':50,'116':28,'117':55,'118':50,'119':72,'120':50,'121':50,'122':50,'123':33,'124':26,'125':33,'126':58,'161':33,'162':55,'163':55,'164':55,'165':55,'167':55,'168':33,'169':73,'170':37,'171':55,'172':58,'174':73,'175':33,'176':40,'177':58,'180':33,'181':55,'183':28,'184':33,'186':36,'187':55,'191':61,'192':66,'193':66,'194':66,'195':66,'196':66,'197':66,'198':100,'199':72,'200':66,'201':66,'202':66,'203':66,'204':28,'205':28,'206':28,'207':28,'209':72,'210':78,'211':78,'212':78,'213':78,'214':78,'216':78,'217':72,'218':72,'219':72,'220':72,'223':61,'224':55,'225':55,'226':55,'227':55,'228':55,'229':55,'230':89,'231':50,'232':55,'233':55,'234':55,'235':55,'236':28,'237':28,'238':28,'239':28,'241':55,'242':55,'243':55,'244':55,'245':55,'246':55,'247':58,'248':61,'249':55,'250':55,'251':55,'252':55,'255':50,'376':66,'402':55,'710':33,'732':33,'8211':55,'8212':100,'8216':22,'8217':22,'8218':22,'8220':33,'8221':33,'8222':33,'8224':55,'8225':55,'8226':35,'8230':100,'8240':100,'8249':33,'8250':33,'8482':100,fof:100},kerning:{'44':{'70':15,'80':18,'84':12,'86':13,'87':8,'89':14,'118':8,'121':10,'248':10,'255':10,'376':14},'45':{'84':14,'86':8,'89':14,'376':14},'46':{'70':15,'80':18,'84':12,'86':13,'87':8,'89':14,'118':8,'121':10,'248':10,'255':10,'376':14},'65':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'79':{'89':9,'376':9},'84':{'65':12,'76':11,'192':12,'193':12,'194':12,'195':12,'196':12,'197':12},'86':{'76':11},'89':{'32':9,'65':10,'68':9,'76':14,'192':10,'193':10,'194':10,'195':10,'196':10,'197':10},'97':{'84':12,'89':14,'376':14},'101':{'84':12,'86':8,'89':14,'376':14},'111':{'84':12,'86':8,'89':14,'376':14},'114':{'84':12},'117':{'84':12,'89':11,'376':11},'119':{'84':12},'120':{'248':9},'121':{'84':12},'192':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'193':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'194':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'195':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'196':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'197':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'210':{'89':9,'376':9},'211':{'89':9,'376':9},'212':{'89':9,'376':9},'213':{'89':9,'376':9},'214':{'89':9,'376':9},'216':{'89':9,'376':9},'224':{'84':12,'89':14,'376':14},'225':{'84':12,'89':14,'376':14},'226':{'84':12,'89':14,'376':14},'227':{'89':14},'228':{'84':12,'89':14,'376':14},'229':{'84':12,'89':14,'376':14},'232':{'86':8,'89':14,'376':14},'233':{'84':12,'86':8,'89':14,'376':14},'234':{'84':12,'86':8,'89':14,'376':14},'235':{'84':12,'86':8,'89':14,'376':14},'242':{'84':12,'86':8,'89':14,'376':14},'243':{'84':12,'86':8,'89':14,'376':14},'244':{'84':12,'86':8,'89':14,'376':14},'245':{'86':8,'89':14,'376':14},'246':{'84':12,'86':8,'89':14,'376':14},'248':{'84':12,'86':8,'89':14,'376':14},'249':{'84':12,'89':11,'376':11},'250':{'84':12,'89':11,'376':11},'251':{'84':12,'89':11,'376':11},'252':{'84':12,'89':11,'376':11},'376':{'32':9,'65':10,'68':9,'76':14,'192':10,'193':10,'194':10,'195':10,'196':10,'197':10},'8217':{'44':10,'46':10,'76':16},'8221':{'44':10,'46':10,'76':14},fof:-100}}      
const cc = LZString.compress(JSON.stringify(a));
console.log(cc.length, orig.length, LZString.compress(orig).length);
console.log('\n\n\n\nu:', LZString.compress(a));

    })
  });
});