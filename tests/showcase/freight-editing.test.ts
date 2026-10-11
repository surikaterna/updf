import assert from "node:assert/strict";
import test from "node:test";
import { freightInvoiceExample } from "../../examples/business/freight-invoice.js";
import { mockFreightInvoice } from "../../examples/business/freight-invoice-data.js";
import { freightFonts } from "../fixtures/fonts/freight-fonts.js";
import { observeUrls, pageErrors, pdf, rendered, retained, screenshot, site } from "./helpers.js";

test("freight editor updates buyer, vehicle and exact charge amounts with Node/download parity", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = pageErrors(page);
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    assert.equal(await page.locator("#freight-controls").isVisible(), false);
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice");
    await pdf(page);
    const buyer = ["Long Name Exhibition Transport Coordination Limited", "Warehouse 17, Meadow Quay, Demo City"];
    const vehicle = ["Goods: reusable exhibition display crates with refrigeration monitoring and protective handling"];
    await page.getByLabel("Buyer / billing address", { exact: true }).fill(buyer.join("\n"));
    await page.getByLabel("Vehicle / goods description", { exact: true }).fill(vehicle.join("\n"));
    const charge = page.locator(".freight-charge").first();
    await charge.getByLabel("Description", { exact: true }).fill("Edited freight handling");
    await charge.getByLabel("Net GBP", { exact: true }).fill("12.34");
    await charge.getByLabel("VAT %", { exact: true }).fill("17.50");
    const data = {
      ...mockFreightInvoice,
      buyer,
      vehicle,
      charges: [
        { label: "Edited freight handling", netPence: 1234, vatBasisPoints: 1750 },
        ...mockFreightInvoice.charges.slice(1),
      ],
    };
    assert.deepEqual(await pdf(page), freightInvoiceExample(await freightFonts(), "Hello portable PDF", data).bytes);
    await rendered(page, 1);
    assert.deepEqual(JSON.parse((await page.locator("#source-arguments").textContent())!).controls, data);
    await retained(page);
    await screenshot(page, "freight-edited");
    assert.deepEqual(errors, []);
  } finally {
    await app.close();
  }
});

test("freight invalid edits retain successful bytes/source; reset and example switches recover", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage({ viewport: { width: 320, height: 812 } });
    await observeUrls(page);
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice");
    const original = await pdf(page);
    const args = await page.locator("#source-arguments").textContent();
    assert.ok(args?.includes("MOCK-FI-046"));
    await page.locator('.freight-charge [name="net"]').first().fill("1e2");
    assert.deepEqual(await pdf(page), original);
    assert.match(await page.locator("#status").innerText(), /decimal with at most two places/);
    assert.equal(await page.locator("#source-arguments").textContent(), args);
    await page.getByLabel("Buyer / billing address", { exact: true }).fill("");
    assert.deepEqual(await pdf(page), original);
    assert.equal(await page.locator("#freight-buyer").getAttribute("aria-invalid"), "true");
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.deepEqual(await pdf(page), original);
    assert.equal(await page.locator("#freight-buyer").inputValue(), mockFreightInvoice.buyer.join("\n"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByLabel("Buyer / billing address", { exact: true }).fill("");
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    await pdf(page);
    assert.equal(await page.locator("#freight-controls").isVisible(), false);
    await retained(page);
    await screenshot(page, "freight-reset-mobile");
  } finally {
    await app.close();
  }
});

test("freight rows add/remove with enforced limits and preset reset", async () => {
  const app = await site();
  try {
    const page = await app.browser.newPage();
    await page.goto(app.url);
    await pdf(page);
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice");
    await pdf(page);
    await page.getByRole("button", { name: "Add charge", exact: true }).click();
    await pdf(page);
    assert.equal(await page.locator(".freight-charge").count(), 4);
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Remove charge", exact: true }).last().click();
    await pdf(page);
    assert.equal(await page.locator(".freight-charge").count(), 1);
    assert.equal(await page.getByRole("button", { name: "Remove charge", exact: true }).isDisabled(), true);
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice-multipage");
    await pdf(page);
    assert.equal(await page.locator(".freight-charge").count(), 20);
    assert.equal(await page.getByRole("button", { name: "Add charge", exact: true }).isDisabled(), true);
    await page.getByRole("button", { name: "Remove charge", exact: true }).last().click();
    await pdf(page);
    assert.equal(await page.getByRole("button", { name: "Add charge", exact: true }).isDisabled(), false);
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    await pdf(page);
    assert.equal(await page.locator(".freight-charge").count(), 20);
    await rendered(page, 2);
  } finally {
    await app.close();
  }
});

test("late freight data loading cannot overwrite a newer example selection", async () => {
  const app = await site();
  let release = () => {};
  try {
    const page = await app.browser.newPage();
    const errors = pageErrors(page);
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/freight-invoice-data-*.js", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(app.url);
    const original = await pdf(page);
    const requested = page.waitForRequest(/freight-invoice-data-.*\.js/u);
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice");
    await requested;
    await page.getByLabel("Example", { exact: true }).selectOption("text");
    assert.deepEqual(await pdf(page), original);
    release();
    await page.getByLabel("Example", { exact: true }).selectOption("freight-invoice-multipage");
    await pdf(page);
    assert.equal(await page.locator(".freight-charge").count(), 20);
    await rendered(page, 2);
    assert.deepEqual(errors, []);
  } finally {
    release();
    await app.close();
  }
});
