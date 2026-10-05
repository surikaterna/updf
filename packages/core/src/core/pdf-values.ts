// These types are private: caller strings can only become escaped literals.
const scalarBrand: unique symbol = Symbol("PDF scalar");
interface PdfName {
  readonly [scalarBrand]: "name";
  readonly value: string;
}
interface PdfLiteral {
  readonly [scalarBrand]: "literal";
  readonly value: string;
}
interface PdfHex {
  readonly [scalarBrand]: "hex";
  readonly value: string;
}
export type PdfScalar = PdfName | PdfLiteral | PdfHex;
export const name = (value: string): PdfName => ({ [scalarBrand]: "name", value });
export const literal = (value: string): PdfLiteral => ({ [scalarBrand]: "literal", value });
export const hex = (value: string): PdfHex => ({ [scalarBrand]: "hex", value });
export const isScalar = (input: object): input is PdfScalar => scalarBrand in input;

export function decimal(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Nonfinite internal PDF number");
  const raw = String(value);
  if (!/[eE]/.test(raw)) return raw;
  const sign = value < 0 ? "-" : "";
  const [coefficient, exponent] = raw.replace(/^-/, "").split("e");
  if (coefficient === undefined) throw new Error("Invalid internal PDF number");
  const [whole = "", fraction = ""] = coefficient.split(".");
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `${sign}0.${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return sign + digits + "0".repeat(point - digits.length);
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

export function value(typed: PdfScalar): string {
  if (typeof typed.value !== "string") throw new Error("Invalid internal PDF value");
  if (typed[scalarBrand] === "name") {
    if (/[\u0100-\uffff]/.test(typed.value)) throw new Error("Expected PDF name bytes");
    return `/${Array.from(typed.value, (char) => {
      const byte = char.charCodeAt(0);
      return byte >= 33 && byte <= 126 && !"()<>[]{}/%#".includes(String.fromCharCode(byte))
        ? String.fromCharCode(byte)
        : `#${byte.toString(16).padStart(2, "0").toUpperCase()}`;
    }).join("")}`;
  }
  if (typed[scalarBrand] === "hex") {
    if (!/^(?:[a-fA-F0-9]{2})*$/.test(typed.value)) throw new Error("Invalid internal PDF hex string");
    return `<${typed.value}>`;
  }
  if (typed[scalarBrand] !== "literal") throw new Error("Invalid internal PDF value");
  if (/[\u0100-\uffff]/.test(typed.value)) throw new Error("Expected PDF literal bytes");
  // biome-ignore lint/suspicious/noControlCharactersInRegex: PDF literals must escape control bytes.
  const escaped = typed.value.replace(/[()\\\x00-\x1f\x7f]/g, (char) => {
    if ("()\\".includes(char)) return `\\${char}`;
    return `\\${char.charCodeAt(0).toString(8).padStart(3, "0")}`;
  });
  return `(${escaped})`;
}
