import { stack, stackHeight } from "../../packages/layout/src/flow-composition/stack-model.js";

export function stackModelWitness() {
  const block = { extent: 2, naturalSize: { height: 0.25 }, label: "native-free" };
  const control = { extent: 1, control: "advance" as const, naturalSize: { height: 0 }, label: "control" };
  const values: unknown[][] = [];
  const result = stack([block, control, block], 0.5, 0.25, 1, "/native-free", (...args) => {
    values.push(args);
    return args[0];
  });
  const label: string | undefined = result.entries[0]?.block?.label;
  return {
    result,
    height: stackHeight([block, control, block], 0.5, 0.25),
    label,
    same: result.entries[0]?.block === block,
    calls: values,
  };
}
