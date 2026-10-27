import { fail } from "@updf/core/internal";
import { defineHandler, type ShapeHandler } from "./handlers.js";
import { Source, type ShapeSource } from "./sources.js";
import type { Charge } from "./path-band.js";

/** Bounded authored convenience grammar, deliberately not a CSS parser. */
export function shapeSyntax(): ShapeHandler {
  return defineHandler({ kind: "syntax", resolve: parseShape });
}
function parseShape(input: string, charge: Charge, path: string): ShapeSource {
  charge(input.length + 1);
  let cursor = 0;
  const error = (): never => fail("VALUE", path, `Invalid shape syntax at offset ${cursor}`);
  const space = () => {
    while (/\s/u.test(input[cursor] ?? "") && cursor < input.length) cursor++;
  };
  const take = (token: string) => {
    space();
    if (input[cursor++] !== token) error();
  };
  space();
  const start = cursor;
  while (/[a-z]/u.test(input[cursor] ?? "")) cursor++;
  const name = input.slice(start, cursor);
  take("(");
  let source: ShapeSource;
  if (name === "path" || name === "url") {
    space();
    const quoted = quotedString(input, cursor, error);
    cursor = quoted.end;
    if (name === "url" && !quoted.value.length) error();
    source = name === "path" ? Source.path(quoted.value) : Source.url(quoted.value);
  } else if (name === "polygon") {
    const points: number[] = [];
    do {
      if (points.length) take(",");
      if (points.length === 8190) fail("LIMIT", path, "Polygon coordinate limit exceeded");
      const pair = coordinatePair(input, cursor, charge, error);
      points.push(...pair.points);
      cursor = pair.end;
      space();
    } while (input[cursor] === ",");
    if (points.length < 6) error();
    source = Source.polygon(points);
  } else return error();
  take(")");
  space();
  if (cursor !== input.length) error();
  return source;
}
function coordinatePair(input: string, cursor: number, charge: Charge, error: () => never) {
  const points: number[] = [];
  const number = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/uy;
  for (let pair = 0; pair < 2; pair++) {
    const before = cursor;
    while (cursor < input.length && /\s/u.test(input[cursor]!)) cursor++;
    if (pair && cursor === before) error();
    number.lastIndex = cursor;
    const token = number.exec(input);
    if (!token || !Number.isFinite(Number(token[0]))) error();
    charge(1);
    points.push(Number(token![0]));
    cursor = number.lastIndex;
  }
  return { points, end: cursor };
}
function quotedString(input: string, cursor: number, error: () => never) {
  const quote = input[cursor++];
  if (quote !== "'" && quote !== '"') error();
  let value = "";
  while (cursor < input.length) {
    let character = input[cursor++]!;
    if (character === quote) return { value, end: cursor };
    if (character === "\\") {
      character = input[cursor++]!;
      if (character !== quote && character !== "\\") error();
    }
    value += character;
  }
  return error();
}
