import JPEG from './image/jpeg';

class Image {
  static open(data, label) {
    const isBuffer = Buffer.isBuffer(data);
    if (!isBuffer) {
      throw new Error('Data is not binary');
    }

    const isJPEG = data[0] === 0xff && data[1] === 0xd8;
    if (isJPEG) {
      return new JPEG(data, label);
    }

    const isPNG = data[0] === 0x89 && data.toString('ascii', 1, 4) === 'PNG';
    if (isPNG) {
      throw new Error('PNG is not supported');
    }

    throw new Error('Unknown image format');
  }
}

export default Image;
