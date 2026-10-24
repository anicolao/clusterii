import { expect, type Page } from "@playwright/test";
import type { TestStepHelper } from "../helpers/test-step-helper";
import { expectReadingTarget } from "../../browser/story-helpers/reading-target";

export const scienceResourceOpener = (page: Page) =>
  page.getByRole("button", {
    name:
      (page.viewportSize()?.width ?? 1440) <= 700
        ? "Empire resources"
        : "Inspect science per tick",
    exact: true,
  });
export async function openScienceResource(page: Page) {
  await scienceResourceOpener(page).focus();
  await page.keyboard.press("Enter");
  if ((page.viewportSize()?.width ?? 1440) <= 700) {
    const science = page
      .getByRole("navigation", { name: "Empire ledgers" })
      .getByRole("button", { name: "Inspect science per tick", exact: true });
    await science.focus();
    await science.press("Enter");
  }
}

/** Mounted production ledger, reusing the caller's real acknowledged campaign. */
export async function inspectLedgerMotion(
  story: TestStepHelper,
  scope: string,
  actors: {
    page: Page;
    name: string;
    tick: number;
    rate: number;
    delivered: number;
    sources: string[];
  }[],
  verifyFacts: () => Promise<void>,
) {
  const amount = (n: number) =>
    (n / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
  const ledger = (p: Page) =>
    p.getByRole("region", { name: "Science sources", exact: true });
  const reading = (p: Page) =>
    ledger(p).getByRole("region", {
      name: "Science source ledger",
      exact: true,
    });
  const opener = scienceResourceOpener;
  const close = (p: Page) =>
    ledger(p).getByRole("button", { name: "Return to galaxy", exact: true });
  for (const reduced of [false, true]) {
    const mode = reduced ? "reduced" : "normal";
    const views = () =>
      actors.map((a) => ({
        page: a.page,
        player: a.name,
        surface: "game" as const,
        normalMotion: !reduced,
        primary: [close(a.page)],
      }));
    const facts = {
      spec: "Authorized rates, delivered output, source ownership and accepted command state remain unchanged by local reading or motion preference.",
      check: verifyFacts,
    };
    const check = async () => {
      for (const a of actors) {
        expect(
          await a.page.evaluate(
            () => matchMedia("(prefers-reduced-motion: reduce)").matches,
          ),
        ).toBe(reduced);
        await expect(ledger(a.page).locator(".rate")).toHaveText(
          `+${amount(a.rate)} / tick`,
        );
        await expect(ledger(a.page).getByRole("status")).toContainText(
          `Confirmed tick ${a.tick}`,
        );
        await expect(ledger(a.page).locator("article h4")).toHaveText(
          a.sources,
        );
        await expect(
          ledger(a.page)
            .locator("dl > div")
            .filter({ hasText: "Last delivered science" }),
        ).toHaveText(`Last delivered science ${amount(a.delivered)}`);
      }
    };
    await story.step(`${scope}-${mode}-ledger`, {
      actor: actors[0].name,
      description: `Reload the existing acknowledged campaign with ${mode} motion, open its actual science rail using Enter, then Tab into the bounded ledger. No campaign command is sent.`,
      action: async () => {
        for (const a of actors) {
          await a.page.emulateMedia({
            reducedMotion: reduced ? "reduce" : "no-preference",
          });
          await a.page.reload();
          await openScienceResource(a.page);
          await expect(
            ledger(a.page).getByRole("heading", {
              name: "Science per tick",
              exact: true,
            }),
          ).toBeFocused();
          await a.page.keyboard.press("Tab");
          await expect(reading(a.page)).toBeFocused();
          await reading(a.page).press("Home");
        }
      },
      acknowledgement: {
        spec: "The mounted private ledger recovers the confirmed tick, current capacity and delivered output under the selected motion preference.",
        check,
      },
      verifications: [
        facts,
        {
          spec: "Top basis and primary Return remain fully inside their clipping ancestors; keyboard reading does not move the game document.",
          check: async () => {
            for (const a of actors) {
              await expectReadingTarget(
                ledger(a.page).getByRole("status"),
                false,
              );
              await expectReadingTarget(close(a.page));
              expect(await a.page.evaluate(() => window.scrollY)).toBe(0);
              expect(await reading(a.page).evaluate((e) => e.scrollTop)).toBe(
                0,
              );
            }
          },
        },
      ],
      views: views(),
    });
    await story.step(`${scope}-${mode}-totals`, {
      actor: actors[0].name,
      description:
        "Press End in the focused ledger to read delivered science and assumptions, while the return action remains available.",
      action: async () => {
        for (const a of actors) await reading(a.page).press("End");
      },
      acknowledgement: {
        spec: "Keyboard reading reaches the actual delivered total without changing the acknowledged rate or server facts.",
        check,
      },
      verifications: [
        facts,
        {
          spec: "Delivered total and Return are contained before capture; only the bounded reading region scrolls.",
          check: async () => {
            for (const a of actors) {
              await expectReadingTarget(
                ledger(a.page)
                  .locator("dl > div")
                  .filter({ hasText: "Last delivered science" }),
                false,
              );
              await expectReadingTarget(close(a.page));
              expect(await a.page.evaluate(() => window.scrollY)).toBe(0);
              const range = await reading(a.page).evaluate((e) => ({
                top: e.scrollTop,
                max: e.scrollHeight - e.clientHeight,
              }));
              expect(Math.abs(range.top - range.max)).toBeLessThanOrEqual(1);
            }
          },
        },
      ],
      views: views(),
    });
    await story.step(`${scope}-${mode}-return`, {
      actor: actors[0].name,
      description: `Home returns the same reading region to its basis, then ${reduced ? "Return to galaxy" : "Escape"} closes the ledger and restores its real rail opener.`,
      action: async () => {
        for (const a of actors) {
          await reading(a.page).press("Home");
          await expectReadingTarget(ledger(a.page).getByRole("status"), false);
          expect(await reading(a.page).evaluate((e) => e.scrollTop)).toBe(0);
          expect(await a.page.evaluate(() => window.scrollY)).toBe(0);
          if (reduced) {
            await close(a.page).focus();
            await close(a.page).press("Enter");
          } else await a.page.keyboard.press("Escape");
        }
      },
      acknowledgement: {
        spec: "The ledger closes and focus returns to the science resource control, without sending a command.",
        check: async () => {
          for (const a of actors) {
            await expect(ledger(a.page)).toHaveCount(0);
            await expect(opener(a.page)).toBeFocused();
            await expectReadingTarget(opener(a.page));
          }
        },
      },
      verifications: [facts],
      views: actors.map((a) => ({
        page: a.page,
        player: a.name,
        surface: "game" as const,
        normalMotion: !reduced,
        primary: [opener(a.page)],
      })),
    });
  }
}
