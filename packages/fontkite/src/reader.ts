import { fail } from "@updf/core/internal";

export function invalid(message: string): never {
  fail("FONT_FORMAT", "/font/bytes", message);
}

/** Every read is bounded by its table/glyph, not merely by the font buffer. */
export class Reader {
  readonly view: DataView;
  position = 0;
  constructor(bytes: Uint8Array<ArrayBuffer>) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  check(offset: number, length: number): void {
    if (
      !Number.isInteger(offset) ||
      !Number.isInteger(length) ||
      offset < 0 ||
      length < 0 ||
      offset > this.view.byteLength - length
    )
      invalid("Truncated or invalid TrueType range");
  }
  u8(offset: number): number {
    this.check(offset, 1);
    return this.view.getUint8(offset);
  }
  u16(offset: number): number {
    this.check(offset, 2);
    return this.view.getUint16(offset);
  }
  i16(offset: number): number {
    this.check(offset, 2);
    return this.view.getInt16(offset);
  }
  u32(offset: number): number {
    this.check(offset, 4);
    return this.view.getUint32(offset);
  }
  i32(offset: number): number {
    this.check(offset, 4);
    return this.view.getInt32(offset);
  }
  slice(offset: number, length: number): Reader {
    this.check(offset, length);
    return new Reader(new Uint8Array(this.view.buffer as ArrayBuffer, this.view.byteOffset + offset, length));
  }
  skip(length: number): void {
    this.check(this.position, length);
    this.position += length;
  }
  byte(): number {
    const value = this.u8(this.position);
    this.position++;
    return value;
  }
  word(): number {
    const value = this.u16(this.position);
    this.position += 2;
    return value;
  }
  signed(): number {
    const value = this.i16(this.position);
    this.position += 2;
    return value;
  }
}
