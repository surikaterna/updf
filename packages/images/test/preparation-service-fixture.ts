import { createOperationCapability, defineOperationExtension, fail, semanticComponent } from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";
import { createExtensions, defineBlockAdapter, extension } from "@updf/layout";
import { attachPreparationResource, type PreparationContext } from "@updf/layout/internal-preparation";

/** An unused metadata resource exercises the service without inventing another image painter. */
export function serviceFixture(run: (context: PreparationContext, path: string) => Promise<OwnedResource>) {
  const identity = Object.freeze({});
  const Leaf = semanticComponent<Record<string, never>>(identity, true);
  const adapter = defineBlockAdapter({
    name: "PreparationServiceTest",
    validate: () => ({}),
    measure: (_props, context) => ({
      fragmentation: "atomic" as const,
      extent: 1,
      naturalSize: { width: context.width, height: 1 },
      next: () => ({ end: 1, height: 1, nodes: [] }),
    }),
  });
  const contribution = attachPreparationResource(createExtensions([adapter]), {
    identity,
    capture: (_props, path) => `${path}/mask`,
    resolve: async () => fail("PHASE", "/test", "Expected preparation session"),
    replace: () => extension(adapter, {}),
    session: (context) => ({ resolve: (path: string) => run(context, path), close() {} }),
  });
  const feature = defineOperationExtension(
    {},
    createOperationCapability(() => () => null),
    contribution,
  );
  return { Leaf, feature };
}
