import assert from "node:assert/strict";

/** Emitted closure checks also apply to unshaken CJS loads, not just ESM bundles. */
export function textFlowEntryGraph(profile: string, paths: readonly string[]) {
  const optional = profile.startsWith("textFlow");
  const path = profile === "textFlowPath";
  const siblings = path || profile === "textFlowSiblings";
  const atomic = optional && !siblings;
  const has = (pattern: RegExp) => paths.some((p) => pattern.test(p));
  assert.equal(has(/text-flow\/dist\//u), optional, `${profile}: addon`);
  assert.equal(has(/text-flow\/dist\/(?:cjs\/)?atomic\.js$/u), atomic, `${profile}: atomic entry`);
  assert.equal(has(/text-flow\/dist\/(?:cjs\/)?sibling\.js$/u), siblings, `${profile}: sibling owner`);
  assert.equal(has(/text-flow\/dist\/(?:cjs\/)?path-band\.js$/u), path, `${profile}: path policy`);
  assert.equal(has(/geometry\/dist\/(?:cjs\/)?normalize\.js$/u), path, `${profile}: parser`);
  assert.equal(has(/text\/dist\/(?:cjs\/)?composition-plan\.js$/u), atomic, `${profile}: atomic planner`);
  assert.equal(has(/text\/dist\/(?:cjs\/)?composition-profile\.js$/u), atomic, `${profile}: atomic profile`);
  assert.equal(has(/text\/dist\/(?:cjs\/)?composition-band\.js$/u), atomic, `${profile}: atomic band`);
  assert.equal(has(/text\/dist\/(?:cjs\/)?selection\.js$/u), siblings, `${profile}: selection entry`);
  assert.equal(has(/text\/dist\/(?:cjs\/)?profile-interpolation\.js$/u), atomic || path, `${profile}: interpolation`);
  if (optional) assert.ok(!has(/(?:svg|jpeg|png|fontkit|fontkite)\/dist\//u), "Unrequested feature");
  assert.ok(!has(/packages\/[^/]+\/src\//u), "Source alias bypass");
}
