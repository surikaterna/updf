import type { MenuFormData } from "./menu-form.js";

/** Portable host snapshot and host-owned menu/actions; no Formbar runtime claim. */
export const menuFormFixture: MenuFormData = {
  menu: ["Profile", "Settings", "Exit"],
  buttons: ["[Save]", "[Back]"],
  snapshot: {
    tree: {
      key: "root",
      nodeId: "root",
      type: "group",
      children: [
        { key: "name", nodeId: "name", type: "field", label: "Name" },
        { key: "email", nodeId: "email", type: "field", label: "Email" },
      ],
    },
    controls: [
      { key: "name", nodeId: "name", type: "field", rendererId: "text", visible: true, value: "Ada Lovelace" },
      { key: "email", nodeId: "email", type: "field", rendererId: "text", visible: true, value: "ada@example.test" },
    ],
    outputs: [],
  },
};
