import { test, expect } from "@playwright/test";
import { login, geometry } from "./helpers";
for (const [name, width, height] of [
  ["phone", 393, 852],
  ["desktop", 1440, 1000],
  ["large", 3840, 2160],
  ["short", 1280, 720],
] as const) {
  test(`${name}: identity and validation remain bounded and operable`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await login(page, `layout-${name}-${Date.now()}@example.test`);
    await page.getByLabel("Commander name").fill("A valid commander");
    await geometry(page);
    await page.getByLabel("Commander name").fill("A".repeat(25));
    await page
      .getByRole("button", { name: "Save identity", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("2–24");
    await expect(
      page.getByRole("button", { name: "Reconnect", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Commander name")).toBeFocused();
    await geometry(page);
    await page.getByLabel("Commander name").scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    await info.attach(`identity-${name}-validation`, {
      path: info.outputPath(`identity-${name}-validation.png`),
      contentType: "image/png",
    });
  });
}
