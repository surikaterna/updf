# React integration proof (private/unpublished)

Root `npm run build:browser` builds separate emitted-package closure targets;
`npm run test:browser` checks actual Chromium PDF parity. Drawing core excludes
fonts/text. Text-bearing application composition explicitly installs both optional
packages, with no fallback from core. React belongs to this host application only.
See [migration](../../docs/migration/fonts-text.md) for explicit options.
