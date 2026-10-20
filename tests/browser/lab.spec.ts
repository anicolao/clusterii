import { test, expect } from "@playwright/test";
test("lab replay, pause, seek and reduced motion preserve production outcomes", async ({
  page,
}) => {
  await page.goto("./dev/animations/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("reconnect");
  const seek = page.getByLabel(/Inspect frame/);
  await seek.fill("1100");
  const standard = page.getByRole("region", {
    name: "Standard motion comparison",
  });
  const reduced = page.getByRole("region", {
    name: "Reduced motion comparison",
  });
  await expect(standard.getByRole("alert")).toContainText("draft is preserved");
  await expect(reduced.getByRole("alert")).toHaveText(
    await standard.getByRole("alert").innerText(),
  );
  await expect(standard.getByLabel("Commander name")).toHaveValue(
    "Preserved draft",
  );
  await seek.fill("3300");
  await expect(standard.getByRole("status")).toContainText("Identity saved");
  await expect(reduced.getByRole("status")).toHaveText(
    await standard.getByRole("status").innerText(),
  );
  await page.getByLabel("Scenario", {exact:true}).selectOption("campaign-conflict");
  await seek.fill("1250");
  await expect(standard.getByRole("alert")).toContainText("roster changed");
  await expect(reduced.getByRole("alert")).toHaveText(await standard.getByRole("alert").innerText());
  await page.getByLabel("Scenario", {exact:true}).selectOption("campaign-joined");
  await seek.fill("1250");
  await expect(standard.getByRole("status")).toContainText("seat is confirmed");
  await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  await page.getByLabel("Scenario", {exact:true}).selectOption("campaign-paused");
  await seek.fill("1250");await expect(standard.getByRole("status")).toContainText("Campaign paused");await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  await page.getByLabel("Scenario", {exact:true}).selectOption("campaign-resumed");
  await seek.fill("3300");await expect(standard.getByRole("status")).toContainText("Campaign resumed");await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  await page.getByLabel("Playback speed").selectOption("0.25");
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await seek.inputValue();
  await page.waitForTimeout(100);
  expect(await seek.inputValue()).toBe(paused);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(seek).toHaveValue("0");
  await page.getByLabel("Scenario", { exact: true }).selectOption("conflict");
  await seek.fill("1400");
  await expect(standard.getByRole("alert")).toContainText("Another device");
  await expect(reduced.getByRole("alert")).toHaveText(
    await standard.getByRole("alert").innerText(),
  );
});
for (const [name, width, height] of [
  ["phone", 393, 852],
  ["desktop", 1440, 1000],
  ["large", 3840, 2160],
  ["short", 1280, 720],
] as const) {
  test(`${name}: gallery and lab rendered evidence`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    for (const route of ["gallery", "dev/animations"]) {
      await page.goto(`./${route}/`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode()));
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      for (const control of await page.locator("button,input,select").all()) {
        const b = await control.boundingBox();
        if (!b) continue;
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
      const path = info.outputPath(`${route.replace("/", "-")}-${name}.png`);
      await page.screenshot({ fullPage: true, path });
      await info.attach(`${route.replace("/", "-")}-${name}`, {
        path,
        contentType: "image/png",
      });
    }
  });
}
