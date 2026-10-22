import { expect, type Page } from "@playwright/test";
import { commandDigest } from "../../../shared/command-receipt";

/** Observe real transport before login; never intercept or manufacture a receipt. */
export function observeDeparture(page: Page) {
  let authorization = "";
  const writes: { path: string; payload: unknown }[] = [];
  const record = (raw: string) => {
    if (!raw.includes('"a":"p"') || !raw.includes("/commands/")) return;
    const frame = JSON.parse(raw).d.b;
    if (frame.d?.kind === "campaign.leave")
      writes.push({ path: frame.p.replace(/^\//, ""), payload: frame.d });
  };
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => record(String(payload))),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.port === "15001" && url.pathname.endsWith("/campaignKey"))
      authorization = request.headers().authorization ?? authorization;
    if (url.port !== "19000" || url.pathname !== "/.lp") return;
    for (const [key, value] of url.searchParams)
      if (/^d\d+$/.test(key))
        record(Buffer.from(value.replaceAll(".", "="), "base64url").toString());
  });
  return {
    spec: "One logical Leave has its matching accepted receipt; membership is absent and the retained protected view denies player access, with no involuntary-access error or retry remedy.",
    check: async () => {
      expect(writes.length).toBeGreaterThan(0);
      const original = writes[0];
      for (const write of writes) expect(write).toEqual(original);
      const [ingress, gameId, uid, commandId] = original.path.split("/");
      expect(ingress).toBe("commands");
      const root =
        "http://127.0.0.1:18080/v1/projects/demo-clusterii/databases/(default)/documents/";
      const read = (path: string) =>
        page.request.get(root + path, {
          headers: { Authorization: "Bearer owner" },
        });
      const receipt = await read(
        `campaignReceipts/${uid}/results/${commandId}`,
      );
      expect(receipt.ok()).toBe(true);
      expect((await receipt.json()).fields).toMatchObject({
        status: { stringValue: "accepted" },
        gameId: { stringValue: gameId },
        revision: { integerValue: "3" },
        requestDigest: {
          stringValue: await commandDigest(original.path, original.payload),
        },
      });
      expect(
        (await read(`campaignMemberships/${uid}/games/${gameId}`)).status(),
      ).toBe(404);
      // Historical ciphertext remains stored. Prove the actual departed player's
      // credential still reads its receipt but cannot read that retained view.
      expect(authorization.startsWith("Bearer ")).toBe(true);
      const playerRead = (path: string) =>
        page.request.get(root + path, {
          headers: { Authorization: authorization },
        });
      expect(
        (
          await playerRead(`campaignReceipts/${uid}/results/${commandId}`)
        ).status(),
      ).toBe(200);
      expect(
        (await playerRead(`campaignViews/${gameId}/members/${uid}`)).status(),
      ).toBe(403);
      await expect(page.locator("canvas")).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(
        page.getByText(
          "You no longer have access to this campaign. Choose another campaign.",
          { exact: true },
        ),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Retry order", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Claim your seat", exact: true }),
      ).toBeEnabled();
    },
  };
}
