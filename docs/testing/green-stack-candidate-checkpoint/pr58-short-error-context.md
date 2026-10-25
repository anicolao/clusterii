# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fleet-reorganization.story.spec.ts >> Live fleet reorganization recovers one private split and conserves forces
- Location: tests/browser/fleet-reorganization.story.spec.ts:45:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Commander name')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByLabel('Commander name')

```

```yaml
- main:
  - region "Your identity":
    - text: Your command
    - button "Close"
    - paragraph: An empire begins with you
    - heading "Make your name." [level=1]
    - paragraph: The face your allies trust. The name your rivals remember.
    - status: Retrieving your identity…
    - button "Sign out"
    - button "Save identity" [disabled]
```

# Test source

```ts
  1   | import { useEmulatorAuthAssets } from "./story-helpers/emulator-auth-assets";
  2   | import { expect, type Page, type Locator } from "@playwright/test";
  3   | export async function login(page: Page, email: string, destination = "./") {
  4   |   await page.goto(destination);
  5   |   await authenticate(page, email);
> 6   |   await expect(page.getByLabel("Commander name")).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  7   | }
  8   | export async function authenticate(page: Page, email: string) {
  9   |   await useEmulatorAuthAssets(page.context());
  10  |   const opening = page.waitForEvent("popup");
  11  |   await page.getByRole("button", { name: "Play", exact: true }).click();
  12  |   const popup = await opening;
  13  |   await expect(popup.locator("#title .provider-name")).toHaveText("Google.com");
  14  |   await expect(
  15  |     popup.getByRole("button", { name: "Add new account" }),
  16  |   ).toBeVisible();
  17  |   await popup.getByRole("button", { name: "Add new account" }).click();
  18  |   await popup.getByLabel("Email", { exact: true }).fill(email);
  19  |   await popup.getByLabel("Display name", { exact: true }).fill("Commander");
  20  |   await popup.getByRole("button", { name: /Sign in with/ }).click();
  21  | }
  22  | export async function geometry(page: Page, scope: Page | Locator = page) {
  23  |   // Responsive panels keep alternate navigation hidden. Test every rendered
  24  |   // target, including offscreen targets in bounded scrolling panels.
  25  |   const targets = scope.locator(
  26  |     ':is(button, input[type="radio"], input[type="checkbox"], input[type="text"], input:not([type])):visible',
  27  |   );
  28  |   for (const target of await targets.all()) {
  29  |     await target.scrollIntoViewIfNeeded();
  30  |     const b = await target.boundingBox();
  31  |     expect(b).not.toBeNull();
  32  |     if (!b) continue;
  33  |     expect(b.width).toBeGreaterThanOrEqual(44);
  34  |     expect(b.height).toBeGreaterThanOrEqual(44);
  35  |     const viewport = page.viewportSize()!;
  36  |     expect(b.x).toBeGreaterThanOrEqual(0);
  37  |     expect(b.y).toBeGreaterThanOrEqual(0);
  38  |     expect(b.x + b.width).toBeLessThanOrEqual(viewport.width + 0.1);
  39  |     expect(b.y + b.height).toBeLessThanOrEqual(viewport.height + 0.1);
  40  |     const obscured = await target.evaluate((el) => {
  41  |       const r = el.getBoundingClientRect();
  42  |       const top = document.elementFromPoint(
  43  |         r.x + r.width / 2,
  44  |         r.y + r.height / 2,
  45  |       );
  46  |       return !top || !(el === top || el.contains(top) || top.contains(el));
  47  |     });
  48  |     expect(obscured).toBe(false);
  49  |   }
  50  |   const overlap = await targets.evaluateAll((elements) => {
  51  |     const boxes = elements.map((el) => {
  52  |       const rect = el.getBoundingClientRect();
  53  |       const box = {
  54  |         left: Math.max(0, rect.left),
  55  |         top: Math.max(0, rect.top),
  56  |         right: Math.min(innerWidth, rect.right),
  57  |         bottom: Math.min(innerHeight, rect.bottom),
  58  |       };
  59  |       // Compare rendered target portions, not offscreen content behind a bounded
  60  |       // scroll container. Sticky controls still count wherever they are painted.
  61  |       for (
  62  |         let ancestor = el.parentElement;
  63  |         ancestor;
  64  |         ancestor = ancestor.parentElement
  65  |       ) {
  66  |         const style = getComputedStyle(ancestor),
  67  |           clip = ancestor.getBoundingClientRect();
  68  |         if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
  69  |           box.left = Math.max(box.left, clip.left + ancestor.clientLeft);
  70  |           box.right = Math.min(
  71  |             box.right,
  72  |             clip.left + ancestor.clientLeft + ancestor.clientWidth,
  73  |           );
  74  |         }
  75  |         if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
  76  |           box.top = Math.max(box.top, clip.top + ancestor.clientTop);
  77  |           box.bottom = Math.min(
  78  |             box.bottom,
  79  |             clip.top + ancestor.clientTop + ancestor.clientHeight,
  80  |           );
  81  |         }
  82  |       }
  83  |       return box;
  84  |     });
  85  |     return boxes.some((a, i) =>
  86  |       boxes.some(
  87  |         (b, j) =>
  88  |           j > i &&
  89  |           Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
  90  |           Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
  91  |       ),
  92  |     );
  93  |   });
  94  |   expect(overlap).toBe(false);
  95  |   expect(
  96  |     await page.evaluate(
  97  |       () =>
  98  |         document.documentElement.scrollWidth > innerWidth ||
  99  |         document.documentElement.scrollHeight > innerHeight,
  100 |     ),
  101 |   ).toBe(false);
  102 | }
  103 | 
  104 | export async function grantDeveloper(email: string) {
  105 |   const list = await fetch(
  106 |     "http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/projects/demo-clusterii/accounts:lookup",
```