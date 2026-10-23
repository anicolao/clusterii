import { expect, type Page } from "@playwright/test";

const selectedSystem = (page: Page) =>
  page.getByRole("complementary", { name: "Selected system", exact: true });

/** Read the displayed name, excluding the aria-hidden decorative icon. */
export async function selectedSystemName(page: Page) {
  return selectedSystem(page)
    .getByRole("heading", { level: 2 })
    .evaluate((el) =>
      Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim(),
    );
}

/** Read the real roster acknowledgement, never infer start from a clock. */
export async function acknowledgeCampaignStart(page: Page) {
  await page.getByRole("button", { name: "Roster", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Campaign roster", exact: true })
      .getByRole("status"),
  ).toContainText("Began");
  await page.getByRole("button", { name: "Close roster", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Roster", exact: true }),
  ).toBeFocused();
}

export async function inspectSystem(page: Page) {
  const more = page.getByRole("button", { name: "More", exact: true });
  if (
    (await more.isVisible()) &&
    (await more.getAttribute("aria-expanded")) === "true"
  ) {
    await more.focus();
    await page.keyboard.press("Escape");
    await expect(more).toHaveAttribute("aria-expanded", "false");
  }
  const inspector = selectedSystem(page);
  await expect(inspector).toBeVisible();
  const inspect = inspector.getByRole("button", {
    name: "Inspect system",
    exact: true,
  });
  if (await inspect.isVisible()) await inspect.click();
  await expect(
    inspector.getByRole("button", { name: "Back to galaxy", exact: true }),
  ).toBeVisible();
}

export async function inspectLayer(page: Page, layer: "Orbit" | "Surface") {
  await inspectSystem(page);
  const inspector = selectedSystem(page);
  const returnToSystem = inspector.getByRole("button", {
    name: "Return to system",
    exact: true,
  });
  if (await returnToSystem.isVisible()) await returnToSystem.click();
  const control = inspector.getByRole("button", {
    name: new RegExp("^Inspect " + layer + " · owner "),
  });
  if ((await control.getAttribute("aria-expanded")) !== "true")
    await control.click();
  await expect(control).toHaveAttribute("aria-expanded", "true");
}

/** Preserve former Fleets · N checks through the actual labelled map marker. */
export async function expectStationedCount(page: Page, count: number) {
  const name = await selectedSystemName(page);
  const suffix = " of your fleets stationed at " + name;
  await expect
    .poll(() =>
      page
        .locator("[aria-label]")
        .evaluateAll(
          (nodes, ending) =>
            nodes
              .map((node) => node.getAttribute("aria-label")!)
              .filter((label) => label.endsWith(ending)),
          suffix,
        ),
    )
    .toEqual(count ? [count + suffix] : []);
}

export async function openForces(page: Page, count?: number, keyboard = false) {
  await inspectSystem(page);
  if (count !== undefined) await expectStationedCount(page, count);
  const control = selectedSystem(page).getByRole("button", {
    name: "View forces",
    exact: true,
  });
  if (keyboard) {
    await control.focus();
    await page.keyboard.press("Enter");
  } else await control.click();
  await expect(
    page.getByRole("region", { name: "Fleet preparation", exact: true }),
  ).toBeVisible();
}

export async function openConstruction(page: Page, layer: "Orbit" | "Surface") {
  await inspectLayer(page, layer);
  await selectedSystem(page)
    .getByRole("button", {
      name: layer === "Orbit" ? "Build in orbit" : "Build on surface",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "System construction panel",
      exact: true,
    }),
  ).toBeVisible();
}

/** Global destinations belong to the dock, including its real phone More disclosure. */
export async function openGalaxyCommand(
  page: Page,
  name: string | RegExp,
  keyboard = false,
) {
  const inspector = selectedSystem(page);
  const back = inspector.getByRole("button", {
    name: "Back to galaxy",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
  const dock = page.getByRole("navigation", {
    name: "Galaxy commands",
    exact: true,
  });
  await expect(dock).toBeVisible();
  const control = dock.getByRole("button", {
    name,
    exact: typeof name === "string",
  });
  if (!(await control.isVisible()))
    await dock.getByRole("button", { name: "More", exact: true }).click();
  if (keyboard) {
    await control.focus();
    await page.keyboard.press("Enter");
  } else await control.click();
}

export async function openObservation(page: Page) {
  await inspectSystem(page);
  const inspector = selectedSystem(page);
  const toggle = inspector.getByRole("button", {
    name: "Observation",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  await expect(
    inspector.getByRole("region", { name: "Stellar observation", exact: true }),
  ).toBeVisible();
}
