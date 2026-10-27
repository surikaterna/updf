import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import {
  createLayoutOperation,
  createOperationCapability,
  defineOperationExtension,
  useOperationExtension,
} from "@updf/core/internal";
import { useOperationCapability } from "@updf/core/resources";
import type { OperationExtension } from "@updf/core/resources";

function descriptor(initialize: Parameters<typeof createOperationCapability>[0], feature = {}) {
  const capability = createOperationCapability(initialize);
  return { capability, extension: defineOperationExtension(feature, capability, Object.freeze({})) };
}
test("extensions capture dense owned descriptors synchronously, including duplicate feature identities", () => {
  const feature = {};
  const a = descriptor(() => () => 1, feature),
    b = descriptor(() => () => 2, feature);
  let getters = 0;
  const getter = Object.defineProperty([], "0", {
    enumerable: true,
    get() {
      getters++;
      return a.extension;
    },
  });
  for (const extensions of [
    undefined,
    {},
    [undefined],
    [{}],
    [{ ...a.extension }],
    [a.extension, a.extension],
    [a.extension, b.extension],
    new Array(1),
    getter,
  ]) {
    assert.throws(() => createLayoutOperation({ extensions } as never), DocumentError);
  }
  assert.equal(getters, 0);
  const options = Object.defineProperty({}, "extensions", {
    enumerable: true,
    get() {
      getters++;
      return [];
    },
  });
  assert.throws(() => createLayoutOperation(options), DocumentError);
  assert.equal(getters, 0);
});
test("selected collections are lazy, captured once, distinct per operation, and separate from the legacy slot", () => {
  let initialized = 0;
  const a = descriptor((scope) => {
    initialized++;
    return (_origin, check) => () => {
      check();
      return scope;
    };
  });
  const b = descriptor(() => () => 2);
  const extensions: OperationExtension[] = [a.extension];
  const first = createLayoutOperation({ extensions, capability: b.capability });
  extensions[0] = b.extension;
  assert.equal(initialized, 0);
  assert.equal(useOperationCapability(first, b.capability), 2);
  const retained = useOperationCapability(first, a.capability) as () => object;
  const scope = retained();
  assert.equal((useOperationCapability(first, a.capability) as () => object)(), scope);
  const second = createLayoutOperation({ extensions: [a.extension] });
  assert.notEqual((useOperationCapability(second, a.capability) as () => object)(), scope);
  assert.equal(initialized, 2);
  first.close();
  assert.throws(retained, DocumentError);
  assert.doesNotThrow(useOperationCapability(second, a.capability) as () => object);
  second.close();
});
test("failed and recursive initialization cannot publish partial bindings or refund attempted work", () => {
  let attempts = 0;
  const a = descriptor(() => {
    attempts++;
    throw new Error("failed");
  });
  const operation = createLayoutOperation({ extensions: [a.extension] });
  assert.throws(() => useOperationCapability(operation, a.capability), /failed/u);
  assert.throws(() => useOperationCapability(operation, a.capability), /failed/u);
  assert.equal(attempts, 2);
  operation.close();
  let recursive: ReturnType<typeof createLayoutOperation>;
  const b = descriptor(() => {
    assert.throws(() => useOperationCapability(recursive, b.capability), /Recursive/u);
    return () => "must not publish";
  });
  recursive = createLayoutOperation({ extensions: [b.extension] });
  assert.throws(() => useOperationCapability(recursive, b.capability), /Recursive/u);
  assert.throws(() => useOperationCapability(recursive, b.capability), /Recursive/u);
  recursive.close();
});
test("a failed initialization revokes its captured scope even after a successful retry", () => {
  const retained: Array<() => void> = [];
  const a = descriptor((scope) => {
    retained.push(() => scope.check());
    if (retained.length === 1) throw new Error("first attempt");
    return () => "ready";
  });
  const operation = createLayoutOperation({ extensions: [a.extension] });
  assert.throws(() => useOperationCapability(operation, a.capability), /first attempt/u);
  assert.throws(retained[0]!, DocumentError);
  assert.equal(useOperationCapability(operation, a.capability), "ready");
  assert.throws(retained[0]!, DocumentError);
  assert.doesNotThrow(retained[1]!);
  operation.close();
  assert.throws(retained[1]!, DocumentError);
});
test("feature and exact capability lookup share initialization, retry, recursion and lifetime", () => {
  const feature = {};
  let attempts = 0;
  const a = descriptor(() => {
    if (++attempts === 1) throw new Error("retry");
    return (_origin, check) => () => {
      check();
      return attempts;
    };
  }, feature);
  const operation = createLayoutOperation({ extensions: [a.extension] });
  assert.throws(() => useOperationExtension(operation, {}), /not selected/u);
  assert.throws(() => useOperationExtension(operation, feature), /retry/u);
  const retained = useOperationExtension<() => number>(operation, feature);
  assert.equal(retained(), 2);
  assert.equal((useOperationCapability(operation, a.capability) as () => number)(), 2);
  assert.equal(attempts, 2);
  operation.close();
  assert.throws(retained, DocumentError);
  assert.throws(() => useOperationExtension(operation, feature), DocumentError);
  const recursiveFeature = {};
  let recursive: ReturnType<typeof createLayoutOperation>;
  const b = descriptor(() => {
    assert.throws(() => useOperationExtension(recursive, recursiveFeature), /Recursive/u);
    return () => 1;
  }, recursiveFeature);
  recursive = createLayoutOperation({ extensions: [b.extension] });
  assert.throws(() => useOperationCapability(recursive, b.capability), /Recursive/u);
  recursive.close();
});
