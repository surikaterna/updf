import should from 'should';

import pathParser from '../../../src/content/svg/pathParser';

should();

describe('pathParser', () => {
  describe('#parse', () => {
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
    it('should parse allow multipl of argument count', (done) => {
      let called = 0;
      pathParser('s.84,8.27.83,10.83,0,26.11,0,26.11-.44,6.79-1.31,11.68-1.59,8.36-1.59,8.36h12.16', {
        s: () => { called++; },
        h: () => { called.should.equal(4); done(); }
      });
    });
    it('should parse curious paths', (done)=> {
      const log = (t) => (...args) => console.log(t, args);
      pathParser('M196.3,14.58l5.31,21.94s7.25,23.2,9.92,44.61a182.89,182.89,0,0,1,0,41.48', {
        M: log('M'),
        l: log('l'),
        s: log('s'),
        a: log('a')
      });
      done();
    });
  
  });
});
