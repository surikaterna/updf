import { createFragmentOperation, type FragmentSource, type ProviderWork } from "@updf/layout-boxes/fragmentation";

const source: FragmentSource<string> = {
  id: "text",
  path: "/text",
  descriptor: "abc",
  extent: 3,
  mode: "splittable",
  width: { mode: "reflow" },
};
const operation = createFragmentOperation({
  next: (text: string, { offset }, work: ProviderWork) => {
    work.consume(1);
    return { end: offset + 1, height: 1, content: text.slice(offset, offset + 1) };
  },
});
const cursor = operation.start({ count: 1, at: () => source });
export const region = operation.fragment(cursor, { id: "one", width: 8, height: 3, usedHeight: 0 });
operation.close();
