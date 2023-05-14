import cssParser from '../../../src/content/styles/cssParser';

// @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
expect();

describe('cssParser', () => {
  describe('#parse', () => {
    it('should parse one class descriptor', () => {
      expect(cssParser(`
        .className {style: 'value'; style2: 'v2'}
        `).length).toBe(1);
    });
    it('should parse many class descriptors', () => {
      expect(cssParser(`
        .className {style: 'value'; style2: 'v2'}
        .className {style: 'value2'}
        `).length).toBe(2);
    });
    it('should parse out values', () => {
      expect(cssParser(`
        .className {style: 'value'; style2: 'v2'}
        // @ts-expect-error TS(2339): Property 'style2' does not exist on type '{}'.
        `)[0].style.style2).toBe('v2');
    });
  });
});
