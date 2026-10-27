import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import {
  definePreparationResource,
  definePreparationService,
  layoutPrepared,
  prepareDocument,
  readPreparationService,
  type PreparationContext,
} from "@updf/layout/internal-preparation";
import { authored, owned } from "./preparation-fixture.js";

const inactive = async () => assert.fail("No resource request is expected");
const descriptor = (identity = Object.freeze({})) => ({
  identity,
  capture: () => undefined,
  resolve: inactive,
  replace: () => assert.fail("No replacement is expected"),
});

test("preparation service identities reject forged or copied handles without calling their properties", async () => {
  const service = definePreparationService<string>();
  let saved!: PreparationContext;
  const feature = definePreparationResource({
    ...descriptor(),
    service,
    session(context) {
      saved = context;
      assert.throws(() => readPreparationService(context, { ...service }, "/test"), DocumentError);
      return { resolve: inactive, close() {}, service: "installed" };
    },
  });
  layoutPrepared(await prepareDocument(authored([]), { extensions: [feature] }));
  assert.throws(() => readPreparationService(saved, service, "/test"), DocumentError);
  assert.throws(() => definePreparationResource({ ...descriptor(), service: {} as never }), DocumentError);
});

test("duplicate selected service identities reject before starting any session", async () => {
  const service = definePreparationService<string>();
  let started = 0;
  const selected = () =>
    definePreparationResource({
      ...descriptor(),
      service,
      session() {
        started++;
        return { resolve: inactive, close() {}, service: "installed" };
      },
    });
  await assert.rejects(prepareDocument(authored([]), { extensions: [selected(), selected()] }), DocumentError);
  assert.equal(started, 0);
});

test("startup failure closes initialized sessions exactly once and revokes retained contexts", async () => {
  const service = definePreparationService<string>();
  let closed = 0;
  let saved!: PreparationContext;
  const first = definePreparationResource({
    ...descriptor(),
    service,
    session(context) {
      saved = context;
      return { resolve: inactive, service: "installed", close: () => closed++ };
    },
  });
  const unexpected = new Error("startup failure");
  const second = definePreparationResource({
    ...descriptor(),
    session: () => {
      throw unexpected;
    },
  });
  await assert.rejects(prepareDocument(authored([]), { extensions: [first, second] }), (error) => error === unexpected);
  assert.equal(closed, 1);
  assert.throws(() => readPreparationService(saved, service, "/test"), DocumentError);
  assert.throws(() => saved.retain(owned(), "/test"), DocumentError);
});

test("retain validates owned handles and source paths through the suspended stage writer", async () => {
  const resource = owned();
  const feature = definePreparationResource({
    ...descriptor(),
    session(context) {
      assert.throws(() => context.retain({} as never, "/test"), DocumentError);
      assert.throws(() => context.retain(resource, "relative"), DocumentError);
      assert.equal(context.retain(resource, "/test"), "Prepared1");
      assert.equal(context.retain(resource, "/test-again"), "Prepared1");
      return { resolve: inactive, close() {} };
    },
  });
  const output = layoutPrepared(
    await prepareDocument(authored([]), { resources: { Prepared0: owned() }, extensions: [feature] }),
  );
  assert.equal(output.options.resources.Prepared1, resource);
});
