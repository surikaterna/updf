import assert from "node:assert/strict";
import test from "node:test";
import { documentResources } from "../dist/cjs/core/document-resources.js";
import { PdfWriter } from "../dist/cjs/core/pdf-writer.js";
import type { MeasuredPage } from "../dist/cjs/core/plan.js";
import { type Resource, type ResourceCollection, resourceSlot } from "../dist/cjs/core/resource-types.js";
import { drawing as resolveDrawing } from "../dist/cjs/painting/read.js";

const drawing = resolveDrawing({ type: "rect", x: 0, y: 0, width: 10, height: 10 }, "");
const node = { type: "rect", x: 0, y: 0, width: 10, height: 10, painting: drawing } as const;
const page = (children = [node]): MeasuredPage => ({ width: 100, height: 100, children });
function entry(key: string, category = "Example"): Resource<string> {
  return {
    category,
    key,
    payload: key,
    phase: "content",
    reserve(writer) {
      const ref = writer.reserve();
      return { ref, define: () => writer.define(ref, { Key: key.length }) };
    },
  };
}

test("shared engine interns, binds per page, reserves provider-major and defines real writer objects", () => {
  const first = page(),
    second = page([]),
    shared = page();
  const a = resourceSlot<string>(),
    b = resourceSlot<string>();
  const visited: string[] = [];
  const providers = [a, b].map((slot, i) => ({
    slot,
    collectDrawing(site: object, collection: ResourceCollection) {
      visited.push(String(i));
      const resource = collection.intern(slot, node, () => entry(`R${i}`));
      assert.equal(
        collection.intern(slot, node, () => {
          throw new Error("duplicate");
        }),
        resource,
      );
      collection.bind(site, slot, resource);
      collection.bind(site, slot, resource);
    },
  }));
  const resources = documentResources([first, first, second, shared], providers);
  assert.deepEqual(visited, ["0", "1", "0", "1", "0", "1"]);
  assert.equal(resources.page(first).resolve(drawing, a).key, "R0");
  assert.equal(resources.page(shared).resolve(drawing, a), resources.page(first).resolve(drawing, a));
  assert.throws(() => resources.page(second).resolve(drawing, a), /Missing/);
  assert.throws(() => resources.page(page()), /Foreign/);
  assert.throws(() => resources.page(first).resolve(node, resourceSlot<string>()), /Missing/);
  const writer = new PdfWriter(10000),
    root = writer.reserve();
  writer.setRoot(root);
  const reserved = resources.open(writer);
  reserved.reserve("bootstrap");
  reserved.reserve("content");
  writer.define(root, { Resources: reserved.dictionary });
  reserved.define("bootstrap");
  reserved.define("content");
  assert.match(Buffer.from(writer.seal()).toString(), /\/R0 2 0 R \/R1 3 0 R/);
  assert.throws(() => reserved.reserve("content"), /already reserved/);
});

const dictionaryNames = ["Example", "__proto__", "constructor", "toString"];
const builtins = [Object.prototype, Object, Object.prototype.toString];

function namedResources(entries: readonly Resource<string>[]) {
  const slot = resourceSlot<string>();
  return documentResources(
    [],
    [
      {
        slot,
        initialize(collection) {
          entries.forEach((resource, i) => {
            collection.intern(slot, i, () => resource);
          });
        },
      },
    ],
  );
}

test("resource dictionaries preserve special PDF names without inherited state or builtin mutation", () => {
  const snapshots = builtins.map((builtin) => Object.getOwnPropertyDescriptors(builtin));
  const entries = dictionaryNames.flatMap((category) => dictionaryNames.map((key) => entry(key, category)));
  const writer = new PdfWriter(),
    root = writer.reserve();
  writer.setRoot(root);
  const reserved = namedResources(entries).open(writer);
  reserved.reserve("content");
  builtins.forEach((builtin, i) => {
    assert.deepEqual(Object.getOwnPropertyDescriptors(builtin), snapshots[i]);
  });
  assert.equal(Object.getPrototypeOf(reserved.dictionary), null);
  assert.deepEqual(Object.keys(reserved.dictionary), dictionaryNames);
  for (const category of dictionaryNames) {
    const dictionary = reserved.dictionary[category];
    assert.ok(dictionary);
    assert.equal(Object.getPrototypeOf(dictionary), null);
    assert.deepEqual(Object.keys(dictionary), dictionaryNames);
    for (const key of dictionaryNames) assert.ok(Object.hasOwn(dictionary, key));
  }
  writer.define(root, { Resources: reserved.dictionary });
  reserved.define("content");
  const raw = Buffer.from(writer.seal()).toString("latin1");
  dictionaryNames.forEach((category, i) => {
    const keys = dictionaryNames.map((key, j) => `/${key} ${2 + i * dictionaryNames.length + j} 0 R`);
    assert.ok(raw.includes(`/${category} << ${keys.join(" ")} >>`));
  });
  assert.equal((raw.match(/\n\d+ 0 obj\n/g) ?? []).length, entries.length + 1);
  assert.equal(new Set(Object.values(reserved.dictionary).flatMap(Object.values)).size, entries.length);
});

test("duplicate special resource keys conflict in every category", () => {
  for (const category of dictionaryNames) {
    for (const key of dictionaryNames) {
      const writer = new PdfWriter();
      const reserved = namedResources([entry(key, category), entry(key, category)]).open(writer);
      assert.throws(() => reserved.reserve("content"), /Conflicting resource key/);
    }
  }
});

test("collection rejects foreign/conflicting bindings and closes both mutation paths", () => {
  const slot = resourceSlot<string>();
  let captured: ResourceCollection | undefined;
  let bound: Resource<string> | undefined;
  documentResources(
    [page()],
    [
      {
        slot,
        collectDrawing(site, collection) {
          captured = collection;
          bound = collection.intern(slot, "first", () => entry("A"));
          collection.bind(site, slot, bound);
          assert.throws(() => collection.bind(site, slot, entry("foreign")), /Foreign/);
          const other = collection.intern(slot, "other", () => entry("B"));
          assert.throws(() => collection.bind(site, slot, other), /Conflicting/);
          assert.throws(() => collection.intern(resourceSlot<string>(), "x", () => entry("X")), /Foreign/);
        },
      },
    ],
  );
  assert.ok(captured && bound);
  const collection = captured,
    resource = bound;
  assert.throws(() => collection.intern(slot, "later", () => entry("C")), /closed/);
  assert.throws(() => collection.bind(node, slot, resource), /closed/);
});

test("resource identities and references never cross document operations", () => {
  const slot = resourceSlot<string>();
  const provider = {
    slot,
    collectDrawing(site: object, collection: ResourceCollection) {
      collection.bind(
        site,
        slot,
        collection.intern(slot, node, () => entry("A")),
      );
    },
  };
  const first = page(),
    second = page();
  const one = documentResources([first], [provider]),
    two = documentResources([second], [provider]);
  assert.notEqual(one.page(first).resolve(drawing, slot), two.page(second).resolve(drawing, slot));
  assert.throws(() => two.page(first), /Foreign/);
  assert.ok(Object.isFrozen(one) && Object.isFrozen(one.page(first)));
});
