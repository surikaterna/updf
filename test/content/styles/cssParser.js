import should from 'should';

import cssParser from '../../../src/content/styles/cssParser';

should();

describe('cssParser', () => {
  describe('#parse', () => {
    it('should parse one class descriptor', () => {
      cssParser(`
        .className {style: 'value'; style2: 'v2'}
        `).length.should.equal(1);
    });
    it('should parse many class descriptors', () => {
      cssParser(`
        .className {style: 'value'; style2: 'v2'}
        .className {style: 'value2'}
        `).length.should.equal(2);
    });
    it('should parse out values', () => {
      cssParser(`
        .className {style: 'value'; style2: 'v2'}
        `)[0].style.style2.should.equal('v2');
    });
  });
});
