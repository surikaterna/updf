/** @jsxImportSource @updf/core */
import type { RGB } from "@updf/core";
import { useContext } from "@updf/core/vdom";
import { type Orientation, Page, PageContext, type PageDimensions } from "@updf/layout";

interface FixedPageProps {
  readonly title: string;
  readonly size: PageDimensions;
  readonly orientation: Orientation;
  readonly footer: boolean;
  readonly background: RGB;
}
function FixedPageFooter(props: { readonly width: number; readonly background: RGB }) {
  const page = useContext(PageContext);
  return (
    <paintGroup>
      <rect x={0} y={0} width={props.width} height={14} paint={{ fill: props.background, stroke: null }} />
      <text x={0} y={0} width={props.width} height={14} fontSize={10} lineHeight={14} align="left">
        {`Page ${page.docPageNumber}/${page.docPageCount}`}
      </text>
    </paintGroup>
  );
}
// These preset sizes are portrait; Page applies the requested orientation.
// Fixed Page accepts native drawing children, not flowing Paragraph children.
function FixedPositionPage(props: FixedPageProps) {
  const width = (props.orientation === "landscape" ? props.size.height : props.size.width) - 72;
  const height = props.orientation === "landscape" ? props.size.width : props.size.height;
  return (
    <Page size={props.size} orientation={props.orientation}>
      <group x={36} y={36}>
        <text x={0} y={0} width={width} height={28} fontSize={10} lineHeight={14} align="left">
          {props.title}
        </text>
      </group>
      {props.footer && (
        <group x={36} y={height - 50}>
          <FixedPageFooter width={width} background={props.background} />
        </group>
      )}
    </Page>
  );
}
export function FixedCover(props: FixedPageProps) {
  return <FixedPositionPage {...props} />;
}
export function FixedAppendix(props: FixedPageProps) {
  return <FixedPositionPage {...props} />;
}
