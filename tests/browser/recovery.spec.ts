import {writeFile} from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";
async function save(page: Page, name: string) {
  await page.getByLabel("Commander name").fill(name);
  await page
    .getByRole("button", { name: "Save identity", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Identity saved");
}
test("two devices preserve a conflicting draft and explicitly replace the saved identity", async ({
  browser,
}, info) => {
  const one = await browser.newContext();
  const two = await browser.newContext();
  const a = await one.newPage();
  const b = await two.newPage();
  const email = `conflict-${Date.now()}@example.test`;
  await login(a, email);
  await save(a, "Original");
  await login(b, email);
  await b.getByLabel("Commander name").fill("Preserved draft");
  await save(a, "Other device");
  await b.getByRole("button", { name: "Save identity", exact: true }).click();
  await expect(b.getByRole("alert")).toContainText("Another device");
  await expect(b.getByLabel("Commander name")).toHaveValue("Preserved draft");
  await expect(
    b.getByRole("button", { name: "Reconnect", exact: true }),
  ).toHaveCount(0);
  await b.screenshot({
    path: info.outputPath("conflicting-draft-preserved.png"),
  });
  await b.getByRole("button", { name: "Replace saved identity" }).click();
  await expect(b.getByRole("status")).toContainText("Identity saved");
  await expect(a.getByLabel("Commander name")).toHaveValue("Preserved draft");
  await one.close();
  await two.close();
});
test("offline pending command survives retry and reconnect without losing its draft", async ({
  page,
  context,
}, info) => {
  test.setTimeout(65000);
  const writes: string[] = [];
  // Observe actual transport commands, without injecting application state.
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      const frame = String(payload);
      if (frame.includes('"a":"p"') && frame.includes("/profileCommands/"))
        writes.push(frame);
    }),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.port !== "19000" || url.pathname !== "/.lp") return;
    for (const [key, data] of url.searchParams) {
      if (!/^d\d+$/.test(key)) continue;
      const frame = Buffer.from(
        data.replaceAll(".", "="),
        "base64url",
      ).toString();
      if (frame.includes('"a":"p"') && frame.includes("/profileCommands/"))
        writes.push(frame);
    }
  });
  await login(page, `offline-${Date.now()}@example.test`);
  await save(page, "Before network loss");
  expect(writes.length).toBeGreaterThan(0);
  const originalPath=JSON.parse(writes.at(-1)!).d.b.p as string;
  const uid=originalPath.split('/')[2];
  const root=`http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/profiles/${uid}`;
  async function read(path='') { const response=await page.request.get(root+path,{headers:{Authorization:'Bearer owner'}});expect(response.ok()).toBe(true);return response.json(); }
  const before=Number((await read()).fields.revision.integerValue);
  const beforeVersions=(await read('/versions')).documents.length;
  const beforeReceipts=(await read('/receipts')).documents.length;
  writes.length = 0;
  await context.setOffline(true);
  await page.getByLabel("Commander name").fill("Pending draft");
  await page
    .getByRole("button", { name: "Save identity", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByLabel("Commander name")).toHaveValue("Pending draft");
  await context.setOffline(false);
  await expect(page.getByRole("status")).toContainText("Identity saved", {
    timeout: 25000,
  });
  await expect(page.getByLabel("Commander name")).toBeEnabled();
  expect(writes.length).toBeGreaterThan(0);
  const logical=writes.map(frame=>JSON.parse(frame).d.b as {p:string,d:Record<string,unknown>});
  expect(new Set(logical.map(write=>write.p)).size).toBe(1);
  for(const write of logical) expect(write.d).toEqual(logical[0].d);
  const commandId=logical[0].p.split('/')[3];
  expect(logical[0].p).toBe(`/profileCommands/${uid}/${commandId}`);
  expect(logical[0].d.objectId).toBe(`command:${commandId}`);
  const after=Number((await read()).fields.revision.integerValue);
  expect(after).toBe(before+1);
  const versions=(await read('/versions')).documents;
  expect(versions).toHaveLength(beforeVersions+1);
  expect(versions.map((document:{name:string})=>document.name.split('/').at(-1)).sort()).toEqual(['1','2']);
  const receipts=(await read('/receipts')).documents;
  expect(receipts).toHaveLength(beforeReceipts+1);
  const accepted=await read(`/receipts/${commandId}`);
  expect(accepted.fields.status.stringValue).toBe('accepted');
  expect(Number(accepted.fields.revision.integerValue)).toBe(after);
  const evidencePath=info.outputPath('idempotent-reconnect.json');
  await writeFile(evidencePath,JSON.stringify({transportFrames:writes.length,logicalCommands:1,commandId,beforeRevision:before,afterRevision:after,versionCount:versions.length,receiptCount:receipts.length}));
  await info.attach('Idempotent reconnect evidence',{path:evidencePath,contentType:'application/json'});
  await page.reload();
  await page.getByRole("button", { name: "Your identity", exact: true }).click();
  await expect(page.getByLabel("Commander name")).toHaveValue("Pending draft");
});
test("keyboard returns to the opening control and reduced motion removes transitions", async ({
  page,
}) => {
  await page.goto("./");
  const learn = page.getByRole("button", {
    name: "Learn the game",
    exact: true,
  });
  await learn.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "No empire wins alone" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "Return to entry" }).focus();
  await page.keyboard.press("Enter");
  await expect(learn).toBeFocused();
  await login(page, `focus-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Close", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  const duration = await learn.evaluate(
    (el) => getComputedStyle(el).transitionDuration,
  );
  expect(duration).toBe("0s");
});
