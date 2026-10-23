import { array, fail, finite, number, validateDataObject } from "@updf/core/internal";
import type { EdgeProfileExclusion, EdgeProfilePoint } from "./composition-types.js";
import { validateExcludedLine, type SelectionBand } from "./exclusion.js";
import { profileDepth } from "./profile-interpolation.js";
import type { TextLineMeasurement } from "./types.js";

export type ProfileCharge = (amount: number, path: string) => void;
export interface ProfileExclusion extends EdgeProfileExclusion {
  readonly top: number;
  readonly bottom: number;
}
export function profileExclusion(
  input: EdgeProfileExclusion,
  width: number,
  path: string,
  charge: ProfileCharge | undefined,
): ProfileExclusion {
  if (!charge) fail("MEASUREMENT_CONTEXT", path, "Profile exclusion requires composition accounting");
  charge(1, path);
  validateDataObject(input, ["shape", "side", "top", "points"], path);
  if (input.side !== "left" && input.side !== "right") fail("VALUE", `${path}/side`, "Expected left or right");
  const top = input.top === undefined ? 0 : number(input.top, `${path}/top`);
  charge(Array.isArray(input.points) ? input.points.length : 1, `${path}/points`);
  array(input.points, Number.MAX_SAFE_INTEGER, `${path}/points`);
  if (input.points.length < 2) fail("GEOMETRY", path, "Expected at least two profile points");
  const points: EdgeProfilePoint[] = [];
  let previous = -1,
    local = -1;
  input.points.forEach((point, i) => {
    const at = `${path}/points/${i}`;
    charge(1, at);
    validateDataObject(point, ["x", "y"], at);
    const x = number(point.x, `${at}/x`, true),
      y = number(point.y, `${at}/y`);
    if (x > width) fail("GEOMETRY", `${at}/x`, "Profile depth exceeds frame width");
    if ((i === 0 && y !== 0) || y <= local)
      fail("GEOMETRY", `${at}/y`, "Profile heights must start at zero and strictly increase");
    const absolute = finite(top + y, at);
    if (absolute <= previous) fail("GEOMETRY", at, "Translated profile heights must strictly increase");
    points.push({ x, y: absolute });
    local = y;
    previous = absolute;
  });
  return { shape: "edge-profile", side: input.side, top, bottom: previous, points };
}
export function profileInterval(
  profile: ProfileExclusion,
  width: number,
  top: number,
  band: SelectionBand,
  path: string,
  charge: ProfileCharge,
) {
  charge(1, path);
  const [low, high] =
    typeof band === "function" ? band(top) : [finite(top + band[0], path), finite(top + band[1], path)];
  const active = high > profile.top && low < profile.bottom;
  let depth = 0;
  if (active)
    for (let i = 1; i < profile.points.length; i++) {
      charge(1, path);
      const a = profile.points[i - 1]!,
        b = profile.points[i]!;
      if (b.y < low || a.y > high) continue;
      depth = Math.max(depth, profileDepth(a, b, Math.max(a.y, low)), profileDepth(a, b, Math.min(b.y, high)));
    }
  return { active, origin: profile.side === "left" ? depth : 0, width: finite(width - depth, path), depth };
}
export function validateProfileLine(
  line: TextLineMeasurement,
  profile: ProfileExclusion,
  width: number,
  path: string,
  charge: ProfileCharge,
): void {
  charge(line.fragments.length + 1, path);
  const ink = line.inkBounds;
  const low = ink.empty ? line.top : Math.min(line.top, ink.top);
  const high = ink.empty
    ? finite(line.top + line.height, path)
    : Math.max(finite(line.top + line.height, path), ink.bottom);
  const region = profileInterval(profile, width, 0, [low, high], path, charge);
  validateExcludedLine(
    line,
    {
      shape: "rect",
      side: profile.side,
      top: profile.top,
      bottom: profile.bottom,
      width: region.depth,
      height: profile.bottom - profile.top,
    },
    width,
    path,
  );
}
