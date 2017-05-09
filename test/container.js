import bind from '../src/content/bind';
import block from '../src/content/block';
import page from '../src/content/page';
import document from '../src/content/document';
import inline from '../src/content/inline';
import rect from '../src/content/vector/rect';
import code39 from '../src/content/barcode/code39';

import Svg from '../src/content/svg/Svg';
import SvgFromText from '../src/content/svg/SvgFromText';
import Path from '../src/content/svg/Path';


import text from '../src/content/text';
import a4 from '../src/boxes/a4';
import helvetica from '../src/font/helvetica';

import reduce from '../src/vdom/reduce';
import layouter from '../src/vdom/layouter';
import renderer from '../src/vdom/renderer';

import should from 'should';

import fs from 'fs';

/* processes:
  * layout (x,y, width & height)
   *  width needs font (inline)
  * render
*/




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
// Author Stena Line
const SvgLogo = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 width="270.5px" height="102.5px" viewBox="-336 39.1 270.5 102.5" style="enable-background:new -336 39.1 270.5 102.5;"
	 xml:space="preserve">
<style type="text/css">
	.st0{fill:#002F87;}
	.st1{fill:#FFFFFF;}
	.st2{fill:#E2231A;}
</style>
<path class="st0" d="M-302,103c-1.1-2.5-3.8-3.6-6.3-3.6c-3.3,0-5.2,1.3-5.2,3.1c0,2.2,3.5,3.1,7.4,4.4c5.8,2,10.2,4.3,10.2,9.4
	c0,7.7-8.4,13.7-19,13.7c-6,0-13.3-2.9-13.8-9.4l8.4-1.5c0.6,2.5,4.2,3.7,6.5,3.7c2.6,0,6.6-0.8,6.6-3.9c0-2.3-3.7-3.2-7.6-4.5
	c-3.9-1.3-9.6-3.6-9.6-9.2c0-9.3,10-12.6,16.8-12.6c5,0,12.6,2.2,13.9,8.6L-302,103z"/>
<path class="st0" d="M-275.3,108.9h-5l-2.2,9.7c-0.2,0.5-0.3,1.1-0.3,1.7c0,1.7,1.6,1.8,3,1.8h1.3l-1.6,6.9
	c-1.9,0.1-3.8,0.2-5.8,0.2c-3.2,0-7.7,0.1-7.7-4.2c0-1.4,0.2-2.8,0.7-5l2.5-11.2h-3.7l1.3-5.5h3.8l1.8-8.1h9.7l-1.8,8.1h5
	L-275.3,108.9z"/>
<path class="st0" d="M-246.4,118.2h-19.8c-0.1,0.5-0.2,1-0.2,1.5c0,2.6,1.9,4.2,4.3,4.2c1.8,0,3.5-0.8,4.5-2.2h9.4
	c-3.2,5.8-9.2,8.1-15.5,8.1c-6.7,0-12.5-3.1-12.5-10.1c0-9.7,8.2-17.1,17.8-17.1c7.7,0,12.5,4.4,12.5,11.4
	C-245.9,115.4-246.2,117.2-246.4,118.2z M-259.1,108.5c-3.2,0-5.3,1.9-6.1,5h10c0.1-0.3,0.1-0.7,0.1-1.1
	C-255.1,109.9-256.9,108.5-259.1,108.5z"/>
<path class="st0" d="M-215.2,113.6l-3.5,15.5h-9.9l3.1-13.5c0.2-0.7,0.3-1.4,0.3-2.1c0-2.1-1-3.1-3.1-3.1c-3.2,0-4.9,2.9-5.5,5.6
	l-3,13.1h-9.9l5.8-25.6h8.9l-1.1,4.6c2.5-2.8,6.6-5.4,10.4-5.4c4.7,0,7.9,2.2,7.9,7C-214.8,111-215,112.3-215.2,113.6z"/>
<path class="st0" d="M-184.6,113.2l-3.6,15.9h-9.4l0.7-3.1c-3.5,2.7-6.5,3.9-10.9,3.9c-3.7,0-7.5-2-7.5-6.2c0-2.8,1.7-5.5,3.7-6.9
	c3.3-2.3,8-2.7,13.1-3.3c2.7-0.4,4.7-1,4.7-3c0-1.6-2-1.9-3.2-1.9c-1.9,0-3.7,0.6-4.4,2.5h-9.5c1.8-7.2,9.6-8.3,16-8.3
	c4.3,0,11,0.3,11,6.1C-184.1,110.2-184.3,111.7-184.6,113.2z M-198.7,118.4c-3.2,0.7-6.2,1.3-6.2,3.5c0,1.9,1.6,2.5,3,2.5
	c4,0,5.9-3.5,6.4-7.1C-196.5,117.8-197.6,118.1-198.7,118.4z"/>
<path class="st0" d="M-150.5,129H-178l8-35.4h11.3l-6.2,27.6h16.2L-150.5,129z"/>
<path class="st0" d="M-131.3,99.5h-9.9l1.5-6.9h9.9L-131.3,99.5z M-138,129h-9.9l5.9-25.6h9.8L-138,129z"/>
<path class="st0" d="M-103.3,113.6l-3.5,15.5h-9.9l3.1-13.5c0.1-0.7,0.2-1.4,0.2-2.1c0-2.1-1-3.1-3-3.1c-3.2,0-4.9,2.9-5.5,5.6
	l-3,13.1h-9.9l5.8-25.6h8.9l-1.1,4.6c2.5-2.8,6.5-5.4,10.3-5.4c4.7,0,7.9,2.2,7.9,7C-102.8,111-103,112.3-103.3,113.6z"/>
<path class="st0" d="M-72.5,118.2h-19.8c-0.1,0.5-0.2,1-0.2,1.5c0,2.6,1.9,4.2,4.3,4.2c1.8,0,3.5-0.8,4.6-2.2h9.4
	c-3.2,5.8-9.2,8.1-15.5,8.1c-6.7,0-12.5-3.1-12.5-10.1c0-9.7,8.2-17.1,17.8-17.1c7.7,0,12.5,4.4,12.5,11.4
	C-71.9,115.4-72.2,117.2-72.5,118.2z M-85.2,108.5c-3.2,0-5.3,1.9-6.1,5h10c0.1-0.3,0.1-0.7,0.1-1.1
	C-81.2,109.9-82.9,108.5-85.2,108.5z"/>
<path class="st1" d="M-240.7,90.9c0,0,2.5-0.9,3.6-1.3c1-0.4,3.1-1.1,6.1-1.1c2.3,0,4,0.8,6.3,0.5c1.5-0.2,4.4-1,7.1-1
	c3.1,0,3.5,0.6,6.2,0.2c2.5-0.3,4.7-0.7,7.4,0.6c2.6,1.3,6.2,0.7,7.8,0.4c1.7-0.3,4.8-0.5,7.6-0.4c2.7,0.1,5.9,1,8.5,1
	c2.3,0,6.2-0.3,6.9-0.5c0.1-3.7-0.6-6.9-0.7-7.5c-0.5-3-0.8-6.7-0.7-8.3c0.1-1.2,0.6-7.5,0.7-8.7c0.1-1.3,0.6-6.4,0.6-11.1
	c0-2.8-0.5-7.4-0.9-8.6c0,0-1.7,0.7-4.1,0.9c-3.6,0.4-5.5,0-7.1-0.4c-1.9-0.4-6.3-0.3-10.2,0.1c-4.1,0.5-5.2,0.2-6.1,0
	c-2.3-0.4-3.9-1.7-7.2-1.6c-1,0-3.2,0.2-4.1,0.2c-1.5,0-4.1-0.6-5.6-0.7c-0.9,0-1.8,0.2-2.7,0.3c-1,0.2-2.5,0.5-4.8,0.6
	c-2.2,0.1-3.1-0.1-4.2-0.2c-1.2-0.2-3.3-0.4-5.4-0.3c-2.8,0.1-7.5,1.3-7.5,1.3c0.5,1.5,2.2,6.5,2.8,9.7c0.4,2.1,1.1,5.6,1.4,8.3
	c0.2,2.5,0.5,5.4,0.3,8c0,1-0.1,2.3-0.2,3.3c-0.1,2.3-0.4,4.8-0.6,6.3C-239.6,83-240.3,89-240.7,90.9"/>
<path class="st2" d="M-180.6,51.9c-2.2,0-5.5-0.7-6.9-0.9c-1.2-0.2-5.7-0.2-6.9,0c-1.8,0.2-4.7,0.5-6.9,0.3
	c-2.2-0.2-4.6-1.4-6.3-1.7c-1.3-0.2-4,0.1-5.5,0.3c-1.5,0.1-3.9-0.6-5.9-0.5c-3,0-5.2,1-7.5,0.9c-1.7,0-3.7-0.3-4.7-0.5
	c-2.4-0.3-3.9-0.2-5.8,0c-1.2,0.2-2.2,0.4-2.9,0.5c0.5,1.6,1,3.6,1.4,5.2c0.4,2,1,5.5,1.3,8.1c0.2,2.4,0.5,5.2,0.4,7.7
	c0,0.9-0.1,2.2-0.2,3.2c-0.1,2.2-0.4,4.2-0.5,5.7c-0.1,0.7-0.2,2-0.3,3.5c0.9-0.3,2.4-0.7,3.3-0.8c1.2-0.2,3.8-0.6,5.1-0.4
	c1,0.1,2.3,0.6,4.3,0.6c2,0,4.7-0.7,6.5-0.8c1.9-0.2,3.1-0.1,4.8,0.1c0.9,0.1,2.4,0,3.2-0.1c1-0.1,3.1-0.5,4.8-0.2
	c2.1,0.4,4,1.6,6,1.6c1.6,0,2.6,0,4.1-0.2c1.5-0.2,4.4-0.7,6.9-0.6c2.5,0.1,5.5,0.8,8.5,1.1c2.8,0.3,4.5,0,5.2-0.2
	c-0.1-0.6-0.2-1.2-0.3-1.7c-0.5-2.9-0.7-7.5-0.6-8.8c0.1-1.2,0.6-7.4,0.8-8.5c0.2-1.2,0.6-6.2,0.5-10.7c0-1.1-0.1-2.1-0.1-2.9
	C-175.9,51.4-177.9,51.9-180.6,51.9z"/>
<path class="st0" d="M-237.1,48c2.2-0.3,4.7-0.3,5.9-0.1c0.9,0.1,2.6,0.5,4.4,0.5c2.6,0.1,6.1-0.9,7.8-0.9c2-0.1,4.1,0.6,5.7,0.5
	c1.5-0.1,4.2-0.5,5.5-0.3c1.7,0.3,4,1.5,6.4,1.8c2.3,0.3,5.2-0.1,6.4-0.2c1.9-0.2,6-0.3,7.3-0.1c1.4,0.2,4.5,0.9,6.7,0.8
	c3.1,0,4.9-0.4,5.7-0.6c-0.1-1.3-0.3-2-0.3-2s-1.3,0.4-3.7,0.6c-3.5,0.4-5.4-0.2-7-0.6c-1.8-0.4-6.2-0.3-9.9,0.1
	c-4,0.5-5.1,0.1-6-0.1c-2.2-0.4-3.8-1.6-7.1-1.6c-1,0-3.1,0.2-3.9,0.2c-1.5,0.1-4-0.6-5.4-0.6c-0.9,0-1.7,0.1-2.6,0.3
	c-0.9,0.2-2.5,0.5-4.6,0.6c-2.2,0.1-3-0.1-4.1-0.2c-1.2-0.2-3.4-0.4-5.5-0.3c-2.3,0.1-5.6,0.9-5.6,0.9s0.2,0.7,0.6,1.9
	C-239.7,48.5-238.6,48.2-237.1,48z"/>
<path class="st0" d="M-180.7,85.9c-3.3-0.3-6.2-0.9-8.5-1c-2.7-0.1-5.4,0.3-6.9,0.5c-1.7,0.2-2.6,0.2-4.3,0.2c-2,0-3.3-1-5.4-1.4
	c-1.6-0.3-4.1,0-5,0.1c-0.8,0.1-2.5,0.2-3.3,0c-1.7-0.2-2.2-0.3-4.1-0.2c-2.6,0.2-4.8,0.9-6.8,0.9c-2,0-3.2-0.4-4.7-0.6
	c-1.6-0.1-3.8,0.2-5,0.4c-1,0.1-2.6,0.6-3.4,0.9c-0.1,1.2-0.3,2.3-0.3,2.3s1-0.4,2-0.7c1-0.4,3.4-0.9,5.9-0.9c2.2,0,3.8,0.9,6,0.5
	c1.4-0.2,4.3-1.1,7-1.1c3,0,3.4,0.6,6,0.2c2.4-0.3,5.5-0.6,8,0.7c2.5,1.2,5.5,0.6,7,0.4c1.4-0.2,4.8-0.6,7.3-0.5
	c2.6,0.1,6,0.9,8.4,1c2.2,0.1,5.3-0.2,6-0.3c0.1-0.6,0-1.2,0-1.9C-175.5,85.7-177.5,86.1-180.7,85.9z"/>
<path class="st1" d="M-205.5,59.9c0,0,1.8,0,2.3,0c0.5,0,2.6,0,2.6,0s0-2.4-0.1-2.8c-0.1-0.4-0.3-1.8-1.5-2.6c-1-0.6-3.4-1-5.7-1
	c-1.7,0-3.9,0.3-5.1,1.1c-0.6,0.4-1.1,0.8-1.5,2c-0.4,1.3-0.3,3.3-0.3,3.8c0,0.4,0.1,1.6,0.5,2.3c0.6,1,1.3,1.5,2.7,2.3
	c1.4,0.8,4.2,2.3,4.8,2.7c0.7,0.4,1,0.9,1,1.5c0.1,0.5,0.1,2.4,0.1,3.4c-0.1,0.9-0.2,1.4-0.7,1.6c-0.5,0.2-1.4,0.2-2.1,0.1
	c-0.9-0.2-0.9-1.1-1-1.6c0-0.6,0-1.7,0-1.7l-5.5,0c0,0,0,2.8,0.1,3.3c0,0.4,0.2,1.9,1,2.9c0.9,0.9,1.7,1.5,3.4,1.4
	c1.6-0.1,2.4-0.2,3.2-0.2c1.1,0,1.9,0.4,3.1,0.2c1.2-0.1,2.6-0.6,3.4-2.3c0.6-1.2,0.5-2.3,0.6-3c0-0.8,0.1-4,0.1-4.5
	c0-1.5-0.4-2.4-1.4-3.3c-1.6-1.4-6.3-3.6-7.2-4.5c-0.5-0.5-0.6-1.3-0.5-1.8c0-0.6,0-1.3,0.7-1.6c0.9-0.3,2.1-0.2,2.5,0.1
	c0.4,0.3,0.4,0.6,0.5,0.9C-205.5,59.1-205.5,59.9-205.5,59.9z"/>
<polygon class="st2" points="-72.3,135.6 -328.9,135.6 -328.9,137.4 -72.3,137.4 "/>
</svg>`;

const shipment = {
  "id": "3da757d5-1e81-44af-8784-5f536ac730c5",
  "type": {
    "identifier": "shipment",
    "domain": "order",
    "authority": "lx3"
  },
  "timeIntervals": {
    "shippingDate": {
      "estimated": {
        "format": "date_time",
        "value": "2016-10-20T21:00:00.00+00:00"
      }
    },
    "deliveryDate": {
      "estimated": {
        "format": "date_time",
        "value": "2016-10-20T05:00:00.00+00:00"
      }
    }
  },
  "parties": {
    "deliveryLocation": {
      "id": "88844561-5edd-4884-9483-3f5d30427942",
      "name": "Port of BELFAST",
      "addressLine": "Belfast BT3 9AG",
      "zipOrPostalCode": "9999",
      "city": "Belfast",
      "countryCode": "GB",
      "contactMeans": [
        {
          "function": "Personal Email",
          "type": "email",
          "value": "delivery@example.org"
        }
      ],
      "contacts": [],
      "identifiers": [
        {
          "identifier": "GBBEL",
          "domain": "location",
          "authority": "united_nations"
        },
        {
          "identifier": "GBBELF1",
          "domain": "location",
          "authority": "stena"
        }
      ],
      "position": {
        "latitude": 54.618745,
        "longitude": -5.8977055
      }
    },
    "shippingLocation": {
      "id": "474b3a8e-0ba0-4bb0-ba53-5417e7c48e5b",
      "name": "Port of Heysham",
      "addressLine": "Morecambe LA3 2XE",
      "zipOrPostalCode": "9999",
      "city": "Birkenhead",
      "countryCode": "GB",
      "contactMeans": [
        {
          "function": "Personal Email",
          "type": "email",
          "value": "shipment@example.org"
        }
      ],
      "contacts": [],
      "identifiers": [
        {
          "identifier": "GBHYM",
          "domain": "location",
          "authority": "united_nations"
        },
        {
          "identifier": "GBHEYS",
          "domain": "location",
          "authority": "stena"
        }
      ],
      "position": {
        "latitude": 54.03285,
        "longitude": -2.9184725
      }
    },
    "orderInitiator": {
      "id": "92632aa0-0263-48e9-b900-e37916837959",
      "name": "Volvo AB",
      "addressLine": "n/a",
      "zipOrPostalCode": "9999",
      "city": "Belfast",
      "countryCode": "GB",
      "contactMeans": [],
      "contacts": [],
      "identifiers": [],
      "position": {
        "latitude": 54.03285,
        "longitude": -2.9184725
      }
    }
  },
  "identifiers": [
    {
      "identifier": "56081679",
      "domain": "order",
      "authority": "stena"
    },
    {
      "identifier": "checked_in",
      "domain": "operational_status",
      "authority": "stena"
    }
  ],
  "_id": "3da757d5-1e81-44af-8784-5f536ac730c5",
  "orderLines": [
    {
      "id": "a4f8b35d-55ea-4067-8269-9d2daea6a83c",
      "quantity": {},
      "productType": {
        "identifier": "condition_check",
        "domain": "order",
        "authority": "lx3"
      },
      "parties": {
        "deliveryLocation": {
          "id": "a4f8b35d-55ea-4067-8269-9d2daea6a83d",
          "name": "Port of BELFAST",
          "addressLine": "Belfast BT3 9AG",
          "zipOrPostalCode": "9999",
          "city": "Belfast",
          "countryCode": "GB",
          "contactMeans": [],
          "contacts": [],
          "identifiers": [
            {
              "identifier": "GBBEL",
              "domain": "location",
              "authority": "united_nations"
            },
            {
              "identifier": "GBBELF1",
              "domain": "location",
              "authority": "stena"
            }
          ],
          "position": {
            "latitude": 54.618745,
            "longitude": -5.8977055
          }
        },
        "shippingLocation": {
          "id": "a4f8b35d-55ea-4067-8269-9d2daea6a83e",
          "name": "Port of Heysham",
          "addressLine": "Morecambe LA3 2XE",
          "zipOrPostalCode": "9999",
          "city": "Heysham",
          "countryCode": "GB",
          "contactMeans": [],
          "contacts": [],
          "identifiers": [
            {
              "identifier": "GBHYM",
              "domain": "location",
              "authority": "united_nations"
            },
            {
              "identifier": "GBHEYS",
              "domain": "location",
              "authority": "stena"
            }
          ],
          "position": {
            "latitude": 54.03285,
            "longitude": -2.9184725
          }
        }
      },
      "status": "new",
      "timeIntervals": {
        "shippingDate": {
          "estimated": {
            "format": "date_time",
            "value": "2016-10-20T21:00:00.00+00:00"
          }
        },
        "deliveryDate": {
          "estimated": {
            "format": "date_time",
            "value": "2016-10-20T05:00:00.00+00:00"
          }
        }
      },
      "unitPrice": {
        "amount": 0,
        "currency": {
          "name": "SEK"
        }
      },
      "productInstance": {
        "id": "a4f8b35d-55ea-4067-8269-9d2daea6a831",
        "productIdentifier": {
          "identifier": "a2b63d83-2851-4659-bdf2-675a7ca3967e",
          "domain": "consignment",
          "authority": "lx3"
        }
      }
    }
  ],
  "consignments": [
    {
      "id": "a2b63d83-2851-4659-bdf2-675a7ca3967e"
    }
  ],
  "createDateTime": 1494355822436,
  "changeDateTime": 1494355823223,
  "version": 1,
  "consignment": {
    "id": "a2b63d83-2851-4659-bdf2-675a7ca3967e",
    "identifiers": [],
    "type": {
      "identifier": "bulk",
      "domain": "article",
      "authority": "lx3"
    },
    "parties": {
      "deliveryLocation": {
        "id": "88844561-5edd-4884-9483-3f5d30427942",
        "name": "Port of BELFAST",
        "addressLine": "Belfast BT3 9AG",
        "zipOrPostalCode": "9999",
        "city": "Belfast",
        "countryCode": "GB",
        "contactMeans": [],
        "contacts": [],
        "identifiers": [
          {
            "identifier": "GBBEL",
            "domain": "location",
            "authority": "united_nations"
          },
          {
            "identifier": "GBBELF1",
            "domain": "location",
            "authority": "stena"
          }
        ],
        "position": {
          "latitude": 54.618745,
          "longitude": -5.8977055
        }
      },
      "shippingLocation": {
        "id": "474b3a8e-0ba0-4bb0-ba53-5417e7c48e5b",
        "name": "Port of Heysham",
        "addressLine": "Morecambe LA3 2XE",
        "zipOrPostalCode": "9999",
        "city": "Heysham",
        "countryCode": "GB",
        "contactMeans": [],
        "contacts": [],
        "identifiers": [
          {
            "identifier": "GBHYM",
            "domain": "location",
            "authority": "united_nations"
          },
          {
            "identifier": "GBHEYS",
            "domain": "location",
            "authority": "stena"
          }
        ],
        "position": {
          "latitude": 54.03285,
          "longitude": -2.9184725
        }
      }
    },
    "loadingEquipments": [
      {
        "id": "6b3c4d9e-d78b-432d-a148-f054323fd671",
        "description": "Volvo FH16",
        "identifiers": [
          {
            "identifier": "ABC 123",
            "domain": "reg",
            "authority": "sae"
          },
          {
            "identifier": "2GNFLFEK2E6274871",
            "domain": "vin",
            "authority": "sae"
          }
        ],
        "equipmentType": {
          "identifier": "FT",
          "domain": "equipment_type",
          "authority": "stena"
        },
        "quantity": {
          "amount": 1,
          "unit": {
            "name": "pieces"
          }
        },
        "dimensions": {
          "outer": {
            "height": {
              "amount": 1.8,
              "unit": {
                "name": "m"
              }
            },
            "width": {
              "amount": 2.6,
              "unit": {
                "name": "m"
              }
            },
            "length": {
              "amount": 4,
              "unit": {
                "name": "m"
              }
            }
          }
        },
        "measurements": {
          "gross_weight": {
            "value": {
              "amount": 6500,
              "unit": {
                "name": "kg"
              }
            }
          }
        }
      }
    ]
  }
};

const observation = {
  "id": "0f5157a5-cf8f-4242-84b0-d5861454423d",
  "identifiers": [],
  "reports": [
    {
      "handle": "Shunt",
      "checkDate": "2017-05-09T18:54:05.783Z",
      "remark": "asdasads",
      "type": "deviationCheck",
      "hasDeviation": true,
      "deviation": ""
    },
    {
      "handle": "SealCheck",
      "checkDate": "2017-05-09T18:54:05.784Z",
      "remark": "teas",
      "type": "deviationCheck",
      "hasDeviation": true,
      "deviation": ""
    },
    {
      "handle": "Temperature Reading",
      "checkDate": "2017-05-09T18:54:05.785Z",
      "remark": "12",
      "type": "deviationCheck",
      "hasDeviation": true,
      "deviation": "too_high"
    },
    {
      "handle": "Exterior",
      "checkDate": "2017-05-09T18:54:05.786Z",
      "remark": "",
      "modalOpen": false,
      "type": "exteriorCheck",
      "damages": [
        {
          "checkDate": "2017-05-09T18:55:33.662Z",
          "template": {
            "id": "fridge",
            "side": "top",
            "revision": "4"
          },
          "partIdentifiers": [
            {
              "identifier": "roof_left_front",
              "authority": "svg",
              "domain": "part_id"
            },
            {
              "identifier": "roof_right_front",
              "authority": "svg",
              "domain": "part_id"
            },
            {
              "identifier": "roof_right_center",
              "authority": "svg",
              "domain": "part_id"
            },
            {
              "identifier": "roof_left_center",
              "authority": "svg",
              "domain": "part_id"
            }
          ],
          "damageTypeCode": {
            "identifier": 1,
            "authority": "stena",
            "domain": "damage_id"
          },
          "remark": "",
          "coordinates": {
            "ids": [
              "roof_left_front",
              "roof_right_front",
              "roof_right_center",
              "roof_left_center"
            ],
            "points": [
              {
                "docX": 157.86231994628906,
                "docY": 225.15328979492188
              },
              {
                "docX": 160.89471435546875,
                "docY": 220.6046905517578
              },
              {
                "docX": 165.4433135986328,
                "docY": 216.05609130859375
              },
              {
                "docX": 169.2338104248047,
                "docY": 212.26560974121094
              },
              {
                "docX": 174.54049682617188,
                "docY": 207.71701049804688
              },
              {
                "docX": 179.08909606933594,
                "docY": 203.1684112548828
              },
              {
                "docX": 184.3957977294922,
                "docY": 199.37791442871094
              },
              {
                "docX": 188.18629455566406,
                "docY": 195.58741760253906
              },
              {
                "docX": 195.00918579101562,
                "docY": 191.038818359375
              },
              {
                "docX": 202.59017944335938,
                "docY": 184.21592712402344
              },
              {
                "docX": 210.92926025390625,
                "docY": 178.15113830566406
              },
              {
                "docX": 215.4778594970703,
                "docY": 175.11874389648438
              },
              {
                "docX": 220.02645874023438,
                "docY": 172.8444366455078
              },
              {
                "docX": 227.60745239257812,
                "docY": 166.77964782714844
              },
              {
                "docX": 232.9141387939453,
                "docY": 162.98915100097656
              },
              {
                "docX": 237.46273803710938,
                "docY": 159.95675659179688
              },
              {
                "docX": 245.8018341064453,
                "docY": 154.65005493164062
              },
              {
                "docX": 251.1085205078125,
                "docY": 150.85955810546875
              },
              {
                "docX": 255.65711975097656,
                "docY": 147.82716369628906
              },
              {
                "docX": 260.96380615234375,
                "docY": 144.0366668701172
              },
              {
                "docX": 265.5124206542969,
                "docY": 141.7623748779297
              },
              {
                "docX": 270.0610046386719,
                "docY": 138.72998046875
              },
              {
                "docX": 278.40008544921875,
                "docY": 133.42327880859375
              },
              {
                "docX": 285.2229919433594,
                "docY": 128.87469482421875
              },
              {
                "docX": 289.7715759277344,
                "docY": 125.84229278564453
              },
              {
                "docX": 295.83636474609375,
                "docY": 121.29369354248047
              },
              {
                "docX": 300.3849792480469,
                "docY": 119.01940155029297
              },
              {
                "docX": 304.9335632324219,
                "docY": 115.98699951171875
              },
              {
                "docX": 310.2402648925781,
                "docY": 112.19650268554688
              },
              {
                "docX": 307.2078552246094,
                "docY": 116.74510192871094
              },
              {
                "docX": 302.6592712402344,
                "docY": 121.29369354248047
              },
              {
                "docX": 298.1106872558594,
                "docY": 125.84229278564453
              },
              {
                "docX": 294.3201904296875,
                "docY": 129.63278198242188
              },
              {
                "docX": 290.5296936035156,
                "docY": 134.18138122558594
              },
              {
                "docX": 285.9810791015625,
                "docY": 138.72998046875
              },
              {
                "docX": 281.4324951171875,
                "docY": 142.52047729492188
              },
              {
                "docX": 270.819091796875,
                "docY": 155.4081573486328
              },
              {
                "docX": 267.0285949707031,
                "docY": 159.1986541748047
              },
              {
                "docX": 262.4800109863281,
                "docY": 164.50535583496094
              },
              {
                "docX": 254.89901733398438,
                "docY": 172.8444366455078
              },
              {
                "docX": 250.3504180908203,
                "docY": 178.15113830566406
              },
              {
                "docX": 245.04373168945312,
                "docY": 182.69973754882812
              },
              {
                "docX": 241.25323486328125,
                "docY": 186.490234375
              },
              {
                "docX": 236.7046356201172,
                "docY": 192.55502319335938
              },
              {
                "docX": 233.6722412109375,
                "docY": 197.10362243652344
              },
              {
                "docX": 231.39794921875,
                "docY": 201.65220642089844
              },
              {
                "docX": 230.6398468017578,
                "docY": 206.9589080810547
              },
              {
                "docX": 232.15603637695312,
                "docY": 212.26560974121094
              },
              {
                "docX": 236.7046356201172,
                "docY": 214.53990173339844
              },
              {
                "docX": 242.76942443847656,
                "docY": 215.29800415039062
              },
              {
                "docX": 249.5923309326172,
                "docY": 215.29800415039062
              },
              {
                "docX": 256.41522216796875,
                "docY": 215.29800415039062
              },
              {
                "docX": 262.4800109863281,
                "docY": 215.29800415039062
              },
              {
                "docX": 269.30291748046875,
                "docY": 213.78179931640625
              },
              {
                "docX": 276.8839111328125,
                "docY": 211.50750732421875
              },
              {
                "docX": 285.2229919433594,
                "docY": 208.47511291503906
              },
              {
                "docX": 291.28778076171875,
                "docY": 206.9589080810547
              },
              {
                "docX": 296.594482421875,
                "docY": 206.2008056640625
              },
              {
                "docX": 301.14306640625,
                "docY": 203.926513671875
              },
              {
                "docX": 306.44976806640625,
                "docY": 202.41030883789062
              },
              {
                "docX": 311.7564697265625,
                "docY": 201.65220642089844
              },
              {
                "docX": 317.8212585449219,
                "docY": 199.37791442871094
              },
              {
                "docX": 323.1279602050781,
                "docY": 197.10362243652344
              },
              {
                "docX": 328.43463134765625,
                "docY": 194.82931518554688
              },
              {
                "docX": 334.49945068359375,
                "docY": 193.31312561035156
              },
              {
                "docX": 339.8061218261719,
                "docY": 190.28073120117188
              },
              {
                "docX": 345.87091064453125,
                "docY": 187.24832153320312
              },
              {
                "docX": 351.1776123046875,
                "docY": 185.7321319580078
              },
              {
                "docX": 358.0005187988281,
                "docY": 182.69973754882812
              },
              {
                "docX": 362.5491027832031,
                "docY": 179.66734313964844
              },
              {
                "docX": 368.6138916015625,
                "docY": 176.6349334716797
              },
              {
                "docX": 374.6787109375,
                "docY": 174.3606414794922
              },
              {
                "docX": 379.9853820800781,
                "docY": 171.3282470703125
              },
              {
                "docX": 386.0501708984375,
                "docY": 168.2958526611328
              },
              {
                "docX": 392.8730773925781,
                "docY": 165.26345825195312
              },
              {
                "docX": 398.1797790527344,
                "docY": 161.47296142578125
              },
              {
                "docX": 404.24456787109375,
                "docY": 159.95675659179688
              },
              {
                "docX": 408.79315185546875,
                "docY": 156.166259765625
              },
              {
                "docX": 414.8579406738281,
                "docY": 153.1338653564453
              },
              {
                "docX": 420.1646423339844,
                "docY": 150.10147094726562
              },
              {
                "docX": 424.7132568359375,
                "docY": 147.06907653808594
              },
              {
                "docX": 430.7780456542969,
                "docY": 143.27857971191406
              },
              {
                "docX": 439.875244140625,
                "docY": 138.72998046875
              },
              {
                "docX": 444.423828125,
                "docY": 136.45567321777344
              },
              {
                "docX": 448.972412109375,
                "docY": 133.42327880859375
              },
              {
                "docX": 453.5210266113281,
                "docY": 131.14898681640625
              },
              {
                "docX": 461.860107421875,
                "docY": 126.60038757324219
              },
              {
                "docX": 468.6830139160156,
                "docY": 123.5679931640625
              },
              {
                "docX": 475.5058898925781,
                "docY": 121.29369354248047
              },
              {
                "docX": 480.8125915527344,
                "docY": 120.53559875488281
              },
              {
                "docX": 486.1192932128906,
                "docY": 119.77749633789062
              },
              {
                "docX": 486.87738037109375,
                "docY": 125.84229278564453
              },
              {
                "docX": 483.0868835449219,
                "docY": 131.14898681640625
              },
              {
                "docX": 480.0544738769531,
                "docY": 135.6975860595703
              },
              {
                "docX": 477.0220947265625,
                "docY": 141.0042724609375
              },
              {
                "docX": 473.98968505859375,
                "docY": 145.55287170410156
              },
              {
                "docX": 470.9573059082031,
                "docY": 150.10147094726562
              },
              {
                "docX": 467.16680908203125,
                "docY": 155.4081573486328
              },
              {
                "docX": 464.1343994140625,
                "docY": 162.23104858398438
              },
              {
                "docX": 461.860107421875,
                "docY": 166.77964782714844
              },
              {
                "docX": 458.82769775390625,
                "docY": 171.3282470703125
              },
              {
                "docX": 456.55340576171875,
                "docY": 176.6349334716797
              },
              {
                "docX": 454.27911376953125,
                "docY": 181.18353271484375
              },
              {
                "docX": 452.7629089355469,
                "docY": 186.490234375
              },
              {
                "docX": 452.7629089355469,
                "docY": 191.7969207763672
              },
              {
                "docX": 455.0372009277344,
                "docY": 196.34552001953125
              },
              {
                "docX": 460.3439025878906,
                "docY": 197.86172485351562
              },
              {
                "docX": 465.6506042480469,
                "docY": 197.86172485351562
              },
              {
                "docX": 470.9573059082031,
                "docY": 197.86172485351562
              },
              {
                "docX": 477.0220947265625,
                "docY": 197.10362243652344
              },
              {
                "docX": 483.0868835449219,
                "docY": 194.82931518554688
              },
              {
                "docX": 490.6678771972656,
                "docY": 193.31312561035156
              },
              {
                "docX": 495.2164611816406,
                "docY": 191.038818359375
              },
              {
                "docX": 501.2812805175781,
                "docY": 188.0064239501953
              },
              {
                "docX": 506.58795166015625,
                "docY": 185.7321319580078
              },
              {
                "docX": 511.1365661621094,
                "docY": 182.69973754882812
              },
              {
                "docX": 516.4432373046875,
                "docY": 180.42543029785156
              },
              {
                "docX": 520.9918212890625,
                "docY": 177.39303588867188
              },
              {
                "docX": 524.7823486328125,
                "docY": 172.8444366455078
              },
              {
                "docX": 527.8147583007812,
                "docY": 168.2958526611328
              },
              {
                "docX": null,
                "docY": null
              }
            ],
            "damage": {
              "id": 1,
              "remark": ""
            }
          },
          "images": []
        }
      ],
      "reasons": [
        {
          "ok": "OK"
        },
        {
          "remarks": "Remarks"
        }
      ],
      "selectedSubset": null
    },
    {
      "handle": "Seal",
      "checkDate": "2017-05-09T18:54:05.787Z",
      "remark": "",
      "type": "deviationCheck",
      "hasDeviation": true,
      "deviation": ""
    }
  ],
  "links": [
    {
      "type": "order",
      "targetIdentifier": {
        "identifier": "3da757d5-1e81-44af-8784-5f536ac730c5",
        "domain": "order",
        "authority": "lx3"
      }
    }
  ],
  "type": "observation",
  "_id": "0f5157a5-cf8f-4242-84b0-d5861454423d",
  "status": "completed",
  "createDateTime": 1494356158484,
  "changeDateTime": 1494356158484,
  "version": 0
};

const vehicleTypeToSet = {
  FT: {
    front: fs.readFileSync('/temp/vh/img/fridge/v1/front_fridge_final.svg'),
    back: fs.readFileSync('/temp/vh/img/fridge/v1/back_fridge_final.svg'),
    right: fs.readFileSync('/temp/vh/img/fridge/v1/right_fridge_final.svg'),
    left: fs.readFileSync('/temp/vh/img/fridge/v1/left_fridge_final.svg'),
    top: fs.readFileSync('/temp/vh/img/fridge/v1/top_fridge_final.svg'),
    getSubsetKey: () => null,
    metadata: {
      id: 'fridge',
      sides: ['right', 'back', 'top', 'front', 'left'],
      revision: '4'
    }
  }
};

const getIllustrationsByVehicleType = (type) => {
  return vehicleTypeToSet[type];
}

describe('container', () => {
  it.only('should put absolute position', () => {

    const width = 595.28;
    const height = 841.89;
    const left = 40;
    const top = 100;
    const right = 40;
    /*
        <Document>
          <Page mediaBox={{ mediaBox: a4 }}>
            <Block style={{ fontFamily: 'Helvetica', fontSize: 12, top, left, position: 'absolute' }}>
              <Block style={{ top }}>
                <Inline>
                  Hello World             2!
                </Inline>
                <Inline>Again</Inline>
              </Block>
            </Block>
          </Page>
        </Document>
    */
    /*
        <Document>
          <Page mediaBox={{ mediaBox: a4 }}>
            <Block style={{ fontFamily: 'Helvetica', fontSize: 12, top, left, position: 'absolute' }}>
              <Block style={{ top }}>
                <Inline>
                  Hello World             2!
                </Inline>
                <Inline>Again</Inline>
              </Block>
            </Block>
          </Page>
        </Document>
    */
    const margins = {
      marginTop: 50,
      marginLeft: 50,
      marginRight: 50,
      marginBottom: 50
    };

    const diagrams = getIllustrationsByVehicleType('FT');
     
    const Diagrams = diags => {
      // var dg = diags.metadata.sides.map(side => {
      //   console.log('QQ', side, diags[side]);
      //   return SvgFromText({svg: diags[side].toString(), style: { top: 50, left: 50, position: 'fixed' }});
      // });
      var dg = [
        SvgFromText({svg: diags['right'].toString(), style: { top: 70, left: 110, position: 'fixed', height: 100 }}),
        SvgFromText({svg: diags['back'].toString(), style: { top:70, left: 50, position: 'fixed', height: 100 }}),
//        SvgFromText({svg: diags['top'].toString(), style: { top: 170, left: 50, position: 'fixed', height: 100 }}),
        SvgFromText({svg: diags['front'].toString(), style: { top: 270, left: 50, position: 'fixed', height: 100 }}),
        SvgFromText({svg: diags['left'].toString(), style: { top: 270, left: 120, position: 'fixed', height: 100 }})
        ];
      return block({}, dg);
    };

    const Header = () =>
      block({ style: { top: 10, left: 50, position: 'fixed' } }, [SvgFromText({ svg: SvgLogo, style: { height: 50 } })]);
      

    const b = document({},
      page(Object.assign({ mediaBox: a4, style: Object.assign({ border: false, fontFamily: 'Helvetica', fontSize: 12, lineHeight: 1.2, textAlign: 'right' }, margins) }), [

        //        Logo(),
        'VEHICLE CONDITION CHECK',
        block({ style: { border: true } }, [
        //  code39({ value: 'VNOX44711', style: { width: 100, height: 20 } })
          //Logo2()
        ]),
        //Header(),
        Diagrams(diagrams),

        //block({ style: { top: 0, left: 0, position: 'fixed' } }, [Logo2(front)]),

        //code39({ value: 'VNOX44711', style: { width: 100, height: 20 } }),
        /*          block({ style: { top: 100, border: false, width: 100, textAlign: 'right' } },
                    ['Hello World              2!', 'Again', ' Or', block({ style: { border: false } }, 'New block')]
                  ), block({ style: { right: 50, border: false } }, 'Aloha')]
                  */
        //rect({ style: { left: 200, top: 100 } })
      ])
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
    //dumpDom(rb);
    layouter(rb, ctx);
    // dumpDom(rb);
    const doc = renderer(rb, ctx);
    const out = [];
    try {
      doc.write((e) => {
        out.push(e);
      });
    } catch (e) {
      console.error(e);
    }
    require('fs').writeFileSync('d:\\temp.pdf', out.join(''));
    //console.log('RES\n', out.join(''));

    //    console.log(b.context);
    //b.props.style.width.should.equal(0);
    //console.log('>>', b.children[0].children[0].context);
    //b.children[0].children[0].context.ax.should.equal(left);
    //b.children[0].children[0].context.ay.should.equal(top);
  });
});

