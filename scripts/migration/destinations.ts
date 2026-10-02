import { alignedPath } from "./alignment.js";

const poc = "experimental/declarative/";

const examples: Readonly<Record<string, string>> = {
  "cli.ts": "node",
  "server.ts": "node",
  "font-proof.ts": "node",
  "fontkit-cli.ts": "node",
  "painting-proof.ts": "node",
  "svg-proof.ts": "node",
  "painting-document.ts": "node",
  "svg-fixtures.ts": "node",
  "cmr.ts": "cmr",
  "cmr-tree.tsx": "cmr",
  "cmr-types.ts": "cmr",
  "cmr-unicode.ts": "cmr",
};

const packageTests: Readonly<Record<string, string>> = {
  "render.test.ts": "core",
  "vdom.test.ts": "core",
  "font-resources.test.ts": "core",
  "geometry.test.ts": "geometry",
  "svg.test.ts": "svg",
  "svg-audit.test.ts": "svg",
  "fontkit.test.ts": "fontkit",
};

function fixtureDestination(path: string): string {
  const rest = path.slice("fixtures/".length);
  if (rest.startsWith("fonts/")) return `tests/fixtures/${rest}`;
  if (rest.startsWith("svg-reference/")) return `tests/${rest}`;
  const browser = rest.startsWith("font-browser/") ? "browser-fonts" : "browser-react";
  const name = rest.slice(rest.indexOf("/") + 1);
  if (name === "browser.test.ts") return `tests/browser/${browser}.test.ts`;
  return `examples/${browser}/${name}`;
}

function testDestination(path: string): string {
  const rest = path.slice("test/".length);
  if (rest.startsWith("types/")) return `tests/consumer/${rest}`;
  if (rest === "declarations.test.ts") return `tests/consumer/${rest}`;
  if (rest === "font-fixture.ts") return `tests/fixtures/fonts/${rest}`;
  if (rest.startsWith("probes/")) return `packages/svg/test/${rest}`;
  const owner = packageTests[rest];
  return owner ? `packages/${owner}/test/${rest}` : `tests/integration/${rest}`;
}

function pocDestination(path: string): string {
  if (path.startsWith("roadmap/")) return `docs/${path}`;
  if (path === "README.md") return "docs/native-api.md";
  if (path === "EVIDENCE.md") return "docs/evidence/native-poc.md";
  if (path === "package-lock.json") return "docs/evidence/baseline/poc-package-lock.json";
  if (path.startsWith("fixtures/")) return fixtureDestination(path);
  if (path.startsWith("test/")) return testDestination(path);
  if (path.startsWith("tools/")) return path;
  if (path.startsWith("examples/")) {
    const name = path.slice("examples/".length);
    const owner = examples[name];
    if (!owner) throw new Error(`Unclassified example: ${path}`);
    return `examples/${owner}/src/${name}`;
  }
  if (/^(geometry|svg|fontkit)\//u.test(path)) {
    const [owner, ...parts] = path.split("/");
    const name = parts.join("/");
    const source = /\.ts$/u.test(name) ? "src/" : "";
    return `packages/${owner}/${source}${name}`;
  }
  if (/^(core|fonts|painting|vdom)\//u.test(path) || /^(index|types|jsx.*)\.ts$/u.test(path)) {
    return `packages/core/src/${path}`;
  }
  if (["package.json", ".gitignore", "eslint.config.ts", "tsconfig.json", "tsconfig.build.json"].includes(path)) {
    return `docs/evidence/baseline/poc-config/${path}`;
  }
  throw new Error(`Unclassified POC file: ${path}`);
}

export function destination(path: string): string {
  if (path.startsWith(poc)) return alignedPath(pocDestination(path.slice(poc.length)));
  if (path === ".gitignore") return path;
  if (path === "package-lock.json") return "docs/evidence/baseline/legacy-package-lock.json";
  if (path === "package.json") return "packages/legacy/package.json";
  if (path === "readme.md") return "docs/migration/legacy-readme.md";
  if (/^(src|test)\//u.test(path)) return `packages/legacy/${path}`;
  if ([".babelrc", ".eslintrc", ".npmignore", "index.js", "keytest.html"].includes(path)) {
    return `packages/legacy/${path}`;
  }
  throw new Error(`Unclassified legacy file: ${path}`);
}
