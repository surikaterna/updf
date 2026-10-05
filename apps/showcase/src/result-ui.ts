import { metadata } from "./demo-metadata.js";
import type { DemoId } from "./demos.js";

export function ui(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing UI element: ${id}`);
  return found;
}

export function showMetadata(id: DemoId): void {
  const demo = metadata[id];
  ui("active-demo").textContent = demo.title;
  ui("demo-purpose").textContent = demo.purpose;
  ui("demo-badges").replaceChildren(
    ...demo.badges.map((label) => {
      const badge = document.createElement("span");
      badge.textContent = label;
      return badge;
    }),
  );
}

export function pending(hasResult: boolean): void {
  ui("result-state").textContent = hasResult
    ? "Updating… Previous PDF remains shown and linked until the update completes."
    : "Generating your document… The preview will appear here.";
  ui("source-state").textContent = hasResult
    ? "Previous result source and arguments while the update is pending."
    : "Waiting for the first successful result; no executed source yet.";
}

export function commitSource(id: DemoId, source: string, args: unknown[], summary: string): void {
  ui("source").textContent = source;
  ui("source-files").textContent = `Source files: ${metadata[id].files}`;
  ui("source-arguments").textContent = JSON.stringify(
    { demo: id, title: args[1], controls: args.slice(2).find((value) => value !== undefined) ?? {} },
    null,
    2,
  );
  ui("source-state").textContent = `Source and arguments for the downloaded result: ${metadata[id].title}.`;
  ui("result-state").textContent = `Current result · ${metadata[id].title}`;
  ui("output-summary").textContent = summary;
  ui("output-summary").hidden = false;
}

export function failed(message: string, hasResult: boolean): void {
  ui("status").textContent = `${message}${hasResult ? " Previous PDF remains shown and linked." : ""}`;
  ui("result-state").textContent = hasResult
    ? "Previous result · Latest inputs could not be generated. Download and source still refer to the previous PDF."
    : "No PDF generated. Adjust the inputs or choose another example.";
  ui("source-state").textContent = hasResult
    ? "Previous result source and arguments; these do not match the unsuccessful inputs."
    : "No successful result; no executed source to display.";
}

export function validateForm(form: HTMLFormElement): void {
  const error = ui("input-error");
  error.hidden = true;
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"));
  for (const field of fields) {
    field.removeAttribute("aria-invalid");
    describeError(field, false);
    if (field.id === "title")
      field.setCustomValidity(field.value.length > 40 ? "Title must be at most 40 characters" : "");
  }
  for (const field of fields) {
    if (field.disabled || field.closest("fieldset")?.disabled || field.validity.valid) continue;
    field.setAttribute("aria-invalid", "true");
    describeError(field, true);
    error.hidden = false;
    error.textContent = `${field.labels?.[0]?.textContent ?? field.name}: ${field.validationMessage}`;
    throw new Error(error.textContent);
  }
}

export function titleError(message: string): void {
  ui("title").setAttribute("aria-invalid", "true");
  describeError(ui("title"), true);
  ui("input-error").textContent = message;
  ui("input-error").hidden = false;
}

function describeError(field: HTMLElement, invalid: boolean): void {
  const descriptions = (field.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter((id) => id && id !== "input-error");
  if (invalid) descriptions.push("input-error");
  if (descriptions.length) field.setAttribute("aria-describedby", descriptions.join(" "));
  else field.removeAttribute("aria-describedby");
}
