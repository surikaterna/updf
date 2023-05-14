import BaseFont from '../../src/font/BaseFont';
import helvetica from '../../src/font/helvetica';

describe('BaseFont', () => {
  describe('width', () => {
    it('should default to 1 as width per char', () => {
      const font = new BaseFont({}, {});
      expect(font.width('A')).toBe(1);
    });

    it('should add width of all characters', () => {
      const font = new BaseFont({}, {});
      expect(font.width('Abc')).toBe(3);
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
      expect(font.width('Abc')).toBe(2+3+4+10+20);
    })        
    it('should calculate correct width for helvetica', () => {
      expect((helvetica.width('Hello World') * 30)).toBe(153.9);
    })
  });
});