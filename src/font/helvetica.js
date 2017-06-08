import BaseFont from './BaseFont';

const spec = {widths:{'0':53,'32':28,'33':28,'34':35,'35':55,'36':55,'37':89,'38':66,'39':19,'40':33,'41':33,'42':39,'43':58,'44':28,'45':33,'46':28,'47':28,'48':55,'49':55,'50':55,'51':55,'52':55,'53':55,'54':55,'55':55,'56':55,'57':55,'58':28,'59':28,'60':58,'61':58,'62':58,'63':55,'64':101,'65':66,'66':66,'67':72,'68':72,'69':66,'70':61,'71':78,'72':72,'73':28,'74':50,'75':66,'76':55,'77':83,'78':72,'79':78,'80':66,'81':78,'82':72,'83':66,'84':61,'85':72,'86':66,'87':94,'88':66,'89':66,'90':61,'91':28,'92':28,'93':28,'94':47,'95':55,'96':33,'97':55,'98':55,'99':50,'100':55,'101':55,'102':28,'103':55,'104':55,'105':22,'106':22,'107':50,'108':22,'109':83,'110':55,'111':55,'112':55,'113':55,'114':33,'115':50,'116':28,'117':55,'118':50,'119':72,'120':50,'121':50,'122':50,'123':33,'124':26,'125':33,'126':58,'161':33,'162':55,'163':55,'164':55,'165':55,'167':55,'168':33,'169':73,'170':37,'171':55,'172':58,'174':73,'175':33,'176':40,'177':58,'180':33,'181':55,'183':28,'184':33,'186':36,'187':55,'191':61,'192':66,'193':66,'194':66,'195':66,'196':66,'197':66,'198':100,'199':72,'200':66,'201':66,'202':66,'203':66,'204':28,'205':28,'206':28,'207':28,'209':72,'210':78,'211':78,'212':78,'213':78,'214':78,'216':78,'217':72,'218':72,'219':72,'220':72,'223':61,'224':55,'225':55,'226':55,'227':55,'228':55,'229':55,'230':89,'231':50,'232':55,'233':55,'234':55,'235':55,'236':28,'237':28,'238':28,'239':28,'241':55,'242':55,'243':55,'244':55,'245':55,'246':55,'247':58,'248':61,'249':55,'250':55,'251':55,'252':55,'255':50,'376':66,'402':55,'710':33,'732':33,'8211':55,'8212':100,'8216':22,'8217':22,'8218':22,'8220':33,'8221':33,'8222':33,'8224':55,'8225':55,'8226':35,'8230':100,'8240':100,'8249':33,'8250':33,'8482':100,fof:100},kerning:{'44':{'70':15,'80':18,'84':12,'86':13,'87':8,'89':14,'118':8,'121':10,'248':10,'255':10,'376':14},'45':{'84':14,'86':8,'89':14,'376':14},'46':{'70':15,'80':18,'84':12,'86':13,'87':8,'89':14,'118':8,'121':10,'248':10,'255':10,'376':14},'65':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'79':{'89':9,'376':9},'84':{'65':12,'76':11,'192':12,'193':12,'194':12,'195':12,'196':12,'197':12},'86':{'76':11},'89':{'32':9,'65':10,'68':9,'76':14,'192':10,'193':10,'194':10,'195':10,'196':10,'197':10},'97':{'84':12,'89':14,'376':14},'101':{'84':12,'86':8,'89':14,'376':14},'111':{'84':12,'86':8,'89':14,'376':14},'114':{'84':12},'117':{'84':12,'89':11,'376':11},'119':{'84':12},'120':{'248':9},'121':{'84':12},'192':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'193':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'194':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'195':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'196':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'197':{'70':8,'80':12,'84':12,'86':8,'89':11,'376':11},'210':{'89':9,'376':9},'211':{'89':9,'376':9},'212':{'89':9,'376':9},'213':{'89':9,'376':9},'214':{'89':9,'376':9},'216':{'89':9,'376':9},'224':{'84':12,'89':14,'376':14},'225':{'84':12,'89':14,'376':14},'226':{'84':12,'89':14,'376':14},'227':{'89':14},'228':{'84':12,'89':14,'376':14},'229':{'84':12,'89':14,'376':14},'232':{'86':8,'89':14,'376':14},'233':{'84':12,'86':8,'89':14,'376':14},'234':{'84':12,'86':8,'89':14,'376':14},'235':{'84':12,'86':8,'89':14,'376':14},'242':{'84':12,'86':8,'89':14,'376':14},'243':{'84':12,'86':8,'89':14,'376':14},'244':{'84':12,'86':8,'89':14,'376':14},'245':{'86':8,'89':14,'376':14},'246':{'84':12,'86':8,'89':14,'376':14},'248':{'84':12,'86':8,'89':14,'376':14},'249':{'84':12,'89':11,'376':11},'250':{'84':12,'89':11,'376':11},'251':{'84':12,'89':11,'376':11},'252':{'84':12,'89':11,'376':11},'376':{'32':9,'65':10,'68':9,'76':14,'192':10,'193':10,'194':10,'195':10,'196':10,'197':10},'8217':{'44':10,'46':10,'76':16},'8221':{'44':10,'46':10,'76':14},fof:-100}};

export default new BaseFont(spec.widths, spec.kerning);