import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
export const coreTypes = [
  "native-template.ts",
  "vdom-template.tsx",
  "fonts-template.ts",
  "runtime-template.ts",
  "measurement-template.tsx",
];
export const allTypes = [...coreTypes, "painting-template.tsx", "svg-template.tsx"];

export async function typeConsumer(
  directory: string,
  names: readonly string[],
  bundler = false,
  execute = true,
): Promise<void> {
  for (const name of [...names, "text-options.ts", "layout-options.ts"]) {
    await writeFile(join(directory, name), await readFile(join(root, "tests/consumer/types", name)));
  }
  await writeFile(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: bundler ? "ESNext" : "NodeNext",
        moduleResolution: bundler ? "Bundler" : "NodeNext",
        lib: ["ES2022"],
        types: [],
        jsx: "react-jsx",
        jsxImportSource: "@updf/core",
        strict: true,
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        useUnknownInCatchVariables: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noEmitOnError: true,
        outDir: "out",
      },
      files: names,
    }),
  );
  const tsc = join(root, "node_modules/typescript/bin/tsc");
  execFileSync(process.execPath, [tsc, "-p", directory], { cwd: directory, stdio: "pipe" });
  if (!execute) return;
  for (const name of names) {
    execFileSync(process.execPath, [join(directory, "out", name.replace(/\.tsx?$/u, ".js"))], {
      cwd: directory,
      stdio: "pipe",
    });
  }
}
