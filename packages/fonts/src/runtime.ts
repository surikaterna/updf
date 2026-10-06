import { fail } from "@updf/core/internal";
import {
  createOwnedResource,
  type OwnedResource,
  type TextMetrics,
  type TextRun,
  type TextRuntime,
} from "@updf/core/resources";
import { inkAscent, textWidth } from "./helvetica-metrics.js";
import { fontRun } from "./measure.js";
import { isPreparedFont } from "./prepare.js";
import { validateCharacters } from "./profile.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

const helveticas = new WeakSet<object>();
export type Helvetica = OwnedResource<{ readonly format: "Helvetica" }>;
export function createHelvetica(): Helvetica {
  const font = createOwnedResource({ format: "Helvetica" as const });
  helveticas.add(font);
  return font;
}
export function isHelvetica(value: object): value is Helvetica {
  return helveticas.has(value);
}
export interface RunData {
  readonly resource: PreparedFont | Helvetica;
  readonly fontSize: number;
  readonly text: string;
  readonly glyphs: readonly PreparedGlyph[];
}
const runtimes = new WeakMap<TextRuntime, WeakMap<TextRun, RunData>>();
export function resolveRun(runtime: TextRuntime, run: TextRun, path: string): RunData {
  const data = runtimes.get(runtime)?.get(run);
  if (!data) fail("FONT_RESOURCE", path, "Foreign or forged text run");
  return data;
}
function validateResource(resource: OwnedResource, path: string): asserts resource is PreparedFont | Helvetica {
  if (!isPreparedFont(resource) && !isHelvetica(resource)) fail("FONT_RESOURCE", path, "Expected an owned font");
}

export function fontRuntime(): TextRuntime {
  const runs = new WeakMap<TextRun, RunData>();
  const own = (data: RunData): TextRun => {
    const run = Object.freeze({}) as TextRun;
    runs.set(run, Object.freeze(data));
    return run;
  };
  const runtime: TextRuntime = Object.freeze({
    validateResource,
    validateText(resource: OwnedResource, text: string, path: string) {
      validateResource(resource, path);
      validateCharacters(text, isPreparedFont(resource) ? resource : undefined, path);
    },
    lineMetrics,
    measure(resource: OwnedResource, text: string, size: number, path: string) {
      validateResource(resource, path);
      const result = measured(resource, text, size, path);
      return Object.freeze({
        ...result.metrics,
        run: own({ resource, text, fontSize: size, glyphs: result.glyphs }),
      });
    },
    joinRuns(input: readonly TextRun[], path: string) {
      return joined(runtime, input, path, own);
    },
  });
  runtimes.set(runtime, runs);
  return runtime;
}
function lineMetrics(resource: OwnedResource, size: number, path: string) {
  validateResource(resource, path);
  if (!isPreparedFont(resource)) return { ascent: size * inkAscent, descent: size - size * inkAscent };
  const scale = size / resource.metadata.unitsPerEm;
  return {
    ascent: resource.metadata.descriptor.ascent * scale,
    descent: -resource.metadata.descriptor.descent * scale,
  };
}
function joined(
  runtime: TextRuntime,
  input: readonly TextRun[],
  path: string,
  own: (data: RunData) => TextRun,
): TextRun {
  const first = input[0];
  if (!first) fail("FONT_RESOURCE", path, "Cannot join an empty run sequence");
  const data = input.map((run) => resolveRun(runtime, run, path));
  const initial = data[0];
  if (!initial) fail("FONT_RESOURCE", path, "Missing first run");
  for (const item of data)
    if (item.resource !== initial.resource || item.fontSize !== initial.fontSize)
      fail("FONT_RESOURCE", path, "Cannot join different resources or sizes");
  if (input.length === 1) return first;
  return own({
    ...initial,
    text: data.map((item) => item.text).join(""),
    glyphs: Object.freeze(data.flatMap((item) => item.glyphs)),
  });
}
function measured(
  font: PreparedFont | Helvetica,
  text: string,
  size: number,
  path: string,
): { metrics: Omit<TextMetrics, "run">; glyphs: readonly PreparedGlyph[] } {
  if (!isPreparedFont(font)) return measuredHelvetica(text, size, path);
  const run = fontRun(text, font, path),
    scale = size / font.metadata.unitsPerEm;
  const ascent = Math.max(0, run.ink?.[3] ?? 0) * scale;
  const descent = Math.max(0, -(run.ink?.[1] ?? 0)) * scale;
  return {
    glyphs: Object.freeze(run.glyphs),
    metrics: {
      advance: run.advance * scale,
      left: (run.ink?.[0] ?? 0) * scale,
      right: (run.ink?.[2] ?? 0) * scale,
      ascent,
      descent,
      top: -(run.ink?.[3] ?? 0) * scale,
      bottom: -(run.ink?.[1] ?? 0) * scale,
      empty: run.ink === null,
    },
  };
}
function measuredHelvetica(text: string, size: number, path: string) {
  validateCharacters(text, undefined, path);
  const advance = textWidth(text, size),
    ascent = size * inkAscent;
  const descent = size - ascent;
  return {
    glyphs: Object.freeze([]),
    metrics: {
      advance,
      left: 0,
      right: advance,
      ascent,
      descent,
      top: -ascent,
      bottom: descent,
      empty: !/[^ ]/u.test(text),
    },
  };
}
