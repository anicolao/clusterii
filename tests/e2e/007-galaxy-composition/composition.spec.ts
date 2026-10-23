import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { activeAdmissionControls } from "../helpers/campaign-phase";
import { login, grantDeveloper } from "../../browser/helpers";
import { admissionAt } from "../../browser/story-helpers/admission-clock.mjs";

test("Read the cinematic galaxy through real commander and system instruments", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(240000);
  const story = new TestStepHelper(info, {
    id: "galaxy-cinematic-instruments",
    title: "Commanders and systems share one galaxy",
    inventory: ["UX-02", "UX-03", "UX-04", "UX-15", "UX-16"],
    description:
      "Four ordinary authenticated players save cosmetic portraits, join different mechanical factions and receive real scheduled homes. Fixed catalogue/admission time and Scheduler HTTP delivery are labelled demo-only harness controls. The owner reads the actual scene, uses keyboard roster/menu/system instruments and recovers the same authorized campaign. Normal-motion settled visual evidence is declared separately; this does not certify hosted scheduling or peer-private read denial.",
  });
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  const key = async (name: string) => {
    await button(name).focus();
    await page.keyboard.press("Enter");
  };
  const inspector = page.getByRole("complementary", {
    name: "Selected system",
    exact: true,
  });
  const views = (normalMotion = false) => [
    {
      page,
      player: "Deepseer envoy",
      surface: "game" as const,
      normalMotion,
      primary: [button("Menu"), button("Inspect system")],
    },
  ];
  let campaignUrl = "",
    homeName = "";
  await story.harness(
    "saved-identity",
    "Ordinary authenticated identity save; developer entitlement is the explicit emulator permission fixture, not a fabricated member.",
    async () => {
      const email = `composition-${info.project.name}-${crypto.randomUUID()}@example.test`;
      await login(page, email);
      await page.getByLabel("Commander name").fill("Deepseer envoy");
      await page
        .getByRole("radio", { name: "The deepseer", exact: true })
        .check();
      await key("Save identity");
      await expect(page.getByRole("status")).toContainText("Identity saved");
      await grantDeveloper(email);
      await key("Close");
      await key("Play");
      await page.clock.setFixedTime(admissionAt);
    },
  );
  await story.harness(
    "create-and-claim",
    "Create and claim through actual commands, receipts and private projections; the existing demo loader fixes catalogue and admission time only.",
    async () => {
      await key("Create campaign");
      await page
        .getByLabel("Campaign name")
        .fill(`Scheduled story composition ${info.project.name}`);
      await key("Create galaxy");
      await expect(
        page.getByRole("heading", { name: "Choose your faction", exact: true }),
      ).toBeVisible();
      campaignUrl = page.url();
      await page.getByRole("radio", { name: /Heliac Assembly/ }).check();
      await key("Portrait");
      await page
        .getByRole("radio", { name: "The deepseer", exact: true })
        .check();
      await key("Claim your seat");
      await expect(
        page.getByText("Your seat is confirmed.", { exact: true }),
      ).toBeVisible();
    },
  );
  await story.harness(
    "independent-admission-and-start",
    "Three independent ordinary player admissions then actual scheduler HTTP delivery; no injected seats, home, resources or results. Not hosted timing evidence.",
    activeAdmissionControls(browser, request, page, info, [
      "The navigator",
      "The architect",
      "The marshal",
    ]),
  );
  await story.step("read-commanders-and-home", {
    actor: "Deepseer envoy",
    description:
      "Read the acknowledged home neighbourhood. The saved Deepseer portrait remains cosmetic; Heliac Assembly is the mechanical faction.",
    action: async () => {
      homeName = await inspector.getByRole("heading", { level: 2 }).innerText();
      await button("Menu").focus();
    },
    acknowledgement: {
      spec: "The real started campaign exposes the assigned home, credits and science rate.",
      check: async () => {
        await expect(page.locator("canvas")).toBeVisible();
        await expect(page.getByLabel("Empire resources")).toContainText(
          "+1.4 / tick",
        );
        await expect(inspector).toContainText("You");
      },
    },
    verifications: [
      {
        spec: "The inspector title clears the measured resource rail and both ownership rows plus the illustration disclaimer are fully readable without automatic scrolling.",
        check: async () => {
          const header = await page.locator(".command-rail").boundingBox();
          const panel = await inspector.boundingBox();
          const map = await page
            .locator("[data-galaxy-viewport]")
            .boundingBox();
          const legend = await page.locator(".contact-legend").boundingBox();
          expect(map!.y + map!.height).toBeLessThanOrEqual(legend!.y);
          expect(panel!.y).toBeGreaterThanOrEqual(
            header!.y + header!.height + 8,
          );
          for (const target of [
            inspector.getByRole("heading", { level: 2 }),
            inspector.getByText("Orbit", { exact: true }),
            inspector.getByText("Surface", { exact: true }),
            inspector.locator("figcaption"),
          ]) {
            expect(
              await target.evaluate((element) => {
                const box = element.getBoundingClientRect();
                if (
                  box.top < 0 ||
                  box.left < 0 ||
                  box.right > innerWidth ||
                  box.bottom > innerHeight
                )
                  return false;
                for (
                  let parent = element.parentElement;
                  parent;
                  parent = parent.parentElement
                ) {
                  const style = getComputedStyle(parent),
                    clip = parent.getBoundingClientRect();
                  if (
                    /(auto|scroll|hidden|clip)/.test(style.overflowX) &&
                    (box.left < clip.left || box.right > clip.right)
                  )
                    return false;
                  if (
                    /(auto|scroll|hidden|clip)/.test(style.overflowY) &&
                    (box.top < clip.top || box.bottom > clip.bottom)
                  )
                    return false;
                }
                return true;
              }),
            ).toBe(true);
          }
        },
      },
      {
        spec: "Portrait identity and mechanical faction are labelled separately; saved portrait is the M2 atlas tile.",
        check: async () => {
          await expect(button("Menu")).toHaveAttribute(
            "title",
            /Deepseer envoy.*Heliac Assembly.*portrait is cosmetic/,
          );
          expect(
            await button("Menu")
              .locator(".commander-portrait")
              .evaluate((element) => [
                getComputedStyle(element)
                  .getPropertyValue("--portrait-column")
                  .trim(),
                getComputedStyle(element)
                  .getPropertyValue("--portrait-row")
                  .trim(),
              ]),
          ).toEqual(["3", "0"]);
          await expect(button("Menu")).toBeFocused();
          await expect(
            page.getByRole("button", { name: /^Inspect roster:/ }),
          ).toHaveCount(info.project.name === "phone" ? 0 : 3);
        },
      },
    ],
    views: views(),
  });
  const rosterOpener =
    info.project.name === "phone"
      ? "Roster"
      : "Inspect roster: Navigation peer 1, Pelagic Concord";
  await story.step("inspect-real-commanders", {
    actor: "Deepseer envoy",
    description:
      "Open the authoritative roster from a commander portrait, or the compact phone Roster control, and read the named independent empires.",
    action: async () => key(rosterOpener),
    acknowledgement: {
      spec: "Four actual members and Began are visible in the roster.",
      check: async () => {
        const roster = page.getByRole("dialog", {
          name: "Campaign roster panel",
          exact: true,
        });
        await expect(roster).toContainText("Navigation peer 1");
        await expect(
          roster.getByRole("status", { name: "Campaign start", exact: true }),
        ).toContainText("Began");
      },
    },
    verifications: [
      {
        spec: "Closing the roster is a contained keyboard action.",
        check: async () => expect(button("Close roster")).toBeEnabled(),
      },
    ],
    views: [
      {
        page,
        player: "Deepseer envoy",
        surface: "game",
        primary: [button("Close roster")],
      },
    ],
  });
  await story.step("return-to-portrait", {
    actor: "Deepseer envoy",
    description:
      "Close the roster with Escape and return to its exact opener, retaining the same selected home.",
    action: async () => page.keyboard.press("Escape"),
    acknowledgement: {
      spec: "The actual opening portrait or Roster control regains keyboard focus.",
      check: async () => expect(button(rosterOpener)).toBeFocused(),
    },
    verifications: [
      {
        spec: "The home selection is unchanged by roster navigation.",
        check: async () =>
          expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
            homeName,
          ),
      },
    ],
    views: views(),
  });
  await story.step("inspect-home-layers", {
    actor: "Deepseer envoy",
    description:
      "Use Inspect to read the real independent Orbit and Surface instruments without creating an order.",
    action: async () => key("Inspect system"),
    acknowledgement: {
      spec: "Both authorized ownership instruments are available.",
      check: async () => {
        await expect(button("Inspect Orbit · owner You")).toBeVisible();
        await expect(button("Inspect Surface · owner You")).toBeVisible();
      },
    },
    verifications: [
      {
        spec: "The same system title remains selected.",
        check: async () =>
          expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
            homeName,
          ),
      },
    ],
    views: [
      {
        page,
        player: "Deepseer envoy",
        surface: "game",
        primary: [button("Back to galaxy"), button("View forces")],
      },
    ],
  });
  let facts = "",
    resources = "";
  await story.step("normal-motion-return", {
    actor: "Deepseer envoy",
    description:
      "Permit normal device motion, return from the contextual system instrument and inspect the settled production scene. No animation is fast-forwarded; finite-effect and exact stable-image readiness still apply.",
    action: async () => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await key("Back to galaxy");
      facts = await inspector.innerText();
      resources = await page.getByLabel("Empire resources").innerText();
    },
    acknowledgement: {
      spec: "The compact inspector returns for the same authoritative system.",
      check: async () =>
        expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
          homeName,
        ),
    },
    verifications: [
      {
        spec: "Normal-motion device preference is genuine and the document remains fixed.",
        check: async () => {
          expect(
            await page.evaluate(
              () => matchMedia("(prefers-reduced-motion: reduce)").matches,
            ),
          ).toBe(false);
          expect(await page.evaluate(() => scrollY)).toBe(0);
        },
      },
    ],
    views: views(true),
  });
  await story.step("reduce-decoration-retain-facts", {
    actor: "Deepseer envoy",
    description:
      "Return to reduced-motion capture preference, open the real portrait menu and lower decorative detail. The local acknowledgement precedes the unchanged factual scene.",
    action: async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await key("Menu");
      await page
        .getByRole("checkbox", { name: "Lower galaxy detail", exact: true })
        .focus();
      await page.keyboard.press("Space");
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Lower galaxy detail is on." }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    },
    acknowledgement: {
      spec: "The saved local detail preference closes back to the portrait menu opener.",
      check: async () => expect(button("Menu")).toBeFocused(),
    },
    verifications: [
      {
        spec: "All displayed selected-system and resource facts remain identical; this is not complete canvas-equivalence or private-peer authorization certification.",
        check: async () => {
          expect(await inspector.innerText()).toBe(facts);
          expect(await page.getByLabel("Empire resources").innerText()).toBe(
            resources,
          );
        },
      },
    ],
    views: views(),
  });
  await story.step("recover-real-home", {
    actor: "Deepseer envoy",
    description:
      "Reload the actual campaign and recover the same assigned home and saved cosmetic portrait without claiming another seat.",
    action: async () => {
      await page.reload();
      await button("Menu").focus();
    },
    acknowledgement: {
      spec: "The same authorized campaign and home recover after reload.",
      check: async () => {
        expect(page.url()).toBe(campaignUrl);
        await expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
          homeName,
        );
      },
    },
    verifications: [
      {
        spec: "The saved commander and lower-detail preference persist independently of mechanical faction.",
        check: async () => {
          await expect(button("Menu")).toHaveAttribute(
            "title",
            /Deepseer envoy.*Heliac Assembly/,
          );
          await key("Menu");
          await expect(
            page.getByRole("checkbox", {
              name: "Lower galaxy detail",
              exact: true,
            }),
          ).toBeChecked();
          await page.keyboard.press("Escape");
          await expect(button("Menu")).toBeFocused();
        },
      },
    ],
    views: views(),
  });
});
