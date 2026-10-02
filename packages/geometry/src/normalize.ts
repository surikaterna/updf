import { commands as checked, fail } from "@updf/core/internal";
import type { PathCommand } from "@updf/core/painting";
import { arc } from "./arc.js";
import { arity, command, hasArguments, numeric, type Scanner, whitespace } from "./scanner.js";

interface State {
  x: number;
  y: number;
  sx: number;
  sy: number;
  previous: string;
  cubic?: readonly [number, number];
  quad?: readonly [number, number];
}
function endpoint(
  state: State,
  values: readonly number[],
  index: number,
  relative: boolean,
): readonly [number, number] {
  const x = values[index],
    y = values[index + 1];
  if (x === undefined || y === undefined) fail("PATH_SYNTAX", "/path", "Missing coordinates");
  return [x + (relative ? state.x : 0), y + (relative ? state.y : 0)];
}
function quadratic(state: State, control: readonly [number, number], end: readonly [number, number]): PathCommand {
  return {
    type: "cubic",
    x1: state.x + ((control[0] - state.x) * 2) / 3,
    y1: state.y + ((control[1] - state.y) * 2) / 3,
    x2: end[0] + ((control[0] - end[0]) * 2) / 3,
    y2: end[1] + ((control[1] - end[1]) * 2) / 3,
    x: end[0],
    y: end[1],
  };
}
function curve(kind: string, relative: boolean, values: readonly number[], state: State): PathCommand {
  const end = endpoint(state, values, kind === "C" ? 4 : kind === "T" ? 0 : 2, relative);
  if (kind === "Q" || kind === "T") {
    const control =
      kind === "Q"
        ? endpoint(state, values, 0, relative)
        : state.quad && ["Q", "T"].includes(state.previous)
          ? ([2 * state.x - state.quad[0], 2 * state.y - state.quad[1]] as const)
          : ([state.x, state.y] as const);
    const result = quadratic(state, control, end);
    state.quad = control;
    delete state.cubic;
    return result;
  }
  const first =
    kind === "C"
      ? endpoint(state, values, 0, relative)
      : state.cubic && ["C", "S"].includes(state.previous)
        ? ([2 * state.x - state.cubic[0], 2 * state.y - state.cubic[1]] as const)
        : ([state.x, state.y] as const);
  const second = endpoint(state, values, kind === "C" ? 2 : 0, relative);
  state.cubic = second;
  delete state.quad;
  return { type: "cubic", x1: first[0], y1: first[1], x2: second[0], y2: second[1], x: end[0], y: end[1] };
}
function apply(source: string, values: readonly number[], state: State): readonly PathCommand[] {
  const kind = source.toUpperCase(),
    relative = source !== kind;
  if (!state.previous && kind !== "M") fail("PATH_SYNTAX", "/path", "SVG path must begin with moveto");
  let output: readonly PathCommand[];
  if (kind === "Z") {
    output = [{ type: "close" }];
    state.x = state.sx;
    state.y = state.sy;
  } else if (["C", "S", "Q", "T"].includes(kind)) output = [curve(kind, relative, values, state)];
  else if (kind === "A") {
    const end = endpoint(state, values, 5, relative);
    const [rx, ry, rotation, large, sweep] = values;
    if (rx === undefined || ry === undefined || rotation === undefined || large === undefined || sweep === undefined)
      fail("PATH_SYNTAX", "/path", "Missing arc parameters");
    output = arc(state.x, state.y, end[0], end[1], rx, ry, rotation, large, sweep);
    state.x = end[0];
    state.y = end[1];
  } else {
    const end =
      kind === "H"
        ? ([values[0] === undefined ? NaN : values[0] + (relative ? state.x : 0), state.y] as const)
        : kind === "V"
          ? ([state.x, values[0] === undefined ? NaN : values[0] + (relative ? state.y : 0)] as const)
          : endpoint(state, values, 0, relative);
    output = [{ type: kind === "M" ? "move" : "line", x: end[0], y: end[1] }];
    if (kind === "M") {
      state.sx = end[0];
      state.sy = end[1];
    }
  }
  const last = output.at(-1);
  if (last && last.type !== "close") {
    state.x = last.x;
    state.y = last.y;
  }
  if (!["C", "S", "Q", "T"].includes(kind)) {
    delete state.cubic;
    delete state.quad;
  }
  state.previous = kind;
  return output;
}
export function parsePathData(input: string): readonly PathCommand[] {
  if (typeof input !== "string") fail("TYPE", "/path", "Expected path string");
  if (input.length > 100000) fail("LIMIT", "/path", "Path string budget exceeded");
  const scan: Scanner = { input, offset: 0, units: 0 };
  const state: State = { x: 0, y: 0, sx: 0, sy: 0, previous: "" };
  const result: PathCommand[] = [];
  while (scan.offset < input.length) {
    const source = command(scan);
    if (!source) {
      whitespace(scan);
      if (scan.offset === input.length) break;
      fail("PATH_SYNTAX", `/path/${scan.offset}`, "Unconsumed path character");
    }
    const count = arity[source.toUpperCase()];
    if (count === undefined) fail("PATH_SYNTAX", "/path", "Unsupported path command");
    if (!count) {
      result.push(...apply(source, [], state));
      if (result.length > 4096) fail("LIMIT", "/path", "Normalized command budget exceeded");
      continue;
    }
    let repeat = 0;
    do {
      const values = Array.from({ length: count }, (_, i) =>
        numeric(scan, source.toUpperCase() === "A" && (i === 3 || i === 4), i === 0 && repeat === 0),
      );
      const effective = repeat++ && source.toUpperCase() === "M" ? (source === "M" ? "L" : "l") : source;
      result.push(...apply(effective, values, state));
      if (result.length > 4096) fail("LIMIT", "/path", "Normalized command budget exceeded");
    } while (hasArguments(scan));
  }
  return checked(result, "/path");
}
