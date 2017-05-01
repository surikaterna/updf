import should from 'should';

import pathParser from '../../../src/content/svg/pathParser';

should();

describe('pathParser', () => {
  describe('#parse', () => {
    it.only('should support Move', (done) => {
      pathParser(`M1,2`, {
        moveTo: (x, y) => {
          x.should.equal(1);
          y.should.equal(2);
          done();
        }
      });
    });
  });
});
