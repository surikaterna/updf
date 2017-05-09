import bind from '../bind';
import cssParser from '../styles/cssParser';
import classRule from '../styles/classRule';

const Style = (props, context) => {
  // this will change
  const css = props.children[0].props.str;
  const rules = cssParser(css);
  rules.forEach(rule =>
    context.css.addRule(classRule(rule.sel.substring(1), rule.style))
  );
};

export default bind('Style', Style);
