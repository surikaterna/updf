import PDFImage from './image';

export default {
  initImages() {
    this._imageRegistry = {};
    return (this._imageCount = 0);
  },

  image(src) {
    let image;

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
      image.embed(this);
    }

    const resources = this.currentPage().object.Resources.object;

    if (!resources.XObject[image.label]) {
      resources.XObject[image.label] = image.obj;
    }

    const stream = this.currentPage().object.Contents.object;
    // TODO: Change transform values "100 0 0 100 0 0 cm" to cover page
    stream.append(`q 100 0 0 100 0 0 cm /${image.label} Do Q`);

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
