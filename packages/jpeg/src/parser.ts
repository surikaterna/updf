import { profile, requireData } from "./errors.js";
import { entropy, segment, word } from "./markers.js";
import { type Frame, frame, jfif, type JpegMetadata, scan } from "./profile.js";
import { huffman, quantization } from "./tables.js";

interface State {
  frame?: Frame;
  jfif: boolean;
  interval?: number;
  readonly quantization: Set<number>;
  readonly huffman: Set<number>;
}
export function parse(bytes: Uint8Array): JpegMetadata {
  requireData(bytes[0] === 0xff && bytes[1] === 0xd8, "JPEG must start with SOI");
  const state: State = { jfif: false, quantization: new Set(), huffman: new Set() };
  let offset = 2;
  while (offset < bytes.length) {
    const current = segment(bytes, offset);
    if (current.marker === 0xda) {
      requireData(state.frame, "SOS requires exactly one SOF0");
      scan(current.payload, state.frame, state.quantization, state.huffman);
      entropy(bytes, current.next, state.interval ?? 0);
      return state.frame.metadata;
    }
    header(current.marker, current.payload, offset, state);
    offset = current.next;
  }
  requireData(false, "Missing scan");
}
function header(marker: number, payload: Uint8Array, offset: number, state: State): void {
  if (marker === 0xe0) {
    requireData(!state.jfif && offset === 2, "JFIF must occur once immediately after SOI");
    jfif(payload);
    state.jfif = true;
  } else if (marker === 0xc0) {
    requireData(!state.frame, "Duplicate SOF0");
    state.frame = frame(payload, state.jfif);
  } else if (marker === 0xdb) quantization(payload, state.quantization);
  else if (marker === 0xc4) huffman(payload, state.huffman);
  else if (marker === 0xdd) {
    requireData(state.interval === undefined && payload.length === 2, "Invalid or duplicate DRI");
    state.interval = word(payload, 0);
  } else if (marker !== 0xfe) profile("Unsupported JPEG marker/metadata or coding profile");
}
