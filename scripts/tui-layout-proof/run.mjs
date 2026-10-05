import { load, verifyRoot } from "./bundle.mjs";

try {
  const root = verifyRoot();
  const { run } = await load("cli.mjs", root);
  run(process.argv.slice(2));
  verifyRoot();
} catch (error) {
  console.error(`Proof failed: ${error.message}`);
  process.exitCode = 1;
}
