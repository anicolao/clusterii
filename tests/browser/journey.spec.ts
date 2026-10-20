import { test, expect, type Page } from "@playwright/test";
async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}
async function capture(page: Page, name: string) {
  await settled(page);
  const play = page.getByRole("button", { name: "Play", exact: true });
  if (await play.count()) await expect(play).toBeEnabled();
  // Collect every changed screen; any mismatch still fails the journey.
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  for (const button of await page.getByRole("button").all()) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
}
for (const [name, width, height] of [
  ["phone", 393, 852],
  ["desktop", 1440, 1000],
  ["large", 3840, 2160],
  ["short", 1280, 720],
] as const) {
  test(`${name}: entry and field guide`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("./");
    await capture(page, `entry-${name}`);
    await page
      .getByRole("button", { name: "Learn the game", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "No empire wins alone" }),
    ).toBeFocused();
    await capture(page, `guide-${name}`);
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: "Next chapter" }).click();
    await expect(
      page.getByRole("heading", { name: "Information is influence" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Return to entry" }).click();
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
  });
}
test("Google sign-in, encrypted profile acknowledgement and reload", async ({
  page,
}) => {
  await page.goto("./");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  await popup.getByRole("button", { name: "Add new account" }).click();
  await popup
    .getByLabel("Email", { exact: true })
    .fill("commander@example.test");
  await popup.getByLabel("Display name", { exact: true }).fill("Commander");
  await popup.getByRole("button", { name: /Sign in with/ }).click();
  await expect(page.getByLabel("Commander name")).toBeVisible();
  await page.getByLabel("Commander name").fill("Étoile 🌌");
  await page.getByRole("radio", { name: "The deepseer" }).check();
  await page.getByRole("button", { name: "Save identity" }).click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
  await expect(page.locator(".portrait-art img")).toHaveCount(8);
  await capture(page, "identity-desktop");
  // Load the recovered identity at its target viewport so Chromium does not
  // reuse a desktop-sized image raster while resizing the phone capture.
  await page.setViewportSize({ width: 393, height: 852 });
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByLabel("Commander name")).toHaveValue("Étoile 🌌");
  await expect(page.getByRole("radio", { name: "The deepseer" })).toBeChecked();
  await capture(page, "identity-phone");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Étoile 🌌")).toHaveCount(0);
});
