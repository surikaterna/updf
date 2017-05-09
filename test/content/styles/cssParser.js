import should from 'should';

import cssParser from '../../../src/content/styles/cssParser';

should();

describe('cssParser', () => {
  describe('#parse', () => {
    it.only('should parse one class descriptor', () => {
      cssParser(`
        .className {style: 'value'; style2: 'v2'}
        .className {style: 'value2'}
        `).length.should.equal(2);
        console.log(cssParser(`
        .className {style: 'value'; style2: 'v2'}
        .className {style: 'value2'}
        `))
    });
  });
});
