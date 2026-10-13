# Historical QR adapter for cost comparisons only

`qr.ts.txt` is the exact `packages/barcodes/src/qr.ts` source from prototype
`f808a827aff89ca27925671a81083d49369d71c3`, SHA-256
`24f65bee700a18f4d177c599cbb615a30afa1762dd5e5e9c244c6e04cdab4034`.
It is project MIT-licensed source, not a supported runtime export or fallback.

The measurement harness verifies the hash and transpiles this frozen entry into
the old consumer, alongside current unchanged shared checks/painting/symbol helpers.
It never reads Git history or downloads a reference during tests. The old QR encoder
is pinned as a root dev-only dependency for differential and historical cost tests.
Its full MIT notice is retained here and accompanies generated reference bundles.

The live package has no qrcode-generator dependency/import or alternate QR path.
Both public barcode entries install and execute without the reference package.
