import { ledger } from "../measurement/ledger.js";
import { dataArray, dataRecord, ownDataValue } from "./data.js";
import { fail } from "./error.js";
import type { OperationOptions } from "./policy.js";
import { policy } from "./policy.js";
import type { ResourceProvider } from "./resource-types.js";
import { resolveResources } from "./text-resources.js";

/** Validate options first, then snapshot each resource binding once into an owned Map. */
export function operation(options: OperationOptions, additional: readonly string[] = [], logicalText = true) {
  const limits = policy(options, additional);
  const fonts = resolveResources(options, limits);
  const providers = ownProviders(ownDataValue(options, "providers", "/options/providers"));
  return { fonts, providers, budget: ledger(limits, logicalText) };
}

function ownProviders(value: readonly ResourceProvider[] | undefined): readonly ResourceProvider[] {
  if (value === undefined) return Object.freeze([]);
  dataArray(value, "/options/providers");
  return Object.freeze(
    value.map((provider, index) => {
      const path = `/options/providers/${index}`;
      dataRecord(provider, path);
      const slot = ownDataValue(provider, "slot", `${path}/slot`);
      if (!slot || typeof slot !== "object") fail("FONT_RESOURCE", `${path}/slot`, "Expected provider slot");
      const callbacks = Object.assign(Object.create(null), { slot });
      for (const key of ["initialize", "collectText", "collectDrawing"] as const) {
        if (!Object.hasOwn(provider, key)) continue;
        const callback = ownDataValue(provider, key, `${path}/${key}`);
        if (typeof callback !== "function") fail("FONT_RESOURCE", `${path}/${key}`, "Expected provider capability");
        Object.defineProperty(callbacks, key, { value: callback.bind(provider), enumerable: true });
      }
      return Object.freeze(callbacks);
    }),
  );
}
