import assert from "node:assert/strict";

export interface SerializedCommand {
  readonly command: string;
  readonly args: readonly (number | string)[];
}
export interface Command {
  readonly command: string;
  readonly args: readonly number[];
}

/** Python Fraction strings are evidence, not JavaScript numeric coordinates. */
export function coordinate(value: unknown): number {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), "Expected finite path coordinate");
    return value;
  }
  assert.ok(
    typeof value === "string" && /^-?\d+(?:\/[1-9]\d*)?$/u.test(value),
    "Expected integer or rational coordinate",
  );
  const [numerator, denominator = "1"] = value.split("/");
  const a = Number(numerator),
    b = Number(denominator),
    result = a / b;
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(result), "Coordinate exceeds numeric range");
  return result;
}

export function numericCommands(commands: readonly SerializedCommand[]): readonly Command[] {
  assert.ok(Array.isArray(commands), "Expected path command array");
  return commands.map((command) => {
    assert.ok(command && typeof command === "object", "Expected path command");
    const arity =
      command.command === "closePath"
        ? 0
        : command.command === "quadraticCurveTo"
          ? 4
          : command.command === "moveTo" || command.command === "lineTo"
            ? 2
            : undefined;
    assert.ok(
      arity !== undefined && Array.isArray(command.args) && command.args.length === arity,
      "Invalid path command/arity",
    );
    return { command: command.command, args: Array.from(command.args, coordinate) };
  });
}
