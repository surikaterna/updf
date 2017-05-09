/** Very simple css */
export default class Css {
  constructor() {
    this._rules = [];
  }
  addRule(rule) {
    this._rules.push(rule);
  }
  computeStyles(node) {
    const style = {};
    this._rules.forEach((sel) => {
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
