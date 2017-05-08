/** Very simple css */
export default class Css {
  constructor() {
    this._selectors = [];
  }
  addSelector(sel) {
    this._selectors.push(sel);
  }
  computeStyles(node) {
    const style = {};
    this._selectors.forEach((sel) => {
      const res = sel(node);
      if (res) {
        Object.assign(style, res);
      }
    });
    if (node.props.style) {
      Object.assign(style, node.props.style);
    }
    return style;
  }
};
