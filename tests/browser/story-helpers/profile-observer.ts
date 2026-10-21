import { expect, type Page } from "@playwright/test";
/** Observe actual encrypted transport; repeated frames remain one logical command. */
export function observeProfileWrites(page: Page) {
  const writes: string[] = [];
  const record = (frame: string) => {
    if (frame.includes('"a":"p"') && frame.includes("/profileCommands/"))
      writes.push(frame);
  };
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => record(String(payload))),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.port !== "19000" || url.pathname !== "/.lp") return;
    for (const [key, data] of url.searchParams)
      if (/^d\d+$/.test(key))
        record(Buffer.from(data.replaceAll(".", "="), "base64url").toString());
  });
  return writes;
}
export function profileIdentity(writes: string[]) {
  expect(writes.length).toBeGreaterThan(0);
  return (JSON.parse(writes.at(-1)!).d.b.p as string).split("/")[2];
}
export async function profileFacts(page: Page, uid: string) {
  const root = `http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/profiles/${uid}`;
  async function read(path = "") {
    const response = await page.request.get(root + path, {
      headers: { Authorization: "Bearer owner" },
    });
    expect(response.ok()).toBe(true);
    return response.json();
  }
  const head = await read(),
    versions = await read("/versions"),
    receipts = await read("/receipts");
  return {
    revision: Number(head.fields.revision.integerValue),
    versions: versions.documents as { name: string }[],
    receipts: receipts.documents as { name: string }[],
    read,
  };
}
