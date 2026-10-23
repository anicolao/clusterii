import { test, expect } from "../helpers/fixtures";
import { TestStepHelper } from "../helpers/test-step-helper";
import { expectReadingTarget } from "../../browser/story-helpers/reading-target";

test("Shared command artwork retains keyboard targets and motion-independent selection", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const story = new TestStepHelper(info, {
    id: "command-control-motion",
    title: "Read and select the shared command instruments",
    inventory: ["UX-03", "UX-15", "UX-16"],
    description:
      "Actual production CommandControl in gallery and lab. Local selection callbacks are not server receipts. Command selection is immediate, with unchanged results under normal/reduced preference; no animation is fast-forwarded.",
  });
  const commands = page.getByRole("region", {
    name: "Command control gallery",
    exact: true,
  });
  for (const reduced of [false, true]) {
    const kind = reduced ? "economy" : "history";
    const control = commands.getByRole("button", { name: kind, exact: true });
    await story.step(
      reduced ? "reduced-gallery-selection" : "normal-gallery-selection",
      {
        actor: "Component reviewer",
        description: `Select ${kind} with the keyboard under ${reduced ? "reduced" : "normal"} system preference; inspect the rounded painted face and complete semantic target.`,
        action: async () => {
          await page.emulateMedia({
            reducedMotion: reduced ? "reduce" : "no-preference",
          });
          if (!reduced) await page.goto("./gallery/");
          await commands.scrollIntoViewIfNeeded();
          await control.focus();
          await page.keyboard.press("Enter");
        },
        acknowledgement: {
          spec: "The actual shared callback updates one current command and the named local status.",
          check: async () => {
            await expect(
              commands.getByRole("status", {
                name: "Command selection demonstration",
              }),
            ).toHaveText(`Selected command preview: ${kind}`);
            await expect(control).toHaveAttribute("aria-current", "true");
            await expect(control).toBeFocused();
          },
        },
        verifications: [
          {
            spec: "Rounded artwork is noninteractive, all corner probes hit the semantic button, and actual motion preference is honored without changing selection semantics.",
            check: async () => {
              await expectReadingTarget(control);
              const style = await control.evaluate((el) => ({
                face: getComputedStyle(el, "::before").borderRadius,
                pointer: getComputedStyle(el, "::before").pointerEvents,
                target: getComputedStyle(el).borderRadius,
              }));
              expect(style).toEqual({
                face: "8px",
                pointer: "none",
                target: "0px",
              });
              await expect(
                commands.locator('[aria-current="true"]'),
              ).toHaveCount(1);
              await expect(
                commands.getByRole("button", {
                  name: "Disabled gallery example",
                  exact: true,
                }),
              ).toBeDisabled();
              expect(
                await page.evaluate(
                  () => matchMedia("(prefers-reduced-motion: reduce)").matches,
                ),
              ).toBe(reduced);
            },
          },
        ],
        views: [
          {
            page,
            player: "Component reviewer",
            surface: "document",
            primary: [control],
            normalMotion: !reduced,
          },
        ],
      },
    );
  }
  for (const reduced of [false, true]) {
    const panel = page.getByRole("region", {
      name: reduced
        ? "Reduced command comparison"
        : "Standard command comparison",
      exact: true,
    });
    const control = panel.getByRole("button", { name: "economy", exact: true });
    await story.step(
      reduced ? "reduced-lab-selection" : "normal-lab-selection",
      {
        actor: "Component reviewer",
        description:
          "Use Space on the actual shared lab control; the local result is identical and does not issue a campaign order.",
        action: async () => {
          await page.emulateMedia({
            reducedMotion: reduced ? "reduce" : "no-preference",
          });
          if (!reduced) await page.goto("./dev/animations/");
          await panel.scrollIntoViewIfNeeded();
          await control.focus();
          await page.keyboard.press("Space");
        },
        acknowledgement: {
          spec: "The selected command and local result agree in this comparison.",
          check: async () => {
            await expect(control).toHaveAttribute("aria-current", "true");
            await expect(
              panel.getByRole("status", { name: "Local command selection" }),
            ).toHaveText("Selected command preview: economy");
          },
        },
        verifications: [
          {
            spec: "Visible keyboard focus and complete corner access remain; both comparisons finish with the same outcome.",
            check: async () => {
              await expect(control).toBeFocused();
              await expectReadingTarget(control);
              if (reduced)
                await expect(
                  page
                    .getByRole("region", {
                      name: "Standard command comparison",
                      exact: true,
                    })
                    .getByRole("status"),
                ).toHaveText("Selected command preview: economy");
              expect(
                await page.evaluate(
                  () => matchMedia("(prefers-reduced-motion: reduce)").matches,
                ),
              ).toBe(reduced);
            },
          },
        ],
        views: [
          {
            page,
            player: "Component reviewer",
            surface: "document",
            primary: [control],
            normalMotion: !reduced,
            // The pre-existing feedback lab deliberately inspects paused frames.
            // Command selection itself remains immediate under the real preference.
            motionInspection: [
              {
                selector: '[aria-label="Standard motion comparison"]',
                count: 1,
                time: 0,
                duration: 180,
              },
              {
                selector: '[aria-label="Reduced motion comparison"]',
                count: 1,
                time: 180,
                duration: 180,
              },
            ],
          },
        ],
      },
    );
  }
});
