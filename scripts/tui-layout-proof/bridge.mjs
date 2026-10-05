import { compileOptions } from "proof:compile";
import { disposeDemoSession, installDemo } from "proof:install";
import { compileFsx } from "@formbar/fsx-authoring";
import { example, source } from "./source.mjs";

// These demo helpers are application-private bridges, not public Formbar APIs.
export function capture(state, consume = (snapshot) => snapshot) {
  if (!["hidden", "shown"].includes(state)) throw new Error("Unknown proof state");
  const compiled = compileFsx(source, compileOptions(example));
  if (!compiled.ok) throw new Error(`FSX compile failed: ${compiled.diagnostics.map((d) => d.code).join(",")}`);
  const host = installDemo({
    version: 1,
    schema: example.schema,
    definition: compiled.definition,
    initialData: { fullname: "Ada Lovelace", company: "Analytical Engines", showExtra: state === "shown" },
  });
  try {
    return consume(host.snapshot(), host);
  } finally {
    disposeDemoSession(host);
  }
}
