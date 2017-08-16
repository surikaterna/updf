import bind from './bind';
import block from './block';

const CMRTable = (cmrData, currentTop, currentLeft) => {
  let cx = 0;
  let left = currentLeft || 0;
  let width = 515;
  let nextRowTop = currentTop || 0;
  let totalHeight = 0;
  const rowHeight = 15;

  const Cell = bind(({ title, style, titleStyle, children }) => {
    return block({ style: Object.assign({}, style) }, [
      block({ style: Object.assign({}, { fontSize: 7 }, titleStyle) }, title),
      ...children
    ]);
  });

  const getTableColumns = (row, top) => {
    cx = 0;
    let result;
    const columns = row.columns;
    const colWidths = row.colWidths || [128.75, 128.75, 128.75, 128.75];
    const basicStyle = { fontSize: 8, position: 'absolute', border: true, height: rowHeight, top };
    const tableColumns = columns.map((col, i) => {
      if (col.table) {

        let tableTop = 0
        if (col.table.style && col.table.style.top) {
          tableTop = col.table.style.top;
        }
        result = CMRTable(col.table, tableTop, cx);
      } else {
        result = Cell({ title: columns[i].title, style: Object.assign({}, basicStyle, columns[i].style || {}, { width: colWidths[i], left: cx }, row.style), titleStyle: columns[i].titleStyle || {} }, columns[i].children);
      }
      cx += colWidths[i];
      return result;
    });
    return tableColumns;
  };
  nextRowTop = currentTop;
  const tableRows = cmrData.rows.map((r, i) => {
    if (i > 0) {
      const rowStyle = cmrData.rows[i - 1].style || { height: 54 };
      nextRowTop = nextRowTop + rowStyle.height;
      totalHeight = totalHeight + rowStyle.height;
    }
    // nextRowTop = (i) * 54 + currentTop;

    return block({}, getTableColumns(r, nextRowTop));
  });
  //totalHeight = cmrData.rows.length * rowHeight;
  return block({ id: 'table', style: { textAlign: 'left', position: 'relative', height: totalHeight, marginLeft: currentLeft } },
    [...tableRows]
  );
};

export default CMRTable;
