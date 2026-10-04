import { compileOptions } from "proof:compile";
import { compileFsx as compile } from "@formbar/fsx-authoring";
import { example, source } from "./source.mjs";

export function compileFsx() {
  return compile(source.replace("value={fullname}", "value={uninstalled}"), compileOptions(example));
}
