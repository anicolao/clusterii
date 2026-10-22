/** Test-only timing probe, not an illustrated acceptance journey. No production hooks. */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { login, grantDeveloper } from "../browser/helpers";

const output = process.env.CLUSTER_ADMISSION_TIMING_OUTPUT;
if (!output || !process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:"))
  throw new Error("Explicit output and loopback emulator required");
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: "http://127.0.0.1:4173/clusterii/pr4/",
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
await context.addInitScript(() => {
  if (location.hostname !== "127.0.0.1") return;
  const events: { at: number; event: string; sequence?: number }[] = [];
  const mark = (event: string, sequence?: number) => {
    if (events.length < 256)
      events.push({
        at: performance.timeOrigin + performance.now(),
        event,
        sequence,
      });
  };
  Object.defineProperty(window, "__admissionTiming", {
    value: { events, mark },
  });
  let sequence = 0;
  const transaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...args) {
    const tx = transaction.apply(this, args);
    if (
      this.name === "clusterii-recovery" &&
      tx.mode === "readwrite" &&
      tx.objectStoreNames.contains("orders")
    ) {
      const id = ++sequence;
      mark("orders.transaction.start", id);
      for (const event of ["complete", "abort", "error"])
        tx.addEventListener(event, () =>
          mark(`orders.transaction.${event}`, id),
        );
    }
    return tx;
  };
  for (const method of ["get", "delete"] as const) {
    const original = IDBObjectStore.prototype[method];
    IDBObjectStore.prototype[method] = function (
      ...args: [IDBValidKey | IDBKeyRange]
    ) {
      const request = original.apply(this, args);
      if (
        this.name === "orders" &&
        this.transaction.db.name === "clusterii-recovery" &&
        this.transaction.mode === "readwrite"
      ) {
        mark(`orders.${method}.start`);
        request.addEventListener("success", () =>
          mark(`orders.${method}.success`),
        );
      }
      return request;
    };
  }
  const nativeFetch = window.fetch;
  Object.defineProperty(window, "fetch", {
    value: async function (...args: Parameters<typeof nativeFetch>) {
      const url = new URL(
        args[0] instanceof Request ? args[0].url : String(args[0]),
        location.href,
      );
      const tracked =
        url.hostname === "127.0.0.1" &&
        url.pathname === "/demo-clusterii/us-central1/campaignKey";
      if (tracked) mark("campaignKey.request");
      try {
        const response = await nativeFetch.apply(this, args);
        if (tracked) {
          mark(
            response.ok
              ? "campaignKey.response.ok"
              : "campaignKey.response.error",
          );
          // A clone observes only the nonmember classification; it never consumes or delays the SDK body.
          void response
            .clone()
            .json()
            .then((body) => {
              if (
                body?.result?.joined === false ||
                body?.data?.joined === false
              )
                mark("campaignKey.response.nonmember");
            })
            .catch(() => mark("campaignKey.response.unreadable"));
        }
        return response;
      } catch (error) {
        if (tracked) mark("campaignKey.transport.error");
        throw error;
      }
    },
  });
  let previous = "";
  new MutationObserver(() => {
    const text = document.body?.textContent ?? "";
    const flags = [
      ["saving", text.includes("Order acknowledged. Saving recovery state")],
      ["created", text.includes("Campaign created. Choose your faction.")],
      ["recovering", text.includes("Recovering your campaign")],
      [
        "faction-heading",
        [...document.querySelectorAll("h1,h2,h3")].some(
          (el) => el.textContent?.trim() === "Choose your faction",
        ),
      ],
    ]
      .filter(([, present]) => present)
      .map(([label]) => label)
      .join("+");
    if (flags !== previous) {
      previous = flags;
      mark(`ui.${flags || "none"}`);
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
});
const page = await context.newPage();
let stage = "identity",
  passed = false;
try {
  const email = `admission-timing-${Date.now()}@example.test`;
  await login(page, email);
  await page.getByLabel("Commander name").fill("Timing envoy");
  await page.getByRole("button", { name: "Save identity" }).click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
  await grantDeveloper(email);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  stage = "create";
  await page
    .getByRole("button", { name: "Create campaign", exact: true })
    .click();
  await page.getByLabel("Campaign name").fill(`Admission timing ${Date.now()}`);
  await page.evaluate(() =>
    (window as any).__admissionTiming.mark("action.create"),
  );
  await page.getByRole("button", { name: "Create galaxy" }).click();
  stage = "original-five-second-heading";
  await expect(
    page.getByRole("heading", { name: "Choose your faction" }),
  ).toBeVisible({ timeout: 5000 });
  passed = true;
} finally {
  const events = await page.evaluate(
    () => (window as any).__admissionTiming?.events ?? [],
  );
  await writeFile(
    output,
    JSON.stringify(
      {
        scope: "single-creator diagnostic; no acceptance captures",
        passed,
        stage,
        events,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
