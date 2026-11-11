import { expect, type Page } from "@playwright/test";
export async function login(page: Page, email: string) {
  await page.goto("./");
  const opening = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const popup = await opening;
  await popup.waitForLoadState("load");
  await popup.getByRole("button", { name: "Add new account" }).click();
  await popup.getByLabel("Email", { exact: true }).fill(email);
  await popup.getByLabel("Display name", { exact: true }).fill("Commander");
  await popup.getByRole("button", { name: /Sign in with/ }).click();
  await expect(page.getByLabel("Commander name")).toBeVisible();
}
export async function geometry(page: Page) {
  const targets = page.locator(
    'button, input[type="radio"], input[type="text"], input:not([type])',
  );
  for (const target of await targets.all()) {
    await target.scrollIntoViewIfNeeded();
    const b = await target.boundingBox();
    expect(b).not.toBeNull();
    if (!b) continue;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    const viewport = page.viewportSize()!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(viewport.width + 0.1);
    expect(b.y + b.height).toBeLessThanOrEqual(viewport.height + 0.1);
    const obscured = await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      );
      return !top || !(el === top || el.contains(top) || top.contains(el));
    });
    expect(obscured).toBe(false);
  }
  const overlap = await targets.evaluateAll((elements) => {
    const boxes = elements.map((el) => el.getBoundingClientRect());
    return boxes.some((a, i) =>
      boxes.some(
        (b, j) =>
          j > i &&
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
      ),
    );
  });
  expect(overlap).toBe(false);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(false);
}
