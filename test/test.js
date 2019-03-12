import should from 'should';
import PdfDoc from '../src';
import StreamBuffer from '../src/streambuffer';
import Font from '../src/font';
import Style from '../src/style';
import TextArea from '../src/textarea';
import Paragraph from '../src/paragraph';
import Span from '../src/span';
import Page from '../src/page';
import text from '../src/content/text';
import box from '../src/content/box';
import block from '../src/content/block';
import page from '../src/content/page';
import buildProps from '../src/vdom/buildProps';
import reduce from '../src/vdom/reduce';
//import { Stream } from 'stream';

should();

/*
function _render(node) {
	const ch = (node.props && node.props.children && node.props.children.map(child => render(child))) || [];
	const newProps = Object.assign({}, node.props, { children: ch.join('\n') });
	const res = (node.type && node.type(newProps)) || node;
	return res;
}*/

// This is done in a linear time O(n) without recursion
// memory complexity is O(1) or O(n) if mutable param is set to false
function flatten(array, mutable) {
	var toString = Object.prototype.toString;
	var arrayTypeStr = '[object Array]';

	var result = [];
	var nodes = (mutable && array) || array.slice();
	var node;

	if (!array.length) {
		return result;
	}

	node = nodes.pop();

	do {
		if (toString.call(node) === arrayTypeStr) {
			nodes.push.apply(nodes, node);
		} else {
			result.push(node);
		}
	} while (nodes.length && (node = nodes.pop()) !== undefined);

	result.reverse(); // we reverse result to restore the original order
	return result;
}


function solve(vnode, context) {
	return reduce(vnode, context);
}

function render(vnode, context) {
	const solved = solve(vnode, context);
	return solved.render(buildProps(solved), context);
}



