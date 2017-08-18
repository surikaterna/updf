import bind from '../src/content/bind';
import block from '../src/content/block';
import page from '../src/content/page';
import document from '../src/content/document';
import code39 from '../src/content/barcode/code39';
import a4 from '../src/boxes/a4';
import helvetica from '../src/font/helvetica';
import SvgFromText from '../src/content/svg/SvgFromText';
import reduce from '../src/vdom/reduce';
import layouter from '../src/vdom/layouter';
import renderer from '../src/vdom/renderer';
import SvgLogo from './svg';

import should from 'should';

import fs from 'fs';

import shipmentData from './shipmentData';

import cmrData from './cmrData';


/* processes:
  * layout (x,y, width & height)
   *  width needs font (inline)
  * render
*/







class Fonts {
  constructor() {
    this._fonts = {};
  }
  add(family, font) {
    this._fonts[family] = font;
    return font;
  }
  get(family) {
    return this._fonts[family];
  }
}

function dumpDom(vdom, indent = 0) {
  let out = '';
  //if(vdom.context == null || vdom.props == null) {}
  for (let i = 0; i < indent; i++) { out += '  '; }
  out += `<${vdom.type}`;
  Object.keys(vdom.props || {}).forEach(key => {
    out += ` ${key}=${JSON.stringify(vdom.props[key])}`;
  });
  Object.keys(vdom.context || {}).forEach(key => {
    if (key !== 'font' && key !== 'fonts' && key !== '_contexts') {
      out += ` $${key}=${JSON.stringify(vdom.context[key])}`;
    }
  });
  out += '>';
  console.log(out);
  if (vdom.children) {
    vdom.children.forEach(ch => {
      /*      if (isText(ch)) {
              console.log(ch.str);
            } else {*/
      dumpDom(ch, indent + 1);
      //}
    });
  }
  out = '';
  for (let i = 0; i < indent; i++) { out += '  '; }

  console.log(`${out}</${vdom.type}>`);
}


