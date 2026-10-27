import { createOperationCapability, fail } from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";

export const imagesFeature: object = Object.freeze({});
type Charge = (count: number, path: string) => void;
export interface ImageBinding {
  readonly resolve: (source: OwnedResource, charge: Charge) => string;
}

export const imageCapability = createOperationCapability<ImageBinding>((scope) => {
  let names: Map<OwnedResource, string> | undefined;
  return (origin, check) =>
    Object.freeze({
      resolve(source: OwnedResource, charge: Charge): string {
        check();
        charge(1, "/src");
        if (!names) {
          const pending = new Map<OwnedResource, string>();
          for (const [name, resource] of scope.bindings) {
            charge(1, "/src/bindings");
            if (!pending.has(resource)) pending.set(resource, name);
          }
          names = pending;
        }
        const name = names.get(source);
        if (name === undefined)
          fail("FONT_RESOURCE", `${origin.path}/src`, "Prepared Image src is not bound in resources");
        return name;
      },
    });
});
