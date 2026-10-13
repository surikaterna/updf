import assert from "node:assert/strict";
import test from "node:test";
import { segments } from "../../scripts/font-corpus/fontkit-probe.js";
import { coordinate, numericCommands } from "../../scripts/font-corpus/path-commands.js";

test("serialized Fraction command arguments normalize to the same geometry without rewriting evidence", () => {
  const wire = JSON.parse(
    '{"commands":[{"command":"moveTo","args":["1/2","-3"]},{"command":"lineTo","args":[2,"-3"]},{"command":"quadraticCurveTo","args":["7/2",4,"-1/2","2"]},{"command":"closePath","args":[]}],"exact":"-887/129"}',
  );
  const original = JSON.stringify(wire);
  const expected = [
    { command: "moveTo", args: [0.5, -3] },
    { command: "lineTo", args: [2, -3] },
    { command: "quadraticCurveTo", args: [3.5, 4, -0.5, 2] },
    { command: "closePath", args: [] },
  ];
  assert.deepEqual(segments(wire.commands), segments(expected));
  assert.equal(JSON.stringify(wire), original);
});

test("trace input rejects invalid/nonfinite coordinates and malformed command shapes", () => {
  for (const value of ["", "NaN", "Infinity", "1/0", "1/-2", "1/2/3", null, true, Infinity, NaN, "9".repeat(400)])
    assert.throws(() => coordinate(value));
  assert.equal(coordinate("-7/2"), -3.5);
  assert.equal(coordinate("0"), 0);
  assert.equal(coordinate(1.25), 1.25);
  assert.throws(() => numericCommands([{ command: "moveTo", args: ["1"] }]));
  assert.throws(() => numericCommands([{ command: "unknown", args: [] }]));
  assert.throws(() => numericCommands([{ command: "lineTo", args: new Array<number>(2) }]));
});
