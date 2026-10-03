import { site } from "../tests/showcase/helpers.js";
import { measurements, plasmaWorkers, playing } from "../tests/showcase/plasma-helpers.js";

const app = await site();
try {
  for (const capacity of [1, 10, 50]) {
    const page = await app.browser.newPage({ viewport: { width: 1000, height: 800 } });
    await plasmaWorkers(page);
    await page.goto(`${app.url}plasma.html`);
    await page.getByLabel("Extra buffered frames (1–50)").fill(String(capacity));
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playing(page, 1);
    const before = await measurements(page);
    await page.waitForTimeout(60000);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const after = await measurements(page);
    console.log(
      JSON.stringify(
        {
          browser: await app.browser.version(),
          resolution: "320x200 / 32x20 cells",
          capacity,
          prebufferMs: after.prebufferMs,
          measuredActiveMs: after.activeMs - before.activeMs,
          presentedFPS: ((after.presented - before.presented) * 1000) / (after.activeMs - before.activeMs),
          pipelineFPS: ((after.produced - before.produced) * 1000) / (after.pipelineMs - before.pipelineMs),
          underruns: after.underruns - before.underruns,
          lateSlots: after.lateSlots - before.lateSlots,
          generationMeanMs: after.generationMeanMs,
          rasterMeanMs: after.rasterMeanMs,
          workers: await page.evaluate(() => ({
            created: Reflect.get(window, "createdWorkers"),
            live: Reflect.get(window, "liveWorkers"),
          })),
          finalQueue: after.queue,
        },
        null,
        2,
      ),
    );
    await page.close();
  }
} finally {
  await app.close();
}
