import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { MetricSum } from "@updf/layout-boxes/arithmetic";
import { block, document, fixed, flow, pageSize } from "@updf/layout";
import { layout } from "../../../tests/fixtures/text-options.js";
import { Paginator } from "../dist/cjs/paginator.js";
import { template } from "../dist/cjs/template.js";
import { flow as fixture } from "./fixtures.js";

function authored(height = 0.05, first = 0.02, last = 0.01) {
  return document({
    children: flow({
      pageSize: pageSize(100, height),
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: [
        fixed({ height: first, children: [] }),
        block({
          keepTogether: true,
          style: { height: last, marginTop: "auto" },
          children: [],
        }),
      ],
    }),
  });
}

function observeReservations(paginator: Paginator, cursors: number[]): void {
  const session = Reflect.get(paginator, "session");
  const reserve = session.reservePage;
  session.reservePage = (source: string) => {
    cursors.push(Reflect.get(paginator, "cursor"));
    reserve(source);
  };
}

function currentPaginator(live: Paginator | undefined): Paginator {
  assert.ok(live);
  return live;
}
function observe(throwPaint?: Error) {
  const consume = Paginator.prototype.consume;
  const cursors: number[] = [],
    paints: number[] = [],
    candidates: number[] = [];
  const owner = {};
  let live: Paginator | undefined;
  Paginator.prototype.consume = function (item, index, path) {
    live = this;
    const paginator = this;
    if (index !== 1) return consume.call(this, item, index, path);
    observeReservations(this, cursors);
    const { fragmentSteps: _fragmentSteps, ...direct } = item;
    return consume.call(
      this,
      {
        ...direct,
        fragment(request) {
          assert.equal(request.state?.get(owner, 0), undefined);
          request.state?.set(owner, 0, 1n);
          const fragment = item.fragment(request);
          if (!fragment) return fragment;
          return {
            ...fragment,
            *paintSteps(context) {
              paints.push(Reflect.get(paginator, "cursor"));
              candidates.push(context.y);
              if (throwPaint) throw throwPaint;
              if (fragment.paintSteps) return yield* fragment.paintSteps(context);
              return fragment.paint(context);
            },
          };
        },
      },
      index,
      path,
    );
  };
  return {
    cursors,
    paints,
    candidates,
    current: () => currentPaginator(live),
    close: () => {
      Paginator.prototype.consume = consume;
    },
  };
}

test("M1 public auto margin refusal preserves committed cursor through page quota failure", () => {
  const seen = observe();
  try {
    assert.throws(
      () => layout(authored(), { limits: { pages: 1 } }),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
    assert.deepEqual(seen.cursors, [0.02]);
    assert.equal(Reflect.get(seen.current(), "cursor"), 0.02);
    assert.deepEqual(seen.paints, []);
    assert.equal(seen.current()?.placements.length, 1);
    assert.equal(seen.current()?.pages.length, 1);
  } finally {
    seen.close();
  }
});

test("M1 public retry recalculates fresh margin but commits position only after accepted paint", () => {
  const seen = observe();
  try {
    const result = layout(authored());
    assert.deepEqual(seen.cursors, [0.02]);
    assert.deepEqual(seen.paints, [0]);
    assert.deepEqual(seen.candidates, [0.04]);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(
      result.placements.map((p) => [p.pageIndex, p.box.y, p.box.height]),
      [
        [0, 0, 0.02],
        [1, 0.04, 0.01],
      ],
    );
    for (const { box } of result.placements) assert.ok(box.y >= 0 && box.y + box.height <= 0.05);
  } finally {
    seen.close();
  }
});

test("M1 accepted margin remains tentative when paint throws without postpaint retry", () => {
  const sentinel = new Error("paint failed");
  const seen = observe(sentinel);
  try {
    assert.throws(
      () => layout(authored(1, 0.25, 0.25)),
      (error) => error === sentinel,
    );
    assert.deepEqual(seen.paints, [0.25]);
    assert.deepEqual(seen.candidates, [0.75]);
    assert.equal(Reflect.get(seen.current(), "cursor"), seen.paints[0]);
    assert.deepEqual(seen.cursors, []);
    assert.equal(seen.current()?.placements.length, 1);
  } finally {
    seen.close();
  }
});

test("M1 zero-margin admission forks the live accumulator without add(0)", () => {
  const source = ts.createSourceFile(
    "paginator.ts",
    readFileSync(new URL("../src/paginator.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const owner = source.statements.find(ts.isClassDeclaration);
  const method = owner?.members.find((node) => node.name?.getText(source) === "fragmentStart");
  assert.ok(method);
  const body = method.getText(source);
  assert.match(body, /const tentative = this.position.fork\(\);/);
  assert.match(body, /if \(margin !== 0\) tentative.add\(margin\);/);
  assert.doesNotMatch(body, /new MetricSum|sum\(/);
});

test("M1 native candidate preserves hidden compensation instead of summing the collapsed cursor", () => {
  const operation = createDrawingLayoutOperation({});
  try {
    const paginator = new Paginator(template(fixture([], { height: 1 }).pageTemplate, operation), operation.policy);
    const position = new MetricSum();
    position.add(0.1);
    position.add(0.2);
    Reflect.set(paginator, "position", position);
    const candidate = Reflect.apply(Reflect.get(paginator, "fragmentStart"), paginator, [0.4, 0.3, "/candidate"]);
    assert.ok(candidate && typeof candidate === "object");
    assert.equal(Reflect.get(candidate, "y"), 0.6);
    assert.equal(Reflect.get(candidate, "tentative").value, 0.6);
    assert.equal(Reflect.get(paginator, "cursor"), position.value);
    assert.equal(position.value, 0.30000000000000004);
  } finally {
    operation.close();
  }
});
