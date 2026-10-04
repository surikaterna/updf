# Freight invoice font assets

Both unmodified Liberation Sans faces come from the Liberation Fonts 2.1.5
upstream binary release archive:
https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz

Archive SHA256: `7191c669bf38899f73a2094ed00f7b800553364f90e2637010a69c0e268f25d0`.
The adjacent `LICENSE` retains the upstream copyright and SIL OFL 1.1 terms.

- Regular: `76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8`, 410712 bytes (existing fixture).
- Bold: `788abee4c806d660e8aee46689dd8540cd4bb98da03dcc9d171ce3efd99a9173`, 414456 bytes (new fixture).

The installed 2.1.5 bold face was inspected but differs from the upstream binary;
it is **not** redistributed. Node and browser prepare the exact fixture bytes via
the optional `@updf/fontkit` entry, passing both resources to layout and render.
No synthetic font weight or core parser dependency is used. Browser delivery
includes both assets and `notices/LICENSE.liberation`. The original prepared
fixture metadata and README remain unchanged.