const generateCmr = (shipment) => {
  const width = 595.28;
  const height = 841.89;
  const currentTop = 5;

  const margins = {
    marginTop: 40,
    marginLeft: 40,
    marginRight: 40,
    marginBottom: 40
  };

  const paddings = {
    paddingTop: 0.05,
    paddingLeft: 0.05,
    paddingRight: 0.05,
    paddingBottom: 0.05
  };


  const titleCell1 = '1. Sender(name, address, country)';
  const party1 = {
    "id": "5a1b0fd1-e51f-4f53-8006-6837eaf0c438",
    "name": "asp- dichstoffe gmbh",
    "addressLine": "schwabenstrasse 50",
    "city": "UNTERMEITINGEN",
    "zipOrPostalCode": "86836",
    "countryCode": "DE",
    "position": {
      "longitude": 10.8269,
      "latitude": 48.1731
    }
  };
  const titleCell2 = '2. Consignee(name, address, country)';
  const party2 = {
    "id": "fd500a6c-6367-493c-a570-8ccc77ea10bb",
    "name": "OD A DO Z SPÓŁKA AKCYJNA",
    "addressLine": "HELSKA 47/61",
    "city": "ŁÓDŹ",
    "zipOrPostalCode": "91342",
    "countryCode": "PL",
    "position": {
      "longitude": 19.4157,
      "latitude": 51.7957
    }
  };


  const Cell = bind(({ title, style, titleStyle, children }) => {
    return block({ style: Object.assign({}, style) }, [
      block({ style: Object.assign({}, { fontSize: 7 }, titleStyle) }, title),
      ...children
    ]);
  });

  const row = bind(({ style, children }) => block({ style: Object.assign({}, style) }, [...children]));

  const column = bind(({ style, children }) => block({ style: Object.assign({}, style) }, [...children]));

  const addressPart1 = bind(({ party, title, style, children }) => {
    const basicStyle = { fontSize: 8, position: 'absolute' };
    delete style.left;
    const addressStyle = Object.assign({}, basicStyle, style);

    const titleStyle = { fontSize: 7 };
    console.log(title)
    return block({ style: Object.assign({}, addressStyle) }, [
      block({ style: Object.assign({}, { fontSize: 7 }, titleStyle) }, ` ${title}`),
      `\n  ${party.name}\n  ${party.addressLine}\n  ${party.city}\n`
    ]);
  });

  const addressPart2 = bind(({ party, title, style, children }) => {
    const basicStyle = { fontSize: 8, border: false, position: 'absolute', textAlign: 'right' };
    const addressStyle = Object.assign({}, basicStyle, style);
    const titleStyle = { fontSize: 7 };
    console.log(title)

    return block({ style: Object.assign({}, addressStyle) }, [
      block({ style: Object.assign({}, { fontSize: 7 }, titleStyle) }, '\n'),
      '\n \n \n', `${party.zipOrPostalCode}${party.countryCode}  \n`
    ]);
  });

  const address = bind(({ title, style, party }) => {
    const result = block({ style: Object.assign({}, style, { position: 'absolute', border: true }) }, [addressPart1({ party, style, title }), addressPart2({ party, style })]);
    return result;
  });

  const infoBoxContent = bind(({ title, style, titleStyle, children }) => {
    const basicStyle = { fontSize: 8, position: 'absolute' };
    delete style.left;
    delete style.top;
    const addressStyle = Object.assign({}, basicStyle, style);

    console.log(title)
    return block({ style: Object.assign({}, addressStyle) }, [
      block({ style: Object.assign({}, { fontSize: 7 }, titleStyle) }, ` ${title}`),
      ...children
    ]);
  });



  const infoBox = bind(({ title, style, titleStyle, children }) => {
    const result = block({ style: Object.assign({}, { position: 'absolute', border: true }, style) }, [infoBoxContent({ style, title, titleStyle }, [...children])]);
    return result;
  });

  const table = bind(({ style, children }) => {
    return block({ id: 'table', style },
      [...children]
    );
  });



  const rowStyle = { position: 'relative' };

  const Logo = () =>
  block({ style: { top: 40, left: 40, position: 'fixed' } }, [SvgFromText({ svg: SvgLogo, style: { height: 300 } })]);

  const b = document({},
    page(Object.assign({ mediaBox: a4, style: Object.assign({ fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.2 }, margins, paddings) }), [
      block({ id: 'title', style: { textAlign: 'right', fontSize: 10 } }, [
        'INTERNATIONAL CONSIGNMENT NOTE'
      ]),
      block({ id: 'body', style: { position: 'relative', top: 10, left: 0, border: false, width: 515 } }, [
        code39({ value: shipment.identifiers[0].identifier, style: { position: 'fixed', top: 160, left: 310, width: 220, height: 25 } }),
        Logo(),
        table({
          style: { textAlign: 'left', position: 'relative', height: 250, top: 5, marginLeft: 0, width: 515 }
        }, [
            row(
              {
                style: rowStyle
              },
              [
                address({ party: party1, title: '1. Sender(name, address, country)', style: { width: 257.5, height: 63 } }),
                row(
                  {
                    style: Object.assign({}, rowStyle, { border: true, width: 257.5 })
                  },
                  [
                    column({ style: { border: false, width: 100, position: 'absolute', left: 257.5 } },
                      [
                        row({}, [infoBox({ title: 'INTERNATIONALER FRACHTBRIEF', style: { width: 100, height: 21, top: 0, border: false }, titleStyle: { fontSize: 5, marginLeft: 5 } }, [''])]),
                        row({}, [infoBox({ title: 'LETTRE DE VOITURE INTERNATIONAL', style: { width: 100, height: 21, top: 21, border: false }, titleStyle: { fontSize: 5, marginLeft: 5 } }, [''])]),
                        row({}, [infoBox({ title: 'INTERNATIONAL WAYBILL', style: { width: 100, height: 21, top: 42, border: false }, titleStyle: { fontSize: 5, marginLeft: 5 } }, [''])])
                        
                      ]
                    ),
                    column({ style: { border: false, width: 157.5, position: 'absolute', left: 357.5 } },
                      [
                        row({}, [infoBox({ title: 'Diese Beförderung unterliegt trotz einer gegenteiligen Abmachung den \n Bestimmungen des Übereinkommens über den Beförderungsvertrag im internat. \n Straßengüterverkehr (CMR)', style: { width: 157.5, height: 21, top: 0, border: false }, titleStyle: { fontSize: 4, marginLeft: 5 } }, [''])]),
                        row({}, [infoBox({ title: 'Ce transport est soumis, nonobstant toute clause contraire, á la Convention relative \n au contrat de transport international de marchandises par route (CMR)', style: { width: 157.5, height: 21, top: 21, border: false }, titleStyle: { fontSize: 4, marginLeft: 5 } }, [''])]),
                        row({}, [infoBox({ title: 'This transport is subject despite a contrary agreement that Regulations of the \n convention over the transport contract in internat. Road haulage (CMR)', style: { width: 157.5, height: 21, top: 42, border: false }, titleStyle: { fontSize: 4, marginLeft: 5 } }, [''])])
                      ]
                  )
                  ]
                )
              ]
            ),
            row(
              {
                style: rowStyle
              },
              [
                address({ party: party2, title: '2. Consignee(name, address, country)', style: { width: 257.5, height: 63 } }),
                row(
                  {
                    style: Object.assign({}, rowStyle, { border: true, width: 257.5, height: 63 })
                  },
                  [
                    column({ style: { border: false, width: 257.5, position: 'absolute', left: 257.5 } },
                      [
                        row({}, [infoBox({ title: 'Consignment ID', style: { width: 128.75, height: 31.5, border: false }, titleStyle: { marginLeft: 5 } }, ['    HEL7155695'])])
                        
                      ]
                    ),
                    column({ style: { border: false, width: 157.5, position: 'absolute', left: 386.25 } },
                      [
                        row({}, [infoBox({ title: 'Trip No', style: { width: 128.75, height: 31.5, border: false}, titleStyle: { marginLeft: 5 } }, ['    HEL7155695'])])
                      ]
                  )
                  ]
                )
              ]
            ),
            row(
              {
                style: rowStyle
              },
              [
                address({ party: party2, title: '3. Place of delivery(place, country)', style: { width: 257.5, height: 63 } }),
                infoBox({ title: '16. Carrier(name, address, country)', style: { width: 257.5, left: 257.5, height: 63 } }, ['  \n DB Schenker'])
              ]
            ),
            row(
              {
                style: rowStyle
              },
              [
                address({ party: party2, title: '4. Place of taking over the goods(place, country)', style: { width: 257.5 } }),
                infoBox({ title: '17. Successive carriers(name, address, country)', style: { width: 257.5, left: 257.5, height: 63 } }, ['  '])
              ]
            ),
            row(
              {
                style: rowStyle
              },
              [
                infoBox({ title: '6. Marks and number', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 0, height: 150 } }, ['  ']),
                infoBox({ title: '7.  Number of packages', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 73.57, height: 150 } }, ['  ']),
                infoBox({ title: '8.  Method of packing', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 147.14, height: 150 } }, ['  ']),
                infoBox({ title: '9.  Nature of the goods', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 220.71, height: 150 } }, ['  ']),
                infoBox({ title: '10.  Statistical number', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 294.28, height: 150 } }, ['  ']),
                infoBox({ title: '11.  Gross weight kg', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 367.85, height: 150 } }, ['  ']),
                infoBox({ title: '12.  Volume in m3', titleStyle: { fontSize: 6 }, style: { width: 73.57, left: 441.42, height: 150 } }, ['  '])
              ]
            ),
            row(
              {
                style: rowStyle
              },
              [
                infoBox({ title: '13. Senders instructions', style: { width: 257.5, height: 99 } }, ['  ']),
                row(
                  {
                    style: rowStyle
                  },
                  [
                    infoBox({ title: '14. Instructions as to payment for carriage', style: { width: 257.5, left: 257.5, height: 33 } }, ['  ']),
                    infoBox({ title: '15. The liability of the carriage is covered by the CMR', style: { width: 257.5, left: 257.5, height: 33, top: 33 } }, ['  ']),
                    infoBox({ title: '16. Conditions of delivery', style: { width: 257.5, left: 257.5, height: 33, top: 66 } }, ['  '])
                  ]
                )
              ]
            ),
            row(
              {
                style: rowStyle
              },
              [
                infoBox({ title: '20. Special agreement', style: { width: 257.5, height: 33 } }, ['  ']),
                infoBox({ title: '21. Established in', style: { width: 257.5, left: 257.5, height: 33 } }, ['  '])
              ]
            ),
            row(
              {
                style: Object.assign({}, rowStyle, { border: true, height: 188 })
              },
              [
                column({ style: { border: true, height: 188, width: 171.67, position: 'absolute' } },
                  [
                    infoBox({ title: '22 Signature and stamp of the sender', style: { width: 171.67, height: 104, border: false } }, ['  ']),
                    row({}, [
                      infoBox({ title: '', style: { width: 51.5, height: 84, top: 104, border: false, textAlign: 'right', fontSize: 7 } }, ['Name\nDate\nDevice ID\nTruck ID\nCarrier\nDriver\nRemark\n']),
                      infoBox({ title: '', style: { width: 120.17, left: 51.5, height: 84, top: 104, border: false, fontSize: 7 } }, [''])
                    ])
                  ]
                ),
                column({ style: { border: true, height: 188, width: 171.67, position: 'absolute', left: 171.67 } },
                  [
                    infoBox({ title: '23. Signature and stamp of the driver', style: { width: 171.67, height: 104, border: false } }, ['  ']),
                    row({}, [
                      infoBox({ title: '', style: { width: 51.5, height: 84, top: 104, border: false, textAlign: 'right', fontSize: 7 } }, ['Name\nDate\nDevice ID\nTruck ID\nCarrier\nDriver\nRemark\n']),
                      infoBox({ title: '', style: { width: 120.17, left: 51.5, height: 84, top: 104, border: false, fontSize: 7 } }, [''])
                    ])
                  ]
                ),
                column({ style: { border: true, height: 188, width: 171.67, position: 'absolute', left: 343.43 } },
                  [
                    infoBox({ title: '24. Signature and stamp of the consignee', style: { width: 171.67, height: 104, border: false } }, ['  ']),
                    row({}, [
                      infoBox({ title: '', style: { width: 51.5, height: 84, top: 104, border: false, textAlign: 'right', fontSize: 7 } }, ['Name\nDate\nDevice ID\nTruck ID\nCarrier\nDriver\nRemark\n']),
                      infoBox({ title: '', style: { width: 120.17, left: 51.5, height: 84, top: 104, border: false, fontSize: 7 } }, [''])
                    ])
                  ]
                )

              ]
            )


            // table(cmrData, currentTop)
          ])
        // Cell({ title: block({ style: { marginLeft: 10 } }, ' 2. Drawing'), style: { paddingLeft: 100 } }, ['asd test', 'asssss \ntest'])

        // , Cell({ title: ' 3. Reports', style: { marginTop: 0, height: 15, textAlign: 'center' } })

        // , Cell({ title: ' 1. Order Number', style: { height: 35 } }, block({ style: {} }, ' ' + shipment.identifiers[0].identifier))

        //...observation.reports.map(rep => block({ style: { fontSize: 10 } }, rep.handle)),

      ])
      /*block({ style: { position: 'fixed', top: 800, left: 40, right: 40 } }, [
        Cell({ title: ' 7. Created', style: { height: 15, border: false } }, block({ style: { fontSize: 10 } }, ''))
      ]
      )*/
    ]),
    //        Diagrams({diags: diagrams}),

    //block({ style: { top: 0, left: 0, position: 'fixed' } }, [Logo2(front)]),

    //code39({ value: 'VNOX44711', style: { width: 100, height: 20 } }),
    /*          block({ style: { top: 100, border: false, width: 100, textAlign: 'right' } },
                ['Hello World              2!', 'Again', ' Or', block({ style: { border: false } }, 'New block')]
              ), block({ style: { right: 50, border: false } }, 'Aloha')]
              */
    //rect({ style: { left: 200, top: 100 } })
  );



  const ctx = {
    width,
    height,
    maxWidth: width,
    maxHeight: height,
    mediaBox: a4,
    ax: 0,
    ay: 0,
    fonts: new Fonts()
  };
  ctx.font = ctx.fonts.add('Helvetica', helvetica);
  // defaults

  const rb = reduce(b, ctx);
  dumpDom(rb);
  // console.log(JSON.stringify(b, null, 2))
  layouter(rb, ctx);
  dumpDom(rb);
  const doc = renderer(rb, ctx);
  const out = [];
  try {
    doc.write((e) => {
      out.push(e);
    });
  } catch (e) {
    console.error(e);
  }
  return out.join('');
};

describe('container', () => {
  it.only('should generate CMR correctly', done => {
    const data = generateCmr(shipmentData);
    require('fs').writeFileSync(`d:\\temp.pdf`, data);
    console.log('Wrote file', new Date());
    done();
  });
});