describe('PdfDoc', () => {
	it.only('should create a file', () => {

	try 
	{
		var fs = require('fs');

		var out = new StreamBuffer();

		const doc = new PdfDoc(out);

		var dir = "C:\\opt\\updf\\test\\";

		var ttfFile1 = Buffer.from(fs.readFileSync(dir + 'Catamaran-Regular.ttf', 'binary'), 'binary');
		var ttfFile2 = Buffer.from(fs.readFileSync(dir + 'AmaticSC-Regular.ttf', 'binary'), 'binary');
		var ttfFile3 = Buffer.from(fs.readFileSync(dir + 'Montez-Regular.ttf', 'binary'), 'binary');
		var ttfFile4 = Buffer.from(fs.readFileSync(dir + 'Muli.ttf', 'binary'), 'binary');

		var ttfMetadata1 = JSON.parse(fs.readFileSync(dir + 'Catamaran-Regular.ttf.json'));
		var ttfMetadata2 = JSON.parse(fs.readFileSync(dir + 'AmaticSC-Regular.ttf.json'));
		var ttfMetadata3 = JSON.parse(fs.readFileSync(dir + 'Montez-Regular.ttf.json'));
		var ttfMetadata4 = JSON.parse(fs.readFileSync(dir + 'Muli.ttf.json'));

		var font1 = new Font(ttfFile1, ttfMetadata1, "F6");
		var font2 = new Font(ttfFile2, ttfMetadata2, "F7");
		var font3 = new Font(ttfFile3, ttfMetadata3, "F8");
		var font4 = new Font(ttfFile4, ttfMetadata4, "F9");

		var style1 = new Style(font4, 11);
		var style2 = new Style(font3, 24);
		var style3 = new Style(font1, 8);
		var style4 = new Style(font2, 12);

		var page = doc.addPage();
		page.append(new TextArea(800, 70, 650, 550, [new Paragraph(new Span(style1, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki.")), new Paragraph(new Span(style1, "Moje miasto jest czwarte w Polsce pod względem liczby ludności. Znajdziesz w nim miejsca, które nazywają się tak samo jak inne miejsca na świecie – np. Kilimandżaro albo Morskie Oko. Znana jest też Fontanna Multimedialna umieszczona obok Hali Stulecia.")), new Paragraph(new Span(style1, "Jeszcze kilkadziesiąt lat temu miasto nie należało do Polski. Moje miasto ma mnóstwo mostów, rzek oraz wysp i wysepek. W moim mieście znajdziecie też fosę, która cały czas działa i w której cały czas jest woda. Z mojego miasta bliżej jest do stolicy Niemiec – Berlina niż do stolicy Polski – Warszawy.")), new Paragraph(new Span(style1, "Miasto jest bardzo lubiane przez turystów – każdego roku miliony z nich chodzą po ulicach miasta. Wielu z nich odwiedza nasze słynne ZOO. Bardzo popularne w nim jest Afrykarium, w którym możliwe jest oglądanie wielu zwierząt w prawie naturalnych warunkach. Dla miłośników kultury miasto oferuje liczne teatry, kina i muzea. Miasto zostało wybrane Europejską Stolicą Kultury 2016 i Światową Stolicą Książki 2016.")), new Paragraph(new Span(style1, "Czy wystarczy już tych podpowiedzi? Jeśli nie – to jeszcze ostatnia: łacińska nazwa mojego miasta to Vratislavia, a niemiecka to Breslau. Czy już znasz odpowiedź? Tak, to Wrocław!"))]));
		page.append(new TextArea(450, 70, 100, 300, [new Paragraph(new Span(style2, "O kulturze pisze się i podaje jej definicje na wiele różnych sposobów. Niektórzy antropologowie uważaja, że kutura to komunikowanie się, i że komunikowanie się to kultura. Inni widzą kulturę jako ujakościowienie się lub jako kultywację pewnego stylu życia. Kulturalna osoba mogłaby być widziana jakościowo lepszą i całokształtną. My uważamy, że kultura ma w posiadaniu bardziej specjalistyczne znaczenia, współpracujące z ustalonymi sposobami zachowywania dla odrębnych grup ludzkich. Kultura to sklep ze wspólnymi społecznymi doświadczeniami kompletującymi plany i sposoby bycia ludzi i epok. Religia jest zawsze znajdywana blisko podstawowych struktur społeczeństwa i jego kultury. Wielu ludzi zaczyna ich pierwsze spotkanie z bóstwem i z istotami supernaturalnymi bardzo wcześnie w życiu. Bez względu na to, jak bardzo oni moga się zmienić i unowocześnić swoje postępowanie z biegiem wieku, religia i tak kontynuuje specjalne efekty na ich myślenie i postępowanie. Warto jest, by specjaliści od reklam pomyśleli by w jak najbardziej korzystny sposób uwzględnić w ich pracy istnienie tej ludzkiej ambicji na godność dla celów marketingowych."))]));
		page.append(new TextArea(450, 330, 100, 550, [new Paragraph(new Span(style3, "Moje życie Mam na imię Ola. Niektórzy mówią na mnie Aleksandra. Mam 30 lat. Mam brata, ale nie mam siostry. Mieszkam w Warszawie. To stolica Polski. Urodziłam się tu. Mieszkam w samym centrum. Idąc do pracy, przechodzę obok zamku. Lubię oglądać zabytki. Nie mam dzieci, ale mój brat ma dwójkę dzieci. Czasem bawię się z nimi. Lubię odwiedzać rodzinę. Prawie cała moja rodzina też mieszka w Warszawie. Czasem odwiedzają mnie rodzice. Staram się wtedy przygotować pyszne jedzenie. Podczas wizyty dużo rozmawiamy. Miło jest spędzać tak czas. Bardzo lubię konie. Niestety mieszkam w mieście, więc nie mogę ich hodować. Gdybym mieszkała na wsi, chciałabym mieć konia. Jeżdżenie na koniu jest przyjemne. Mam swojego węża. Jest bardzo ładny i nie jest groźny. Ale nie da się na nim jeździć jak na koniu. Pracuję przy komputerze. Pomagam innym ludziom. Pomaganie innym jest ważne. Ludzie uśmiechają się, gdy im pomogę i dziękują. Każdy powinien być miły i pomocny. Bardzo lubię biegać. Bieganie jest dobre dla zdrowia. Można spotkać miłych ludzi biegając. Jeśli nie biegaliście do tej pory – spróbujcie."))]));

		page.append(new TextArea(625, 70, 475, 550,  [new Paragraph(new Span(style4, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki.")), new Paragraph(new Span(style4, "Moje miasto jest czwarte w Polsce pod względem liczby ludności. Znajdziesz w nim miejsca, które nazywają się tak samo jak inne miejsca na świecie – np. Kilimandżaro albo Morskie Oko. Znana jest też Fontanna Multimedialna umieszczona obok Hali Stulecia.")), new Paragraph(new Span(style4, "Jeszcze kilkadziesiąt lat temu miasto nie należało do Polski. Moje miasto ma mnóstwo mostów, rzek oraz wysp i wysepek. W moim mieście znajdziecie też fosę, która cały czas działa i w której cały czas jest woda. Z mojego miasta bliżej jest do stolicy Niemiec – Berlina niż do stolicy Polski – Warszawy.")), new Paragraph(new Span(style4, "Miasto jest bardzo lubiane przez turystów – każdego roku miliony z nich chodzą po ulicach miasta. Wielu z nich odwiedza nasze słynne ZOO. Bardzo popularne w nim jest Afrykarium, w którym możliwe jest oglądanie wielu zwierząt w prawie naturalnych warunkach. Dla miłośników kultury miasto oferuje liczne teatry, kina i muzea. Miasto zostało wybrane Europejską Stolicą Kultury 2016 i Światową Stolicą Książki 2016.")), new Paragraph(new Span(style4, "Czy wystarczy już tych podpowiedzi? Jeśli nie – to jeszcze ostatnia: łacińska nazwa mojego miasta to Vratislavia, a niemiecka to Breslau. Czy już znasz odpowiedź? Tak, to Wrocław!"))]));
		page.close();

		page = doc.addPage();
		page.append(new TextArea(800, 70, 475, 550,  [
			new Paragraph(new Span(style1, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki.")),
			new Paragraph(new Span(style2, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki.")),
			new Paragraph(new Span(style3, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki.")),
			new Paragraph(new Span(style4, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki."))
		]));
		
		page.append(new TextArea(250, 70, 100, 550,  [new Paragraph(new Span(style4, "Mieszkam w środku Europy – w Polsce. Ale w którym mieście mieszkam? Poniżej przedstawię kilka podpowiedzi które powinny ułatwić rozwiązanie tej zagadki.")), new Paragraph(new Span(style4, "Moje miasto jest czwarte w Polsce pod względem liczby ludności. Znajdziesz w nim miejsca, które nazywają się tak samo jak inne miejsca na świecie – np. Kilimandżaro albo Morskie Oko. Znana jest też Fontanna Multimedialna umieszczona obok Hali Stulecia.")), new Paragraph(new Span(style4, "Jeszcze kilkadziesiąt lat temu miasto nie należało do Polski. Moje miasto ma mnóstwo mostów, rzek oraz wysp i wysepek. W moim mieście znajdziecie też fosę, która cały czas działa i w której cały czas jest woda. Z mojego miasta bliżej jest do stolicy Niemiec – Berlina niż do stolicy Polski – Warszawy.")), new Paragraph(new Span(style4, "Miasto jest bardzo lubiane przez turystów – każdego roku miliony z nich chodzą po ulicach miasta. Wielu z nich odwiedza nasze słynne ZOO. Bardzo popularne w nim jest Afrykarium, w którym możliwe jest oglądanie wielu zwierząt w prawie naturalnych warunkach. Dla miłośników kultury miasto oferuje liczne teatry, kina i muzea. Miasto zostało wybrane Europejską Stolicą Kultury 2016 i Światową Stolicą Książki 2016.")), new Paragraph(new Span(style4, "Czy wystarczy już tych podpowiedzi? Jeśli nie – to jeszcze ostatnia: łacińska nazwa mojego miasta to Vratislavia, a niemiecka to Breslau. Czy już znasz odpowiedź? Tak, to Wrocław!"))]));
		page.close();

		doc.close();
	}
	catch (e) 
	{
		console.error(e.stack || e);
	}

	require('fs').writeFileSync("d:\\desktop\\pdf\\output.pdf", out.content(), 'binary');

	});
/*
	it('stream', () => {
		const doc = new PdfDoc();
		const r = page({ mediaBox: [0, 0, 595.28, 841.89] },
			block({ style: { top: 0, left: 100, position: 'absolute' } },
				['Hello world!', 'Again!'])
		);
		// console.log('STREAM: ', JSON.stringify(r, null, 2));
		// console.log('S STREAM:\n', JSON.stringify(solve(r), null, 2));
		const out = [];
		try {
			doc.write((e) => {
				if (out.length === 0) {
				}
				out.push(e);
			});
		} catch (e) {
			console.log(doc._objects);
			console.error(e);
		}
		console.log('R STREAM:\n', JSON.stringify(render(r, { doc }), null, 2));
		console.log('RR STREAM:\n\n' + out.join(''));
		// console.log('REN2 STREAM:\n', _render(r));
	});
*/
});

/*
const a = {
	type: 'content',
	props: {
		x: 200,
		y: 200,
		width: 100,
		children: [
			{
				type: 'text'
			}
		]
	}
};

const FirstPage = (props) => {
	return (
		<Page>
			<Box>
				<Text>
					What we've got here is a failure to communicate!
				</Text>
			</Box>

		</Page>
	);
}

<Document>
	<Page mediaBox={[0, 0, 500, 800]} >
		<Box x={0} y={0} width={250} style={{ marginRight: 5 }}>
			<Text style={{ font: 'Helvetica', align: 'center' }}>
				Welcome to the new world
			</Text>
			<Text style={{ font: 'Helvetica', align: 'center' }}>
				Welcome to the new world
			</Text>
		</Box>
	</Page>
</Document>;
*/
