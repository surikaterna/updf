import { capture } from "./bridge.mjs";
import { render } from "./terminal.ts";

export function run(args) {
  if (args.some((arg) => !/^--(widths|states)=/.test(arg))) throw new Error("Only --widths and --states are supported");
  if (new Set(args.map((arg) => arg.split("=")[0])).size !== args.length) throw new Error("Duplicate option");
  const option = (name, fallback) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
  const widths = option("widths", "32,80").split(",").map(Number);
  const states = option("states", "hidden,shown").split(",");
  if (widths.length > 2 || states.length > 2) throw new Error("At most two widths/states");
  for (const state of states) {
    capture(state, (snapshot) => {
      for (const width of widths) console.log(`STATE=${state} WIDTH=${width}\n${render(snapshot, width).body}\n`);
    });
  }
}
