# Browser font proofs (private/unpublished)

Root `npm run build:browser` and `npm run test:browser` validate emitted-package
Node/Chromium parity. `text-options.ts` explicitly pairs resources, text service,
and font provider; the same runtime is used for lowering and rendering. External
Fontkit decoding is optional, not a core or text dependency. Prepared-only output
does not install unused Helvetica. See [migration](../../docs/migration/fonts-text.md).
