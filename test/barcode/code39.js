import { enc } from '../../src/content/barcode/code39';

describe('code39', () => {
  it('correct symbol for 1', () => {
    enc('Test').should.equal('10001011101110101010111011100011110101110001011011101011100011010111011100011000101110111010');
  });
});