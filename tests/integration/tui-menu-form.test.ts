import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { menuForm } from "../../scripts/tui-layout-proof/menu-form.js";
import { menuFormFixture } from "../../scripts/tui-layout-proof/menu-form-fixture.js";

test("menu/form Row has fixed sidebar and natural-height flexible Column with nested Rows", () => {
  const before = JSON.stringify(menuFormFixture);
  const proof = menuForm(menuFormFixture, 32);
  assert.equal(proof.height, 5);
  assert.deepEqual(
    proof.layout.boxes.map(({ id, left, top, width, height }) => ({ id, left, top, width, height })),
    [
      { id: "root", left: 0, top: 0, width: 32, height: 5 },
      { id: "menu", left: 0, top: 0, width: 8, height: 3 },
      { id: "menu:0", left: 0, top: 0, width: 8, height: 1 },
      { id: "menu:1", left: 0, top: 1, width: 8, height: 1 },
      { id: "menu:2", left: 0, top: 2, width: 8, height: 1 },
      { id: "form", left: 10, top: 0, width: 22, height: 5 },
      { id: "field:name", left: 0, top: 0, width: 22, height: 1 },
      { id: "field:name:0", left: 0, top: 0, width: 5, height: 1 },
      { id: "field:name:1", left: 6, top: 0, width: 16, height: 1 },
      { id: "field:email", left: 0, top: 2, width: 22, height: 1 },
      { id: "field:email:0", left: 0, top: 0, width: 5, height: 1 },
      { id: "field:email:1", left: 6, top: 0, width: 16, height: 1 },
      { id: "buttons", left: 0, top: 4, width: 22, height: 1 },
      { id: "button:0", left: 0, top: 0, width: 10.5, height: 1 },
      { id: "button:1", left: 11.5, top: 0, width: 10.5, height: 1 },
    ],
  );
  assert.equal(
    proof.body,
    ["Profile   Name  Ada Lovelace", "Settings", "Exit      Email ada@example.test", "", "          [Save]     [Back]"]
      .map((line) => line.padEnd(32))
      .join("\n"),
  );
  assert.equal(JSON.stringify(menuFormFixture), before);
  assert.deepEqual(menuForm(menuFormFixture, 32), proof);
});

test("narrow cells remeasure natural heights and floor absolute dyadic edges, never rounded widths", () => {
  const proof = menuForm(menuFormFixture, 24);
  assert.equal(proof.height, 7);
  assert.deepEqual(
    proof.boxes.map(({ id, x, y, width, lines }) => [id, x, y, width, lines.length]),
    [
      ["menu:0", 0, 0, 8, 1],
      ["menu:1", 0, 1, 8, 1],
      ["menu:2", 0, 2, 8, 1],
      ["field:name:0", 10, 0, 5, 1],
      ["field:name:1", 16, 0, 8, 2],
      ["field:email:0", 10, 3, 5, 1],
      ["field:email:1", 16, 3, 8, 2],
      ["button:0", 10, 6, 6, 1],
      ["button:1", 17, 6, 7, 1],
    ],
  );
  assert.equal(
    proof.body,
    [
      "Profile   Name  Ada ",
      "Settings        Lovelace",
      "Exit",
      "          Email ada@exam",
      "                ple.test",
      "",
      "          [Save] [Back]",
    ]
      .map((line) => line.padEnd(24))
      .join("\n"),
  );
  assert.throws(() => menuForm(menuFormFixture, 24, 6), /overflow/);
  assert.throws(() => menuForm(menuFormFixture, 23), /Width/);
  assert.throws(() => menuForm({ ...menuFormFixture, buttons: ["one", "two", "three"] }, 24));
  assert.throws(() => menuForm({ ...menuFormFixture, menu: ["\x1b[31m"] }, 32), /ASCII/);
});

test("portable menu/form host graph contains only kernel and terminal helpers, no document/PDF/font machinery", async () => {
  const result = await build({
    entryPoints: ["scripts/tui-layout-proof/menu-form-cli.ts"],
    bundle: true,
    write: false,
    metafile: true,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "kernel-source",
        setup(builder) {
          builder.onResolve({ filter: /^@updf\/layout-boxes\// }, ({ path }) => ({
            path: `${process.cwd()}/packages/layout-boxes/src/${path.split("/")[2]}.ts`,
          }));
        },
      },
    ],
  });
  const inputs = Object.keys(result.metafile.inputs);
  assert.ok(inputs.some((path) => path.endsWith("layout-boxes/src/boxes.ts")));
  assert.ok(inputs.some((path) => path.endsWith("menu-form.ts")));
  assert.ok(
    inputs.every((path) => /^(packages\/layout-boxes\/src\/|scripts\/tui-layout-proof\/)/u.test(path)),
    inputs.join("\n"),
  );
  assert.ok(inputs.every((path) => !/(packages\/(layout|core|fonts|fontkit|text)\/|pdf)/u.test(path)));
});
