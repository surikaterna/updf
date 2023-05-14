/** Very simple css */
export default class Css {
  _rules: any;
  constructor() {
    this._rules = [];
  }
  addRule(rule: any) {
    this._rules.push(rule);
  }
  computeStyles(node: any) {
    const style = {};
    this._rules.forEach((sel: any) => {
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
}
