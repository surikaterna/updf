# @updf/layout-kernel — Slice A

Private MIT `2.0.0-poc.0` package: the canonical binary64 fixed/weighted bounded
width allocator, independent of PDF, fonts, VDOM, DOM, React, Node and `@updf/core`.
No runtime dependencies or ambient declaration dependencies.

```ts
import { resolveWidths, LayoutInputError } from "@updf/layout-kernel";
const result = resolveWidths({ availableWidth: 80, tracks: [20, { weight: 1 }], gap: 1 });
```

Inputs are ordinary data objects and dense ordinary arrays. Unknown keys,
accessors, explicit invalid optional values, invalid geometry and count budgets
reject with `LayoutInputError` (`code`, JSON-pointer `path`, `message`). Accessors
are not invoked, including inherited accessors. Only validated own enumerable data
properties are consumed: inherited optional fields are absent (use defaults), and
missing own required fields reject at their normal field diagnostic paths.
Track count is checked before entries. Proxy traps are arbitrary
host code: this is not a CPU sandbox, and host exceptions propagate unchanged.
Results and their width arrays are frozen; no caller data is mutated.

`@updf/layout-kernel/numeric` exposes only the existing binary64 primitives.
Its documented preconditions require validated nonnegative finite geometry;
it does not validate arbitrary numeric inputs.

Production `@updf/layout` delegates allocation here and maps recognized contract
failures to its existing `DocumentError`. The terminal proof consumes this public
package directly. This is **not a complete layout engine**: Slice B box composition
and Slice C fragmentation remain pending. Rows, tables, pagination and styles
remain in their existing packages.
