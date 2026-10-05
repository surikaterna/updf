import type { NodeDefinition } from "@updf/core";
import { checkLimit, codePoints, type Policy } from "@updf/core/internal";
import type { TextLineMeasurement } from "@updf/text";
import { scanOutput } from "./output-scan.js";
export interface BudgetTotals {
  readonly nodes: number;
  readonly text: number;
  readonly commands: number;
  readonly work: number;
}

export class OutputBudget {
  constructor(private readonly policy: Policy) {}
  private nodes = 0;
  private text = 0;
  private work = 0;
  private commands = 0;
  totals(): BudgetTotals {
    return Object.freeze({ nodes: this.nodes, text: this.text, commands: this.commands, work: this.work });
  }
  fork(): OutputBudget {
    const copy = new OutputBudget(this.policy);
    copy.nodes = this.nodes;
    copy.text = this.text;
    copy.commands = this.commands;
    copy.work = this.work;
    return copy;
  }
  apply(counts: BudgetTotals, path: string): void {
    this.generated(counts.nodes, counts.text, counts.commands, counts.work, path);
  }
  adopt(candidate: OutputBudget): void {
    this.nodes = candidate.nodes;
    this.text = candidate.text;
    this.commands = candidate.commands;
    this.work = candidate.work;
  }
  release(nodes: readonly NodeDefinition[], path: string): void {
    const measured = new OutputBudget(this.policy);
    measured.charge(nodes, path);
    const counts = measured.totals();
    this.generated(-counts.nodes, -counts.text, -counts.commands, -counts.work, path);
  }
  generated(nodes: number, text: number, commands: number, work: number, path: string): void {
    this.reserveWork(work, path);
    this.nodes += nodes;
    this.commands += commands;
    checkLimit(this.nodes, this.policy.nodes, path, "Generated nodes");
    checkLimit(this.commands, this.policy.pathCommands, path, "Generated path commands");
    this.characters(text, path);
  }
  reserveWork(count: number, path: string): void {
    this.work += count;
    checkLimit(this.work, Number.MAX_SAFE_INTEGER, path, "Internal work counter");
  }
  line(line: TextLineMeasurement, path: string): void {
    checkLimit(++this.nodes, this.policy.nodes, path, "Generated nodes");
    this.reserveWork(2 + 2 * line.fragments.length, path);
    this.characters(
      line.fragments.reduce((count, fragment) => count + codePoints(fragment.text), 0),
      path,
    );
  }
  charge(nodes: readonly NodeDefinition[], path: string): void {
    scanOutput(
      nodes,
      path,
      {
        node: () => {
          checkLimit(++this.nodes, this.policy.nodes, path, "Generated nodes");
        },
        text: (value) => {
          checkLimit(
            this.text + Math.ceil(value.length / 2),
            this.policy.textCodePoints,
            path,
            "Generated text code points",
          );
          this.characters(codePoints(value), path);
        },
        commands: (count) => {
          this.commands += count;
          checkLimit(this.commands, this.policy.pathCommands, path, "Generated path commands");
        },
      },
      this.policy,
    );
  }
  characters(count: number, path: string): void {
    this.text += count;
    checkLimit(this.text, this.policy.textCodePoints, path, "Generated text code points");
  }
}
