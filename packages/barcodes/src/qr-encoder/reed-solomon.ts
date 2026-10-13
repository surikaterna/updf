/** GF(256), primitive polynomial x^8+x^4+x^3+x^2+1; all operations are exact integers. */
export function multiply(left: number, right: number): number {
  let result = 0;
  for (let bit = 0; bit < 8; bit++) {
    if (right & 1) result ^= left;
    right >>>= 1;
    left = (left << 1) ^ (left & 128 ? 0x11d : 0);
  }
  return result;
}

export function generator(degree: number): Uint8Array {
  let polynomial = new Uint8Array([1]);
  let root = 1;
  for (let power = 0; power < degree; power++) {
    const next = new Uint8Array(polynomial.length + 1);
    for (let i = 0; i < polynomial.length; i++) {
      next[i] = next[i]! ^ polynomial[i]!;
      next[i + 1] = next[i + 1]! ^ multiply(polynomial[i]!, root);
    }
    polynomial = next;
    root = multiply(root, 2);
  }
  return polynomial;
}

export function remainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const degree = divisor.length - 1;
  const work = new Uint8Array(data.length + degree);
  work.set(data);
  for (let i = 0; i < data.length; i++) {
    const coefficient = work[i]!;
    for (let j = 0; j <= degree; j++) work[i + j] = work[i + j]! ^ multiply(coefficient, divisor[j]!);
  }
  return work.slice(data.length);
}
