// These types are private: caller strings can only become escaped literals.
interface PdfName {
  readonly kind: "name";
  readonly value: string;
}
interface PdfLiteral {
  readonly kind: "literal";
  readonly value: string;
}
type PdfValue = PdfName | PdfLiteral;
export const name = (value: string): PdfName => ({ kind: "name", value });
export const literal = (value: string): PdfLiteral => ({ kind: "literal", value });

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

export function value(typed: PdfValue): string {
  if (typed.kind === "name") {
    if (!/^[A-Za-z][A-Za-z0-9_.+-]{0,127}$/.test(typed.value)) throw new Error("Invalid internal PDF name");
    return `/${typed.value}`;
  }
  if (typed.kind !== "literal") throw new Error("Invalid internal PDF value");
  // biome-ignore lint/suspicious/noControlCharactersInRegex: PDF literals must escape control bytes.
  const escaped = typed.value.replace(/[()\\\x00-\x1f\x7f]/g, (char) => {
    if ("()\\".includes(char)) return `\\${char}`;
    return `\\${char.charCodeAt(0).toString(8).padStart(3, "0")}`;
  });
  return `(${escaped})`;
}
