export interface ProofNode {
  readonly key: string;
  readonly nodeId: string;
  readonly type: string;
  readonly label?: string;
  readonly children?: readonly ProofNode[];
  readonly items?: unknown;
  readonly rows?: unknown;
  readonly action?: unknown;
  readonly presentation?: unknown;
  readonly title?: unknown;
  readonly description?: unknown;
}
export interface ProofSnapshot {
  readonly tree: ProofNode;
  readonly controls: readonly {
    key: string;
    nodeId: string;
    type: string;
    rendererId: string;
    visible: boolean;
    value?: unknown;
  }[];
  readonly outputs: readonly { key: string; nodeId: string; value: unknown; format: unknown }[];
}
export interface Row {
  readonly source: ProofNode;
  readonly texts: readonly string[];
  readonly id: string;
}

export function ascii(value: unknown): string {
  if (typeof value !== "string" || value.length > 8192 || /[^\x20-\x7e\n]/u.test(value))
    throw new Error("Bounded ASCII printable + LF required");
  return value;
}
export function windowSize(width: number, height: number) {
  if (!Number.isInteger(width) || width < 24 || width > 160) throw new Error("Width must be integer 24..160");
  if (!Number.isInteger(height) || height < 1 || height > 80) throw new Error("Height must be integer 1..80");
  if (width * height > 12800) throw new Error("Cell budget exceeded");
}

function textRow(node: ProofNode, snapshot: ProofSnapshot): Row {
  if (node.type === "field") {
    const control = snapshot.controls.find((entry) => entry.key === node.key);
    if (!control || control.type !== "field" || control.rendererId !== "text" || !control.visible)
      throw new Error("Unsupported/missing text control");
    return { source: node, id: node.nodeId, texts: [ascii(node.label ?? ""), ascii(control.value)] };
  }
  const output = snapshot.outputs.find((entry) => entry.key === node.key);
  if (!output || output.format !== "plain") throw new Error("Unsupported/missing plain output");
  return { source: node, id: node.nodeId, texts: [ascii(output.value)] };
}

function container(node: ProofNode): boolean {
  if (!["group", "conditional", "field", "output"].includes(node.type)) throw new Error("Unsupported node kind");
  const unsupported = [node.items, node.rows, node.action, node.presentation, node.title, node.description];
  if (unsupported.some((value) => value !== undefined)) throw new Error("Unsupported node presentation");
  if (node.type === "field") return false;
  if (node.label !== undefined) throw new Error("Only field labels supported");
  return node.type !== "output";
}

export function rows(snapshot: ProofSnapshot, footer: string): readonly Row[] {
  if (snapshot.controls.length > 64 || snapshot.outputs.length > 64) throw new Error("Entry budget exceeded");
  let count = 0;
  let chars = ascii(footer).length;
  const result: Row[] = [];
  const keys = new Set<string>();
  const walk = (node: ProofNode, depth: number) => {
    if (++count > 64 || depth > 8) throw new Error("Node/depth budget exceeded");
    if (keys.has(node.key)) throw new Error("Duplicate node key");
    keys.add(node.key);
    if (container(node)) {
      for (const child of node.children ?? []) walk(child, depth + 1);
      return;
    }
    if (node.children?.length) throw new Error("Leaf children unsupported");
    const row = textRow(node, snapshot);
    chars += row.texts.reduce((sum, text) => sum + text.length, 0);
    if (chars > 8192) throw new Error("Character budget exceeded");
    result.push(row);
  };
  if (chars > 8192) throw new Error("Character budget exceeded");
  walk(snapshot.tree, 1);
  return Object.freeze(result);
}
