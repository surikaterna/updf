const names = ["fullname", "company", "showExtra"];
const ref = (name) => ({ namespace: "data", segments: [name] });

export const source = `<Form id="terminal-proof" defaultLanguage="Kalada">
  <Field id="fullname" widget="text" label="Full name" value={fullname}/>
  <Field id="company" widget="text" label="Company" value={company}/>
  <Output id="description" value={"A static form proof with deterministic wrapping and shared width allocation."}/>
  <Conditional id="extra" condition={showExtra}>
    <Output id="extra-message" value={"Extra details are visible."}/>
  </Conditional>
</Form>`;

export const example = {
  id: "terminal-proof",
  source,
  schema: {
    type: "object",
    additionalProperties: false,
    required: names,
    properties: { fullname: { type: "string" }, company: { type: "string" }, showExtra: { type: "boolean" } },
  },
  paths: names.map((name) => ({ path: [name], kind: "value" })),
  bindings: {
    references: Object.fromEntries(names.map((name) => [name, { reference: ref(name), type: "dynamic" }])),
    locations: Object.fromEntries(
      names
        .slice(0, 2)
        .map((name) => [name, { target: ref(name), type: { kind: "primitive-type", name: "string" }, writable: true }]),
    ),
  },
};
