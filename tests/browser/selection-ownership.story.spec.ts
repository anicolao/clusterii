import { test, expect } from "./story-helpers/fixtures";
import { TestStepHelper } from "./story-helpers/test-step-helper";
import { login, grantDeveloper } from "./helpers";

test("Mounted campaign selection preserves a newer proposal after genuine delayed recovery", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const story = new TestStepHelper(info, {
    id: "campaign-selection-ownership",
    title: "Keep a newer proposal when old campaign recovery completes",
    inventory: ["UX-02", "UX-14", "UX-16"],
    description:
      "An authenticated commander supersedes recovery with an unsent proposal. A labelled loopback harness holds only a genuine authorization response; no result or game state is fabricated. A current missing invitation still reports its real service error.",
  });
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  const keyboard = async (name: string) => {
    await button(name).focus();
    await page.keyboard.press("Enter");
  };
  const name = `Selection boundary ${info.project.name}`;
  let url = "";
  let release!: () => void;
  let heldResolve!: () => void;
  let deliveredResolve!: () => void;
  const held = new Promise<void>((resolve) => {
    heldResolve = resolve;
  });
  const delivered = new Promise<void>((resolve) => {
    deliveredResolve = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: string[] = [];
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      const raw = String(payload);
      if (raw.includes('"a":"p"') && raw.includes("/commands/"))
        writes.push(raw);
    }),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.port !== "19000" || url.pathname !== "/.lp") return;
    for (const [key, value] of url.searchParams) {
      if (!/^d\d+$/.test(key)) continue;
      const raw = Buffer.from(
        value.replaceAll(".", "="),
        "base64url",
      ).toString();
      if (raw.includes('"a":"p"') && raw.includes("/commands/"))
        writes.push(raw);
    }
  });
  try {
    await story.harness(
      "ordinary-saved-creator",
      "Save an ordinary real identity, grant the explicit emulator developer entitlement, create a waiting campaign and await actual faction readiness. No clock or state injection.",
      async () => {
        const email = `selection-${Date.now()}@example.test`;
        await login(page, email);
        await page.getByLabel("Commander name").fill("Selection envoy");
        await button("Save identity").click();
        await expect(page.getByRole("status")).toContainText("Identity saved");
        await grantDeveloper(email);
        await button("Close").click();
        await page.getByRole("link", { name: "Open campaigns" }).click();
        await keyboard("Create campaign");
        await page.getByLabel("Campaign name").fill(name);
        await keyboard("Create galaxy");
        await expect(
          page.getByRole("heading", {
            name: "Choose your faction",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByText("Campaign created. Choose your faction.", {
            exact: true,
          }),
        ).toBeVisible();
        url = page.url();
        await keyboard("All campaigns");
      },
    );
    const before = [...writes];
    await story.harness(
      "hold-genuine-authorization",
      "Hold the genuine loopback campaignKey response after the service produces it. Forward identical status, headers and bytes on release; do not infer callback completion from HTTP delivery.",
      async () => {
        expect(new URL(page.url()).hostname).toBe("127.0.0.1");
        await page.route("**/campaignKey", async (route) => {
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          heldResolve();
          await gate;
          await route.fulfill({ response });
          deliveredResolve();
        });
        await keyboard("Joinable campaigns");
        const card = page
          .getByRole("button")
          .filter({ has: page.getByText(name, { exact: true }) });
        await card.focus();
        await page.keyboard.press("Enter");
        await held;
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: "Recovering your campaign" }),
        ).toBeVisible();
      },
    );
    await story.step("keep-new-proposal", {
      actor: "Selection envoy",
      description:
        "Use keyboard navigation to replace pending recovery with an unsent proposal, then receive the older genuine authorization response.",
      action: async () => {
        await keyboard("All campaigns");
        await keyboard("Create campaign");
        await page.getByLabel("Campaign name").fill("My newer proposal");
        release();
        await delivered;
        // Permit queued application continuations and the post-tick focus path.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
      },
      acknowledgement: {
        spec: "The current proposal stays editable and owns keyboard focus after old recovery delivery.",
        check: async () => {
          await expect(page.getByLabel("Campaign name")).toHaveValue(
            "My newer proposal",
          );
          await expect(page.getByLabel("Campaign name")).toBeFocused();
        },
      },
      verifications: [
        {
          spec: "No stale faction/error surface or command overwrites the unsent proposal.",
          check: async () => {
            await expect(page.getByRole("alert")).toHaveCount(0);
            await expect(
              page.getByRole("heading", {
                name: "Choose your faction",
                exact: true,
              }),
            ).toHaveCount(0);
            expect(writes).toEqual(before);
          },
        },
      ],
      views: [
        {
          page,
          player: "Selection envoy",
          surface: "game",
          primary: [button("Create galaxy")],
        },
      ],
    });
    await page.unroute("**/campaignKey");
    await story.step("surface-current-denial", {
      actor: "Selection envoy",
      description:
        "Open a missing invitation; current authorization failure remains visible rather than being suppressed as stale.",
      action: async () => {
        const missing = new URL(url);
        missing.searchParams.set(
          "campaign",
          "00000000-0000-0000-0000-000000000000",
        );
        await page.goto(missing.href);
      },
      acknowledgement: {
        spec: "The actual current service not-found error is explained.",
        check: async () => {
          await expect(page.getByRole("alert")).toContainText(
            "This campaign is no longer available",
          );
        },
      },
      verifications: [
        {
          spec: "Directory recovery is keyboard accessible and no command was sent by navigation.",
          check: async () => {
            await button("All campaigns").focus();
            await expect(button("All campaigns")).toBeFocused();
            expect(writes).toEqual(before);
          },
        },
      ],
      views: [
        {
          page,
          player: "Selection envoy",
          surface: "game",
          primary: [button("All campaigns")],
        },
      ],
    });
  } finally {
    release();
    if (!page.isClosed()) await page.unroute("**/campaignKey");
  }
});
