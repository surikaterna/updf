import asStyle from '../util/asStyle';

export default function cssParser(css) {
  const rules = [];
  const parts = css.trim().split(/[{}]/).filter(String).map((str) => str.trim());
  while (parts.length > 0) {
    const ruleData = parts.splice(0, 2);
    const style = asStyle(ruleData[1]);
    rules.push({ sel: ruleData[0], style });
  }
  return rules;
}
