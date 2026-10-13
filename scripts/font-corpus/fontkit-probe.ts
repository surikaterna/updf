import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { numericCommands, type Command, type SerializedCommand } from "./path-commands.js";

export type { Command } from "./path-commands.js";
export interface PublicPath {
  readonly commands: readonly Command[];
  readonly bbox: { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  closePath(): void;
}
export interface ProbeFont {
  getGlyph(id: number): { readonly path: PublicPath };
}
const fontkit = createRequire(import.meta.url)("fontkit") as { create(bytes: Uint8Array): ProbeFont };
export const probeFont = fontkit.create;

/** Analysis-only access to Fontkit 2.0.4's actual Path implementation, not a copied solver. */
export function pathFactory(font: ProbeFont): () => PublicPath {
  const PathClass = font.getGlyph(0).path.constructor as new () => PublicPath;
  return () => new PathClass();
}
export function singleAxisPath(factory: () => PublicPath, points: readonly number[]): PublicPath {
  assert.equal(points.length, 3);
  const path = factory();
  path.moveTo(points[0]!, 0);
  path.quadraticCurveTo(points[1]!, 1, points[2]!, 2);
  path.closePath();
  return path;
}

/** Coefficient/operation ordering mirrors the investigated Path.js lines 104–159. */
export function cubicTrace(p0: number, control: number, p3: number) {
  const p1 = p0 + (2 / 3) * (control - p0),
    p2 = p3 + (2 / 3) * (control - p3);
  const b = 6 * p0 - 12 * p1 + 6 * p2;
  const a = -3 * p0 + 9 * p1 - 9 * p2 + 3 * p3;
  const c = 3 * p1 - 3 * p0;
  const discriminant = b * b - 4 * c * a;
  const roots =
    a === 0
      ? b === 0
        ? []
        : [-c / b]
      : discriminant < 0
        ? []
        : [(-b + Math.sqrt(discriminant)) / (2 * a), (-b - Math.sqrt(discriminant)) / (2 * a)];
  return { p1, p2, a, b, c, roots };
}
export function directQuadratic(a: number, b: number, c: number): number {
  const t = (a - b) / (a - 2 * b + c);
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
}

/** Ignore traversal start/closing-line representation, but preserve exact segment geometry. */
export function segments(commands: readonly SerializedCommand[]): readonly string[] {
  let current: readonly number[] = [0, 0],
    start = current;
  const result: string[] = [];
  const line = (end: readonly number[]) => {
    if (current[0] !== end[0] || current[1] !== end[1]) result.push(JSON.stringify(["line", ...current, ...end]));
    current = end;
  };
  for (const command of numericCommands(commands)) {
    switch (command.command) {
      case "moveTo":
        current = command.args;
        start = current;
        break;
      case "lineTo":
        line(command.args);
        break;
      case "closePath":
        line(start);
        break;
      case "quadraticCurveTo":
        result.push(JSON.stringify(["quadratic", ...current, ...command.args]));
        current = command.args.slice(2);
        break;
      default:
        throw new Error(`Unexpected path command ${command.command}`);
    }
  }
  return result.sort();
}
