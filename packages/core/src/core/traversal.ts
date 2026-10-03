/** Preorder traversal with heap frames rather than the JavaScript call stack. */
export function* descendants<T>(roots: readonly T[], children: (node: T) => readonly T[]): Generator<T> {
  const stack = [{ nodes: roots, index: 0 }];
  while (stack.length) {
    const frame = stack.at(-1);
    if (!frame) break;
    if (frame.index === frame.nodes.length) {
      stack.pop();
      continue;
    }
    const node = frame.nodes[frame.index++];
    if (node === undefined) continue;
    yield node;
    const nested = children(node);
    if (nested.length) stack.push({ nodes: nested, index: 0 });
  }
}
