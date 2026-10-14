import { isDeepStrictEqual } from "node:util";
import { DocumentError } from "@updf/core";
import { prepareFont as kite } from "@updf/fontkite";
import { prepareFont as kit } from "@updf/fontkit";
import type { FontMetadata, PreparedFont } from "@updf/fonts";
import type { Expectation } from "./types.js";
import { type BoundsOracle, type BoundsVerification, verifyBounds } from "./bounds-oracle.js";

export interface Failure {
  readonly code: string;
  readonly message: string;
}
export function passed(status: string): boolean {
  return status === "match" || status === "expected-rejection" || status === "verified-bounds-difference";
}
type Attempt = { font: PreparedFont } | { error: Failure };
export interface Comparison {
  readonly status:
    | "match"
    | "expected-rejection"
    | "mismatch"
    | "verified-bounds-difference"
    | "oracle-mismatch"
    | "unexpected-rejection"
    | "unexpected-acceptance"
    | "reference-error";
  readonly error?: Failure;
  readonly referenceError?: Failure;
  readonly mappingCount?: number;
  readonly metadataFields?: readonly string[];
  readonly glyphDifferenceCount?: number;
  readonly parity?: "match" | "different";
  readonly nonBoundsGlyphDifferenceCount?: number;
  readonly boundsVerification?: BoundsVerification;
  readonly oracleSha256?: string;
  readonly glyphDifferences?: readonly { codePoint: number; actual: unknown; reference: unknown }[];
}
function attempt(prepare: typeof kite, bytes: Uint8Array<ArrayBuffer>): Attempt {
  try {
    return { font: prepare(bytes) };
  } catch (error) {
    if (error instanceof DocumentError) {
      const diagnostic = error.diagnostics[0]!;
      return { error: { code: diagnostic.code, message: diagnostic.message } };
    }
    throw error;
  }
}
export function differences(actual: FontMetadata, reference: FontMetadata): Comparison {
  const { glyphs: actualGlyphs, ...a } = actual,
    { glyphs: referenceGlyphs, ...b } = reference;
  const metadataFields = (Object.keys(a) as (keyof typeof a)[]).filter((key) => !isDeepStrictEqual(a[key], b[key]));
  const left = new Map(actualGlyphs.map((glyph) => [glyph.codePoint, glyph]));
  const right = new Map(referenceGlyphs.map((glyph) => [glyph.codePoint, glyph]));
  const changed = [...new Set([...left.keys(), ...right.keys()])]
    .sort((x, y) => x - y)
    .filter((code) => !isDeepStrictEqual(left.get(code), right.get(code)));
  return {
    status: metadataFields.length || changed.length ? "mismatch" : "match",
    parity: metadataFields.length || changed.length ? "different" : "match",
    mappingCount: actualGlyphs.length,
    metadataFields,
    glyphDifferenceCount: changed.length,
    nonBoundsGlyphDifferenceCount: changed.filter((code) => {
      const l = left.get(code),
        r = right.get(code);
      return !l || !r || l.glyphId !== r.glyphId || l.advance !== r.advance;
    }).length,
    glyphDifferences: changed.slice(0, 20).map((codePoint) => ({
      codePoint,
      actual: left.get(codePoint) ?? null,
      reference: right.get(codePoint) ?? null,
    })),
  };
}
export function withOracle(result: Comparison, metadata: FontMetadata, oracle: BoundsOracle): Comparison {
  const boundsVerification = verifyBounds(metadata, oracle);
  if (boundsVerification.status === "mismatch") return { ...result, status: "oracle-mismatch", boundsVerification };
  const justified =
    result.status === "mismatch" && result.metadataFields?.length === 0 && result.nonBoundsGlyphDifferenceCount === 0;
  return { ...result, boundsVerification, ...(justified ? { status: "verified-bounds-difference" as const } : {}) };
}

export function compare(bytes: Uint8Array<ArrayBuffer>, expected: Expectation, oracle?: BoundsOracle): Comparison {
  const actual = attempt(kite, bytes);
  if (expected.kind === "unsupported") {
    if ("font" in actual) return { status: "unexpected-acceptance" };
    const match = actual.error.code === expected.code && actual.error.message === expected.message;
    return { status: match ? "expected-rejection" : "unexpected-rejection", error: actual.error };
  }
  const reference = attempt(kit, bytes);
  if ("error" in actual)
    return {
      status: "unexpected-rejection",
      error: actual.error,
      ...("error" in reference ? { referenceError: reference.error } : {}),
    };
  if ("error" in reference) return { status: "reference-error", referenceError: reference.error };
  const result = differences(actual.font.metadata, reference.font.metadata);
  return oracle ? withOracle(result, actual.font.metadata, oracle) : result;
}
