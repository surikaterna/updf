import {
  createFragmentOperation,
  createRangeOperation,
  type CompleteRequest,
  type FragmentSource,
  type ProviderWork,
  type RangeOperation,
} from "@updf/layout-boxes/fragmentation";

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
const prepared = operation.prepare(source);
const candidates = operation.candidates(prepared, { offset: 0, width: 8 });
const candidate = operation.nextCandidate(candidates);
if (!candidate.done) {
  const content: string = operation.materializeCandidate(candidate.endpoint).units[0]!.content;
  const top: number = candidate.endpoint.unit.top;
  void content;
  void top;
  const negativeTypes = () => {
    // @ts-expect-error Candidate cursors are distinct from region cursors.
    operation.fragment(candidate.cursor, { id: "bad", width: 8, height: 3, usedHeight: 0 });
    // @ts-expect-error Endpoint metadata never exposes content.
    void candidate.endpoint.content;
    // @ts-expect-error Endpoints are not enumeration cursors.
    operation.nextCandidate(candidate.endpoint);
    // @ts-expect-error Cursors are not materializable endpoints.
    operation.materializeCandidate(candidate.cursor);
  };
  void negativeTypes;
}
operation.close();

const ranges: RangeOperation<string, string> = createRangeOperation({
  next: (text: string, { offset }) => ({ end: offset + 1, height: 1, content: text.slice(offset, offset + 1) }),
});
export const selected = ranges.select(ranges.prepare(source), { offset: 0, width: 8, height: 1, usedHeight: 0 });
const complete: CompleteRequest = { mode: "complete", offset: 0, width: 8 };
export const completeRange = ranges.select(ranges.prepare(source), complete);
const narrowTypes = () => {
  // @ts-expect-error Complete selection carries no physical capacity.
  const mixed: CompleteRequest = { mode: "complete", offset: 0, width: 8, height: 1 };
  void mixed;
  // @ts-expect-error Indexed-region flow requires the explicit full operation.
  ranges.start({ count: 1, at: () => source });
  // @ts-expect-error Range operations do not expose candidate enumeration.
  ranges.candidates(ranges.prepare(source), { offset: 0, width: 8 });
};
void narrowTypes;
ranges.close();
