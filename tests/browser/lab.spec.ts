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
  await page.getByLabel("Scenario", {exact:true}).selectOption("campaign-migrated");
  await seek.fill("1250");await expect(standard.getByRole("status")).toContainText("Encryption changed and verified");await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  await page.getByLabel("Scenario", {exact:true}).selectOption("campaign-start");
  for(const [time,text] of [[0,"Starts"],[1100,"Awaiting home assignment"],[3300,"Began"]] as const){
    await seek.fill(String(time));await expect(standard.getByRole("status")).toContainText(text);
    await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  }
  await page.getByLabel("Scenario",{exact:true}).selectOption("session-ended");
  await seek.fill("100");await expect(standard.getByRole("button",{name:"Ending sessions…"})).toBeDisabled();
  await seek.fill("1400");await expect(standard.getByRole("status")).toHaveText("Your session ended. Sign in to continue.");await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  await page.getByLabel("Scenario",{exact:true}).selectOption("history-recovery");
  await seek.fill("100");await expect(standard.getByRole("status")).toHaveText("Loading campaign records…");
  await seek.fill("1400");await expect(standard.getByRole("alert")).toContainText("Retry keeps your place");await expect(reduced.getByRole("alert")).toHaveText(await standard.getByRole("alert").innerText());
  await seek.fill("3300");await expect(standard.locator("summary")).toHaveCount(2);await expect(reduced.locator("summary")).toHaveCount(2);
  await page.getByLabel("Scenario",{exact:true}).selectOption("production");
  await seek.fill("1200");await expect(standard.getByRole("status")).toContainText("Awaiting next tick");await expect(reduced.getByRole("status")).toHaveText(await standard.getByRole("status").innerText());
  await seek.fill("2400");await expect(standard.locator(".balance strong")).toHaveText("202.8");await expect(reduced.locator(".balance strong")).toHaveText("202.8");await expect(standard.getByRole("progressbar")).toHaveAttribute("value","1400");
  await page.getByLabel("Scenario",{exact:true}).selectOption("research");
  await seek.fill("100");await expect(standard.getByRole("button",{name:"Awaiting acknowledgement…"})).toBeDisabled();
  await seek.fill("1400");await expect(standard.getByRole("alert")).toContainText("preserved");await expect(reduced.getByRole("alert")).toHaveText(await standard.getByRole("alert").innerText());
  await seek.fill("2400");await expect(standard.getByRole("region",{name:"Accepted research orders"})).toContainText("Tick 1 · investing");
  await seek.fill("3400");await expect(standard.getByRole("status",{name:"Applied research order"})).toHaveText((await reduced.getByRole("status",{name:"Applied research order"}).textContent())!);
  await standard.getByRole("radio",{name:/investing/}).check();
  await standard.getByRole("button",{name:"Queue investing",exact:true}).click();
  await expect(standard.getByRole("radio",{name:/investing/})).toBeChecked();
  await expect(standard.getByRole("button",{name:"Awaiting acknowledgement…"})).toBeDisabled();
  await expect(standard.getByRole("group",{name:"Research acknowledgement"})).toBeFocused();
  await seek.fill("1400");await expect(standard.getByRole("radio",{name:/investing/})).toBeChecked();
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
      const controls = await page.locator("button,input,select").evaluateAll((elements) =>
        elements.flatMap((element) => {
          // Match boundingBox visibility: hidden layout has no box; offscreen controls still count.
          if (!element.getClientRects().length || getComputedStyle(element).visibility !== "visible") return [];
          const { width, height } = element.getBoundingClientRect();
          return [{ label: element.getAttribute("aria-label") || element.textContent || element.tagName, width, height }];
        }),
      );
      for (const control of controls) {
        expect(control.width, control.label).toBeGreaterThanOrEqual(44);
        expect(control.height, control.label).toBeGreaterThanOrEqual(44);
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

test("selected history has identical consent and disclosure in both motion modes", async ({page}) => {
  await page.goto("./dev/animations/");
  await page.getByLabel("Scenario", {exact:true}).selectOption("conversation-sharing");
  const seek = page.getByLabel(/Inspect frame/);
  for (const name of ["Standard motion comparison", "Reduced motion comparison"]) {
    const surface = page.getByRole("region", {name, exact:true});
    await expect(surface.getByRole("list", {name:"Selected earlier history"})).toContainText("Message 1");
    await expect(surface).not.toContainText("Creator's earlier private note.");
    await surface.getByRole("button", {name:"Accept invitation",exact:true}).focus();
    await expect(surface.getByRole("button", {name:"Accept invitation",exact:true})).toBeFocused();
  }
  await seek.fill("1300");
  for (const name of ["Standard motion comparison", "Reduced motion comparison"]) {
    const surface = page.getByRole("region", {name, exact:true});
    await expect(surface.getByRole("list", {name:"Authorized messages"})).toContainText("Creator's earlier private note.");
    await expect(surface).toContainText("Selected earlier history · shared by");
  }
  await page.getByRole("button",{name:"Reset",exact:true}).click();
  await expect(page.getByRole("list",{name:"Authorized messages"})).toHaveCount(0);
});
