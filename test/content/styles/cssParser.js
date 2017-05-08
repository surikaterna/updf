import should from 'should';

import cssParser from '../../../src/content/styles/cssParser';

should();

describe('cssParser', () => {
  describe('#parse', () => {
    it.only('should parse one class descriptor', () => {
      cssParser(`
        .className {style: 'value'}
        `).rules.length.should.equal(1);
    });
  });
});
