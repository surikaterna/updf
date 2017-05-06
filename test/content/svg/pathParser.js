import should from 'should';

import pathParser from '../../../src/content/svg/pathParser';

should();

describe('pathParser', () => {
  describe.only('#parse', () => {
    it('should support one op + args', (done) => {
      pathParser('M1,2', {
        M: (x, y) => {
          x.should.equal(1);
          y.should.equal(2);
          done();
        }
      });
    });
    it('should support multiple op + args', (done) => {
      let called = 0;
      const cFunc = () => called++;
      pathParser('M150 0 L75 200 L225 200 Z', {
        M: cFunc,
        L: cFunc,
        Z: () => {
          called.should.equal(3);
          done();
        }
      });
    });
  });
});
