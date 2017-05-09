import asStyle from '../util/asStyle';

export default function cssParser(css) {
  const rules = [];
  const parts = css.trim().split(/[{}]/).filter(String).map((str) => str.trim());
  while (parts.length > 0) {
    const ruleData = parts.splice(0, 2);
    // console.log('RDD', ruleData);
    const style = asStyle(ruleData[1]);
     console.log('RD', ruleData[0], style);
    rules.push({ sel: ruleData[0], style });
  }
  return rules; // console.log('C1', parts);
}
