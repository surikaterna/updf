/** @jsxImportSource react */

import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { cmrFixture } from "@updf/example-cmr/cmr";
import { createCmrTree } from "@updf/example-cmr/cmr-tree";
import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const url = React.useMemo(
    () => URL.createObjectURL(new Blob([render(lower(createCmrTree(cmrFixture)))], { type: "application/pdf" })),
    [],
  );
  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <main>
      <h1>Experimental CMR subset - not operational</h1>
      <a href={url} download="cmr.pdf">
        Download CMR PDF
      </a>
      <object data={url} type="application/pdf" width="700" height="850">
        <p>Use the download link if this browser has no native PDF viewer.</p>
      </object>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing React root element");
createRoot(root).render(<App />);
