import BaseFont from '../../src/font/BaseFont';
import helvetica from '../../src/font/helvetica';
import should from 'should';

describe('BaseFont', () => {
  describe('width', () => {
    it('should default to 1 as width per char', () => {
      const font = new BaseFont({}, {});
      font.width('A').should.equal(1);
    });

    it('should add width of all characters', () => {
      const font = new BaseFont({}, {});
      font.width('Abc').should.equal(3);
    });
    
    it('should add kerning between characters', () => {
      const font = new BaseFont({
        ['A'.charCodeAt(0)]:2,
        ['b'.charCodeAt(0)]:3,
        ['c'.charCodeAt(0)]:4,
        fof: 1
      }, {
        ['A'.charCodeAt(0)]:{
          ['b'.charCodeAt(0)]:20
        },
        ['b'.charCodeAt(0)]:{
          ['c'.charCodeAt(0)]:10
        },
        fof:-1
      });
      font.width('Abc').should.equal(2+3+4+10+20);
    })        
    it('should calculate correct width for helvetica', () => {
      (helvetica.width('Hello World')*30).should.equal(153.9);
    })
  });
});