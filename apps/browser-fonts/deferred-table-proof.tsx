/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createContext, lower, useContext } from "@updf/core/vdom";
import type { PreparedFont } from "@updf/fonts";
import { Block, createExtensions, Document, Flow, FragmentContext, layout, PageContext, Paragraph } from "@updf/layout";
import { Table, table, tableExtension } from "@updf/tables";
import { textOptions } from "./text-options.js";

const Theme = createContext({ name: "DEFAULT" });
const columns = [{ width: { weight: 1, min: 160, max: 180 } }] as const;
const extensions = createExtensions([tableExtension]);
export function deferredTableProof(font: PreparedFont, mode: "data" | "jsx") {
  const contexts: string[] = [];
  function Label({ edge }: { readonly edge: string }) {
    const page = useContext(PageContext),
      fragment = useContext(FragmentContext);
    const text = `${useContext(Theme).name} ${edge} P${page.docPageNumber}/${page.docPageCount} F${fragment.index}/${fragment.count}`;
    contexts.push(text);
    return <Paragraph style={{ font: "Proof", fontSize: 8, lineHeight: 1.25 }}>{text}</Paragraph>;
  }
  const content = proofContent(Label, mode);
  const tree = (
    <Document>
      <Theme.Provider value={{ name: "CAPTURED" }}>
        <Flow
          pageSize={{ width: 200, height: 110 }}
          margins={{ top: 5, right: 5, bottom: 5, left: 5 }}
          extensions={extensions}
        >
          {content}
        </Flow>
      </Theme.Provider>
    </Document>
  );
  const options = textOptions({ resources: { Proof: font } });
  const result = layout(tree, options);
  const bytes = render(result.document, options);
  const observed = contexts.slice();
  contexts.length = 0;
  const lowered = render(lower(tree, options), options);
  if (bytes.length !== lowered.length || bytes.some((value, index) => value !== lowered[index]))
    throw new Error("Deferred cell lower/layout byte mismatch");
  if (JSON.stringify(contexts) !== JSON.stringify(observed)) throw new Error("Deferred cell context mismatch");
  return { bytes: Array.from(bytes), contexts: observed, pageCount: result.pageCount };
}
function proofContent(
  Label: (props: { readonly edge: string }) => import("@updf/core/vdom").VNode,
  mode: "data" | "jsx",
) {
  const cells = [1, 2].map((number) => ({
    key: `row-${number}`,
    node: (
      <Block>
        <Block.Header height={20}>
          <Label edge={`HEAD${number}`} />
        </Block.Header>
        <Paragraph style={{ font: "Proof", fontSize: 10, lineHeight: 1.2 }}>{`Привет ROW${number}`}</Paragraph>
        <Block.Footer height={20}>
          <Label edge={`FOOT${number}`} />
        </Block.Footer>
      </Block>
    ),
  }));
  if (mode === "data")
    return table({ columns, body: cells.map((cell) => ({ key: cell.key, cells: [{ children: cell.node }] })) });
  return (
    <Table columns={columns}>
      <Table.Body>
        {cells.map((cell) => (
          <Table.Row key={cell.key}>
            <Table.Cell>{cell.node}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
export function mountDeferredTableProof(font: PreparedFont): void {
  for (const mode of ["data", "jsx"] as const) {
    const result = document.createElement("pre");
    result.id = `deferred-table-${mode}`;
    result.hidden = true;
    result.textContent = JSON.stringify(deferredTableProof(font, mode));
    document.body.append(result);
  }
}
