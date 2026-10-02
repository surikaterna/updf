import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const result = spawnSync("npm", ["audit", "--ignore-scripts", "--json"], { encoding: "utf8", timeout: 120000 });
if (result.error || result.signal || result.status === null) throw result.error ?? new Error("Audit did not complete");
writeFileSync("artifacts/workspace-audit.json", result.stdout);
const report: { metadata?: { vulnerabilities?: unknown } } = JSON.parse(result.stdout);
console.log(report.metadata?.vulnerabilities);
console.log(`npm audit exit ${result.status}; inherited findings were not fixed or waived.`);
process.exitCode = result.status;
