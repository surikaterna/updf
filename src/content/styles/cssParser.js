import { collect } from '../svg/pathParser';
const re = /(([^{]+)\s*\{\s*([^}]+)\s*})/g;

export default function cssParser(css) {
  console.log(collect(css, re));
}
