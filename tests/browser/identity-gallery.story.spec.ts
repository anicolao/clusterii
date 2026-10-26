import { test, expect } from "./story-helpers/fixtures";
import {
  TestStepHelper,
  type StoryView,
} from "./story-helpers/test-step-helper";
import type { Locator } from "@playwright/test";
import { icons, portraitNames } from "../../src/lib/presentation";

test("Production gallery exposes identity, navigation and feedback control states", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const story = new TestStepHelper(info, {
    id: "identity-component-gallery",
    title: "Inspect the shipped identity and navigation components",
    inventory: ["UX-01", "UX-14", "UX-16"],
    description:
      "A developer uses the production gallery's actual shared components. Explicit local specimens expose keyboard focus, selected, disabled, pending, invalid and recovery states. Local activation counts are component callbacks, not service receipts or authentication acceptance. The reference page deliberately scrolls; these captures do not certify remaining gameplay specimens.",
  });
  const section = (name: string) =>
    page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  const navigation = section("Illustrated navigation");
  const actions = section("Actions and focus");
  const identity = section("Identity fields");
  const feedback = section("Feedback and recovery");
  const view = (target: Locator, description: string): StoryView => ({
    page,
    player: `Developer · ${description}`,
    surface: "document",
    verifications: [
      {
        spec: "The named specimen is wholly visible after deliberate reference-page scrolling.",
        check: async () => {
          await target.evaluate((element) =>
            element.scrollIntoView({ block: "center", inline: "nearest" }),
          );
          const box = await target.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.y).toBeGreaterThanOrEqual(0);
          expect(box!.y + box!.height).toBeLessThanOrEqual(
            page.viewportSize()!.height,
          );
        },
      },
    ],
  });
  const count = (n: number) => ({
    spec: `The real component callback acknowledges ${n} activations.`,
    check: async () =>
      expect(actions.getByRole("status")).toHaveText(`Activated ${n} controls`),
  });
  const notLive = {
    spec: "The developer page explicitly says samples do not submit game commands.",
    check: async () =>
      expect(page.locator(".dev-shell > header")).toContainText(
        "Samples do not submit game commands.",
      ),
  };
  await story.step("open-gallery", {
    actor: "Developer",
    description:
      "Open the developer-only gallery and read its scope before inspecting controls.",
    action: async () => {
      await page.goto("./gallery/");
    },
    acknowledgement: {
      spec: "Production component gallery is named and the animation lab is reachable.",
      check: async () => {
        await expect(
          page.getByRole("heading", {
            name: "Production component gallery",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Animation lab", exact: true }),
        ).toBeVisible();
      },
    },
    verifications: [notLive, count(0)],
    views: [view(page.locator(".dev-shell > header"), "gallery scope")],
  });
  for (const [i, label] of [
    "Play",
    "Learn the game",
    "Continue The Cygnus Compact",
  ].entries()) {
    const target = navigation.getByRole("button", { name: label, exact: true });
    await story.step(`navigation-${i}`, {
      actor: "Developer",
      description: `Focus and activate ${label} with the keyboard.`,
      action: async () => {
        await target.focus();
        await expect(target).toBeFocused();
        await page.keyboard.press("Enter");
      },
      acknowledgement: count(i + 1),
      verifications: [
        {
          spec: "The illustrated control retains its real keyboard focus and pending navigation remains disabled.",
          check: async () => {
            await expect(target).toBeFocused();
            await expect(
              navigation.getByRole("button", {
                name: "Opening the gates…",
                exact: true,
              }),
            ).toBeDisabled();
          },
        },
      ],
      views: [view(target, `${label} keyboard focus`)],
    });
  }
  await story.step("navigation-pending", {
    actor: "Developer",
    description:
      "Inspect the disabled opening state without triggering another callback.",
    action: async () => {},
    acknowledgement: count(3),
    verifications: [
      {
        spec: "Pending navigation exposes its readable label and native disabled state.",
        check: async () =>
          expect(
            navigation.getByRole("button", {
              name: "Opening the gates…",
              exact: true,
            }),
          ).toBeDisabled(),
      },
    ],
    views: [
      view(
        navigation.getByRole("button", {
          name: "Opening the gates…",
          exact: true,
        }),
        "pending navigation",
      ),
    ],
  });
  for (const [i, variant] of ["primary", "secondary", "quiet"].entries()) {
    const target = actions.getByRole("button", {
      name: `${variant} action`,
      exact: false,
    });
    await story.step(`action-${variant}`, {
      actor: "Developer",
      description: `Activate the shared ${variant} button with Space and inspect its disabled counterpart.`,
      action: async () => {
        await target.focus();
        await page.keyboard.press("Space");
      },
      acknowledgement: count(4 + i),
      verifications: [
        {
          spec: "The active action keeps focus; disabled and awaiting-acknowledgement controls remain unavailable.",
          check: async () => {
            await expect(target).toBeFocused();
            await expect(
              actions.getByRole("button", {
                name: `${variant} disabled`,
                exact: true,
              }),
            ).toBeDisabled();
            await expect(
              actions.getByRole("button", {
                name: "Awaiting acknowledgement…",
                exact: true,
              }),
            ).toBeDisabled();
          },
        },
      ],
      views: [view(target.locator(".."), `${variant} action states`)],
    });
  }
  await story.step("chapter-selected", {
    actor: "Developer",
    description: "Select Diplomacy using the real chapter navigation.",
    action: async () => {
      await actions
        .getByRole("button", { name: "Diplomacy", exact: true })
        .focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "Diplomacy alone is the current chapter.",
      check: async () => {
        await expect(
          actions.getByRole("button", { name: "Diplomacy", exact: true }),
        ).toHaveAttribute("aria-current", "step");
        await expect(actions.locator('[aria-current="step"]')).toHaveCount(1);
      },
    },
    verifications: [count(6)],
    views: [
      view(actions.locator('[aria-label="Chapters"]'), "selected chapter"),
    ],
  });
  await story.step("identity-fields", {
    actor: "Developer",
    description:
      "Edit the enabled identity specimen while retaining separate invalid and pending fields.",
    action: async () => {
      await page.locator("#gallery-name").fill("Gallery envoy");
    },
    acknowledgement: {
      spec: "The enabled field retains the exact edited value.",
      check: async () =>
        expect(page.locator("#gallery-name")).toHaveValue("Gallery envoy"),
    },
    verifications: [
      {
        spec: "Field labels clear the focus ring; invalid input names its validation alert and the pending draft stays disabled.",
        check: async () => {
          const inputBox = await page.locator("#gallery-name").boundingBox();
          const nextLabel = await page
            .locator('label[for="gallery-invalid"]')
            .boundingBox();
          expect(nextLabel!.y).toBeGreaterThan(
            inputBox!.y + inputBox!.height + 6,
          );

          await expect(page.locator("#gallery-invalid")).toHaveAttribute(
            "aria-invalid",
            "true",
          );
          await expect(page.locator("#gallery-invalid")).toHaveAttribute(
            "aria-describedby",
            "gallery-validation",
          );
          await expect(page.locator("#gallery-validation")).toHaveText(
            "Choose a name of 2–24 characters and a portrait.",
          );
          await expect(page.locator("#gallery-disabled")).toBeDisabled();
          await expect(page.locator("#gallery-disabled")).toHaveValue(
            "Pending draft",
          );
        },
      },
    ],
    views: [
      view(page.locator("#gallery-name"), "editable identity"),
      view(page.locator("#gallery-validation"), "validation and pending draft"),
    ],
  });
  const enabledPortraits = identity.locator("fieldset:not([disabled])");
  const disabledPortraits = identity.locator("fieldset[disabled]");
  await story.step("portrait-selected", {
    actor: "Developer",
    description:
      "Select the navigator through its native radio and inspect the entire named portrait set.",
    action: async () => {
      const target = enabledPortraits.getByRole("radio", {
        name: "The navigator",
        exact: true,
      });
      await target.focus();
      await page.keyboard.press("Space");
    },
    acknowledgement: {
      spec: "The navigator is the only selected enabled portrait.",
      check: async () => {
        await expect(
          enabledPortraits.getByRole("radio", {
            name: "The navigator",
            exact: true,
          }),
        ).toBeChecked();
        await expect(enabledPortraits.locator("input:checked")).toHaveCount(1);
      },
    },
    verifications: [
      {
        spec: "All eight shared portraits expose their production accessible names.",
        check: async () => {
          for (const name of portraitNames)
            await expect(
              enabledPortraits.getByRole("radio", { name, exact: true }),
            ).toHaveCount(1);
        },
      },
    ],
    views: [view(enabledPortraits, "selected and focused portrait")],
  });
  await story.step("portraits-pending", {
    actor: "Developer",
    description:
      "Inspect the disabled portrait set independently of the editable selection.",
    action: async () => {},
    acknowledgement: {
      spec: "The disabled set preserves its envoy selection.",
      check: async () =>
        expect(
          disabledPortraits.getByRole("radio", {
            name: "The envoy",
            exact: true,
          }),
        ).toBeChecked(),
    },
    verifications: [
      {
        spec: "Every radio in the pending set is disabled.",
        check: async () => {
          for (const name of portraitNames)
            await expect(
              disabledPortraits.getByRole("radio", { name, exact: true }),
            ).toBeDisabled();
        },
      },
    ],
    views: [view(disabledPortraits, "disabled portraits")],
  });
  await story.step("feedback-recovery", {
    actor: "Developer",
    description:
      "Read the shared pending, accepted and conflict feedback and invoke its reconnect callback.",
    action: async () => {
      await feedback
        .getByRole("button", { name: "Reconnect", exact: true })
        .click();
    },
    acknowledgement: count(7),
    verifications: [
      {
        spec: "Pending and accepted copy remain distinct; conflict and network errors explicitly preserve the draft.",
        check: async () => {
          await expect(
            feedback
              .getByRole("status")
              .filter({ hasText: "Sending your identity…" }),
          ).toHaveText("Sending your identity…");
          await expect(
            feedback.getByRole("status").filter({ hasText: "Identity saved." }),
          ).toContainText("Your next campaign");
          await expect(
            feedback.getByRole("alert").filter({ hasText: "Another device" }),
          ).toContainText("Your draft is preserved");
          await expect(
            feedback
              .getByRole("alert")
              .filter({ hasText: "connection was interrupted" }),
          ).toContainText("your draft is preserved");
        },
      },
    ],
    views: [
      view(
        feedback.getByRole("status").filter({ hasText: "Identity saved." }),
        "identity acknowledgement",
      ),
      view(
        feedback.getByRole("alert").filter({ hasText: "Another device" }),
        "conflict recovery",
      ),
      view(
        feedback.getByRole("button", { name: "Reconnect", exact: true }),
        "network remedy",
      ),
    ],
  });
  const disclosure = page
    .locator("summary")
    .filter({ hasText: /^Last applied selections$/ });
  await story.step("research-disclosure", {
    actor: "Developer",
    description:
      "Open the shared applied-research disclosure with Enter and read its recorded selection.",
    action: async () => {
      await disclosure.focus();
      await page.keyboard.press("Enter");
    },
    acknowledgement: {
      spec: "The native disclosure opens and shows the applied investing selection.",
      check: async () => {
        await expect(disclosure.locator("..")).toHaveAttribute("open", "");
        await expect(disclosure.locator("..").getByRole("list")).toContainText(
          "investing",
        );
      },
    },
    verifications: [
      {
        spec: "The disclosure retains keyboard focus and a minimum 44px hit target.",
        check: async () => {
          await expect(disclosure).toBeFocused();
          const box = await disclosure.boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
        },
      },
    ],
    views: [view(disclosure.locator(".."), "applied research disclosure")],
  });
  await story.step("research-disclosure-close", {
    actor: "Developer",
    description:
      "Close the research disclosure with Space without changing its recorded outcome.",
    action: async () => {
      await disclosure.focus();
      await page.keyboard.press("Space");
    },
    acknowledgement: {
      spec: "The native disclosure closes with its label and focus preserved.",
      check: async () => {
        await expect(disclosure.locator("..")).not.toHaveAttribute("open");
        await expect(disclosure).toBeFocused();
      },
    },
    verifications: [count(7)],
    views: [view(disclosure, "closed research disclosure")],
  });
  await story.step("narrow-specimens", {
    actor: "Developer",
    description:
      "Switch to phone-width specimens without losing the edited identity or selected portrait.",
    action: async () => {
      await page
        .getByRole("button", { name: "Use phone-width specimens", exact: true })
        .click();
    },
    acknowledgement: {
      spec: "The gallery acknowledges narrow specimens and offers the wide layout again.",
      check: async () =>
        expect(
          page.getByRole("button", { name: "Use wide specimens", exact: true }),
        ).toBeVisible(),
    },
    verifications: [
      {
        spec: "The identity specimen is at most 393px wide, contains every portrait target and preserves its editable state.",
        check: async () => {
          const box = await identity.boundingBox();
          expect(box!.width).toBeLessThanOrEqual(393);
          for (const group of [enabledPortraits, disabledPortraits]) {
            const boundary = await group.boundingBox();
            for (const label of await group.locator("label").all()) {
              const hit = await label.boundingBox();
              expect(hit!.x).toBeGreaterThanOrEqual(boundary!.x);
              expect(hit!.x + hit!.width).toBeLessThanOrEqual(
                boundary!.x + boundary!.width,
              );
            }
          }
          await expect(page.locator("#gallery-name")).toHaveValue(
            "Gallery envoy",
          );
          await expect(
            enabledPortraits.getByRole("radio", {
              name: "The navigator",
              exact: true,
            }),
          ).toBeChecked();
        },
      },
    ],
    views: [view(enabledPortraits, "phone-width portrait specimen")],
  });
  const inventory = section("Icon inventory");
  await story.step("icon-inventory", {
    actor: "Developer",
    description:
      "Inspect every entry/identity glyph with its visible identifier and decorative semantics.",
    action: async () => {},
    acknowledgement: {
      spec: "The gallery lists the complete shared glyph registry.",
      check: async () =>
        expect(inventory.locator(".icon-grid code")).toHaveText(
          Object.keys(icons),
        ),
    },
    verifications: [
      {
        spec: "Each decorative glyph is hidden from assistive technology; real controls supply their names.",
        check: async () => {
          await expect(
            inventory.locator('.icon-grid [aria-hidden="true"]'),
          ).toHaveCount(Object.keys(icons).length);
        },
      },
    ],
    views: [view(inventory, "shared glyph inventory")],
  });
  const provenance = section("Asset provenance");
  await story.step("asset-provenance", {
    actor: "Developer",
    description: "Read the real artwork and font provenance and source link.",
    action: async () => {},
    acknowledgement: {
      spec: "The source link identifies the recorded production asset prompts.",
      check: async () =>
        expect(
          provenance.getByRole("link", {
            name: "Exact prompts and source assets",
            exact: true,
          }),
        ).toHaveAttribute("href", /docs\/art\/PRODUCTION_ASSETS\.md$/),
    },
    verifications: [
      {
        spec: "Artwork, bundled font licences and the absence of generated lettering are disclosed.",
        check: async () => {
          await expect(provenance).toContainText(
            "commissioned imagegen assets",
          );
          await expect(provenance).toContainText("OFL licences");
          await expect(provenance).toContainText("No generated lettering");
        },
      },
    ],
    views: [view(provenance, "asset provenance")],
  });
});
