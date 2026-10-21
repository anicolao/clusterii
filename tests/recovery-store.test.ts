import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
// Isolated production IndexedDB integration, not an illustrated player journey.
test("durable cleanup compares the complete encrypted record, including a replacement using the same UUID", async () => {
  const source = execFileSync(
    "bun",
    ["build", "src/lib/recovery-store.ts", "--target=browser"],
    { encoding: "utf8" },
  );
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("http://storage.test/**", (route) =>
      route.fulfill(
        route.request().url().endsWith("/recovery-store.js")
          ? { contentType: "text/javascript", body: source }
          : {
              contentType: "text/html",
              body: "<!doctype html><title>Isolated recovery storage test</title>",
            },
      ),
    );
    await page.goto("http://storage.test/");
    const result = await page.evaluate(async () => {
      const url = new URL("recovery-store.js", location.href).href;
      const { claimOrder, readOrder, clearOrder } = await import(url);
      const old = {
        id: "same-command",
        gameId: "campaign",
        kind: "campaign.create",
        envelope: { body: "first encrypted payload" },
      };
      const replacement = {
        ...old,
        envelope: { body: "replacement encrypted payload" },
      };
      await claimOrder("same-account", old);
      await clearOrder("same-account", { ...old, dispatched: true });
      const retired = await readOrder("same-account");
      await claimOrder("same-account", replacement);
      let conflict = false;
      try {
        await clearOrder("same-account", old);
      } catch (error) {
        conflict = (error as { area?: string }).area === "order";
      }
      const retained = await readOrder("same-account");
      await clearOrder("same-account", replacement);
      await clearOrder("same-account", replacement);
      return {
        retired: retired ?? null,
        conflict,
        retained,
        empty: (await readOrder("same-account")) ?? null,
      };
    });
    expect(result.retired).toBeNull();
    expect(result.conflict).toBe(true);
    expect(result.retained.envelope.body).toBe("replacement encrypted payload");
    expect(result.empty).toBeNull();
  } finally {
    await browser.close();
  }
});
