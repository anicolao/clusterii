import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { expectReadingTarget } from "../../browser/story-helpers/reading-target";

test("Read shared science ledger in gallery and lab", async ({
  page,
}, info) => {
  const story = new TestStepHelper(info, {
    id: "science-ledger-components",
    title: "Inspect the shared science source instrument",
    inventory: ["UX-03", "UX-08", "UX-16"],
    description:
      "Actual ScienceLedger in reducer-derived gallery/lab specimens. This is component evidence, not live authorization. The ledger itself has no invented animation or pending science values.",
  });
  const ledger = page.getByRole("region", {
    name: "Science sources",
    exact: true,
  });
  const open = page.getByRole("button", {
    name: "Open science source specimen",
    exact: true,
  });
  await story.step("gallery-source", {
    actor: "Component reviewer",
    description:
      "Open the actual shared ledger with Enter and read its lower totals through End.",
    action: async () => {
      await page.goto("./gallery/");
      await open.focus();
      await open.press("Enter");
      await ledger.scrollIntoViewIfNeeded();
      const r = ledger.getByRole("region", {
        name: "Science source ledger",
        exact: true,
      });
      await r.focus();
      await r.press("End");
    },
    acknowledgement: {
      spec: "The reducer-derived component distinguishes initial capacity from pending first delivery.",
      check: async () => {
        await expect(ledger).toContainText("First production pending");
        await expect(ledger.locator(".rate")).toHaveText("+1.4 / tick");
      },
    },
    verifications: [
      {
        spec: "The actual delivered-total reading and Return remain usable inside the component.",
        check: async () => {
          await expectReadingTarget(
            ledger
              .locator("dl > div")
              .filter({ hasText: "Last delivered science" }),
            false,
          );
          await expectReadingTarget(
            ledger.getByRole("button", {
              name: "Return to galaxy",
              exact: true,
            }),
          );
        },
      },
    ],
    views: [
      {
        page,
        player: "Component reviewer",
        surface: "document",
        primary: [
          ledger.getByRole("button", { name: "Return to galaxy", exact: true }),
        ],
      },
    ],
  });
  await ledger
    .getByRole("button", { name: "Return to galaxy", exact: true })
    .press("Enter");
  await expect(open).toBeFocused();
  await expect(ledger).toHaveCount(0);
  const names = ["Standard motion comparison", "Reduced motion comparison"];
  for (const [stage, time] of [
    ["capacity", "1200"],
    ["delivered", "2200"],
  ] as const) {
    await story.step(`lab-${stage}`, {
      actor: "Component reviewer",
      description: `Inspect ${stage} at the actual lab frame using the production ledger in both comparison panels. Seek changes reducer-derived presentation, not game state.`,
      action: async () => {
        if (stage === "capacity") {
          await page.goto("./dev/animations/");
          await page.getByLabel("Scenario").selectOption("science");
        }
        await page.getByRole("slider").fill(time);
        for (const name of names) {
          const panel = page.getByRole("region", { name, exact: true });
          const r = panel.getByRole("region", {
            name: "Science source ledger",
            exact: true,
          });
          await r.focus();
          await r.press("End");
        }
      },
      acknowledgement: {
        spec: "Both comparison panels show the same capacity and the matching completed or pending delivery.",
        check: async () => {
          for (const name of names) {
            const panel = page.getByRole("region", { name, exact: true });
            await expect(panel.locator(".rate")).toHaveText("+1.4 / tick");
            await expect(
              panel
                .locator("dl > div")
                .filter({ hasText: "Last delivered science" }),
            ).toHaveText(
              `Last delivered science ${stage === "capacity" ? "First production pending" : "1.4"}`,
            );
          }
        },
      },
      verifications: [
        {
          spec: "Normal and reduced comparison facts agree; no animation changes a science amount.",
          check: async () => {
            expect(
              await page
                .getByRole("region", { name: names[0], exact: true })
                .locator(".science-ledger")
                .innerText(),
            ).toBe(
              await page
                .getByRole("region", { name: names[1], exact: true })
                .locator(".science-ledger")
                .innerText(),
            );
          },
        },
      ],
      views: names.map((name) => ({
        page,
        player: name,
        surface: "document" as const,
        primary: [
          page
            .getByRole("region", { name, exact: true })
            .getByRole("button", { name: "Return to galaxy", exact: true }),
        ],
      })),
    });
  }
});
