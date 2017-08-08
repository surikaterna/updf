import bind from './bind';
import block from './block';


const table = {
  rows: [
    {
      colWidths: [200, 57.5, 257.5],
      columns: [
        {
          title: '  1. Sender (name, address, country)',
          children: ['  Dovista Polska Holding SP.Z.O.O', '  WEDKOWY', '  Swarozyn POLAND', '']
        },
        {
          title: '  ',
          children: ['  ', ' ', '  1044 AA NL', ''],
          style: { textAlign: 'right' }
        },
        {
          title: '  2. Sender (name, address, country)',
          children: ['  NISSAN MOTOR PARTS B.V.', '  HORNWEG 32', '  AMSTERDAM', '']
        }
      ]
    },
    {
      colWidths: [200, 57.5, 257.5],
      columns: [
        {
          title: '  2. Consignee (name, address, country)',
          children: ['  FAKTO AUTO AS', '  OSMUSSAARE TEE 10', '  TALLINN', '']
        },
        {
          title: '  ',
          children: ['  ', ' ', '  13811 EE', ''],
          style: { textAlign: 'right' }
        },
        {
          title: '  4. Sender (name, address, country)',
          children: ['  NISSAN MOTOR PARTS B.V.', '  HORNWEG 32', '  HORNWEG 32', '']
        }
      ]
    },
    {
      colWidths: [200, 57.5, 257.5],
      columns: [
        {
          title: '  3. Consignee (name, address, country)',
          children: ['  SCHENKER AS', '  13 Kaabli street', '  Estonia Tallinn', '']
        },
        {
          title: '  ',
          children: ['  ', ' ', '  10112 EE', ''],
          style: { textAlign: 'right' }
        },
        {
          title: '  16. Carrier (name, address, country)',
          children: ['  Kuehne Nagel', '  ', '  ', '']
        }
      ]
    },
    {
      colWidths: [200, 57.5, 257.5],
      columns: [
        {
          title: '  4. Consignee (name, address, country)',
          children: ['  HUB LOGISTICS - HAKKILA VANTAA', '  VANHA PORVOONTIE 256', '  VANTAA', '']
        },
        {
          title: '  ',
          children: ['  ', ' ', '  01380 FI', ''],
          style: { textAlign: 'right' }
        },
        {
          title: '  17. Succesive carriers (name, address, country)',
          children: ['', '', '', '']
        }
      ]
    },
    {
      colWidths: [73.57, 73.57, 73.57, 73.57, 73.57, 73.57, 73.57],
      columns: [
        {
          title: '  6. Marks and number',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        },
        {
          title: '  7.  Number of packages',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        },
        {
          title: '  8.  Method of packing',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        },
        {
          title: '  9.  Nature of the goods',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        },
        {
          title: '  10.  Statistical number',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        },
        {
          title: '  11.  Gross weiight kg.',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        },
        {
          title: '  12.  Volume in m3',
          children: ['  hazard see attached doc', '', '', ''],
          titleStyle: { fontSize: 6 }
        }
        
      ]
    }
  ]
};

const CMRTable = bind((props, context) => {
  
  let cx = 0;
  let nextRowTop = 55;
  const rowHeight = 15;

  const Cell = bind(({ title, value, style, titleStyle, children }) => {
    return block({ style: Object.assign({}, { border: true }, style) }, [
      block({ style: Object.assign({}, { fontSize: 7 }, titleStyle) }, title),
      ...children
    ]);
  });

  const getTableColumns = (row, top) => {
    cx = 0;
    const columns = row.columns;
    const colWidths = row.colWidths || [128.75, 128.75, 128.75, 128.75];
    const basicStyle = { fontSize: 8, position: 'absolute', border: true, height: rowHeight, top };
    const tableColumns = columns.map((col, i) => {
      const result = Cell({ title: columns[i].title, value: ' ', style: Object.assign({}, basicStyle, columns[i].style || {},  { width: colWidths[i], left: cx }), titleStyle: columns[i].titleStyle || {} }, columns[i].children);
      cx += colWidths[i];
      return result;
    });
    return tableColumns;
  };

  const tableRows = table.rows.map((r, i) => {
    nextRowTop = (i) * 54 + 55;

    return block({}, getTableColumns(r, nextRowTop));
  });

  return block({ id: 'table', style: { textAlign: 'left', position: 'relative', height: table.rows.length * rowHeight } },
    [...tableRows]
  );
});

export default CMRTable;
