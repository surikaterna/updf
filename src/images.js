import PDFImage from './image';

const pad = (str, length) => (Array(length + 1).join('0') + str).slice(-length);

const escapableRe = /[\n\r\t\b\f\(\)\\]/g;
const escapable = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
  '\\': '\\\\',
  '(': '\\(',
  ')': '\\)'
};

// Convert little endian UTF-16 to big endian
const swapBytes = function (buff) {
  const l = buff.length;
  if (l & 0x01) {
    throw new Error('Buffer length must be even');
  } else {
    for (let i = 0, end = l - 1; i < end; i += 2) {
      const a = buff[i];
      buff[i] = buff[i + 1];
      buff[i + 1] = a;
    }
  }

  return buff;
};

const number = (n) => {
  if (n > -1e21 && n < 1e21) {
    return Math.round(n * 1e6) / 1e6;
  }

  throw new Error(`unsupported number: ${n}`);
};

const convert = (object, encryptFn = null) => {
  // String literals are converted to the PDF name type
  if (typeof object === 'string') {
    return `/${object}`;

    // String objects are converted to PDF strings (UTF-16)
  } else if (object instanceof String) {
    let string = object;
    // Detect if this is a unicode string
    let isUnicode = false;
    for (let i = 0, end = string.length; i < end; i++) {
      if (string.charCodeAt(i) > 0x7f) {
        isUnicode = true;
        break;
      }
    }

    // If so, encode it as big endian UTF-16
    let stringBuffer;
    if (isUnicode) {
      stringBuffer = swapBytes(Buffer.from(`\ufeff${string}`, 'utf16le'));
    } else {
      stringBuffer = Buffer.from(string.valueOf(), 'ascii');
    }

    // Encrypt the string when necessary
    if (encryptFn) {
      string = encryptFn(stringBuffer).toString('binary');
    } else {
      string = stringBuffer.toString('binary');
    }

    // Escape characters as required by the spec
    string = string.replace(escapableRe, c => escapable[c]);

    return `(${string})`;

    // Buffers are converted to PDF hex strings
  } else if (Buffer.isBuffer(object)) {
    return `<${object.toString('hex')}>`;
  } else if (object instanceof Date) {
    let string =
      `D:${pad(object.getUTCFullYear(), 4)}` +
      pad(object.getUTCMonth() + 1, 2) +
      pad(object.getUTCDate(), 2) +
      pad(object.getUTCHours(), 2) +
      pad(object.getUTCMinutes(), 2) +
      pad(object.getUTCSeconds(), 2) +
      'Z';

    // Encrypt the string when necessary
    if (encryptFn) {
      string = encryptFn(Buffer.from(string, 'ascii')).toString('binary');

      // Escape characters as required by the spec
      string = string.replace(escapableRe, c => escapable[c]);
    }

    return `(${string})`;
  } else if (Array.isArray(object)) {
    const items = object.map(e => convert(e, encryptFn)).join(' ');
    return `[${items}]`;
  } else if ({}.toString.call(object) === '[object Object]') {
    const out = ['<<'];
    for (const key in object) {
      const val = object[key];
      out.push(`/${key} ${convert(val, encryptFn)}`);
    }

    out.push('>>');
    return out.join('\n');
  } else if (typeof object === 'number') {
    return number(object);
  } else {
    return `${object}`;
  }
};


















export default {
  initImages() {
    this._imageRegistry = {};
    return (this._imageCount = 0);
  },

  image(src, x, y, options = {}) {
    let bh, bp, bw, image, ip, left, left1;
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    x = (left = x != null ? x : options.x) != null ? left : this.x;
    y = (left1 = y != null ? y : options.y) != null ? left1 : this.y;

    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      if (src.width && src.height) {
        image = src;
      } else {
        image = this.openImage(src);
      }
    }

    if (!image.obj) {
      image.embed(this, convert);
    }

    // console.log({ image });



    const resources = this.currentPage().object.Resources.object;

    

    if (!resources.XObject[image.label]) {
      resources.XObject[image.label] = image.obj;
    }

    // console.log('++++++++++++++++', resources);

    // let w = options.width || image.width;
    // let h = options.height || image.height;

    /* if (options.width && !options.height) {
      const wp = w / image.width;
      w = image.width * wp;
      h = image.height * wp;
    } else if (options.height && !options.width) {
      const hp = h / image.height;
      w = image.width * hp;
      h = image.height * hp;
    } else if (options.scale) {
      w = image.width * options.scale;
      h = image.height * options.scale;
    } else if (options.fit) {
      [bw, bh] = options.fit;
      bp = bw / bh;
      ip = image.width / image.height;
      if (ip > bp) {
        w = bw;
        h = bw / ip;
      } else {
        h = bh;
        w = bh * ip;
      }
    } else if (options.cover) {
      [bw, bh] = options.cover;
      bp = bw / bh;
      ip = image.width / image.height;
      if (ip > bp) {
        h = bh;
        w = bh * ip;
      } else {
        w = bw;
        h = bw / ip;
      }
    } */

    /* if (options.fit || options.cover) {
      if (options.align === 'center') {
        x = x + bw / 2 - w / 2;
      } else if (options.align === 'right') {
        x = x + bw - w;
      }

      if (options.valign === 'center') {
        y = y + bh / 2 - h / 2;
      } else if (options.valign === 'bottom') {
        y = y + bh - h;
      }
    } */

    // const c = convert(image.data);
    // console.log({ c_length: c });

    const stream = this.currentPage().object.Contents.object;
    stream.append(`q 100 0 0 100 20 20 cm /${image.label} Do Q`);

    return this;
  },

  openImage(src) {
    let image;
    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      image = PDFImage.open(src, `Image${++this._imageCount}`);
      if (typeof src === 'string') {
        this._imageRegistry[src] = image;
      }
    }

    return image;
  }

};
