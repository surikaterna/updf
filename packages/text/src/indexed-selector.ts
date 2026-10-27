import { fail } from "@updf/core/internal";
import { sourceCursor, sourceIndex } from "./source-index.js";
import type { lineSelector } from "./wrap-selector.js";

/** Optional source coordinates bind to the one wrapping policy, never ordinary instances. */
class IndexedSelector {
  constructor(
    private readonly selector: ReturnType<typeof lineSelector>,
    private readonly prefix: readonly number[],
    private readonly path: string,
    private readonly charge: (amount: number) => void,
  ) {}
  next(width: number) {
    return this.selector.next(width);
  }
  get done() {
    return this.selector.done;
  }
  position() {
    return Object.freeze({
      offset: this.prefix[this.selector.index]! + this.selector.offset,
      extent: this.prefix.at(-1)!,
    });
  }
  resume(offset: number): IndexedSelector {
    const cursor = sourceCursor(this.prefix, offset, this.path, this.charge);
    const unit = this.selector.source[cursor.index];
    if (cursor.offset && (this.selector.paragraph.breakLongWords !== "codePoint" || unit?.atoms[0]?.atomic))
      fail("TYPE", this.path, "Inline offset splits an indivisible token");
    const copy = this.selector.fork();
    copy.index = cursor.index;
    copy.offset = cursor.offset;
    copy.cached = undefined;
    return new IndexedSelector(copy, this.prefix, this.path, this.charge);
  }
  fork(): IndexedSelector {
    return new IndexedSelector(this.selector.fork(), this.prefix, this.path, this.charge);
  }
}
export function indexedSelector(
  selector: ReturnType<typeof lineSelector>,
  path: string,
  charge: (amount: number) => void,
) {
  return new IndexedSelector(
    selector,
    sourceIndex(
      selector.source.map((unit) => unit?.atoms.length ?? 1),
      charge,
      path,
    ),
    path,
    charge,
  );
}
