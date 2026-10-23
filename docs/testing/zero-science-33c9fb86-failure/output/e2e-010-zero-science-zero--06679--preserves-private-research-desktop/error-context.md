# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/010-zero-science/zero-science.spec.ts >> Live zero science after orbital loss preserves private research
- Location: tests/e2e/010-zero-science/zero-science.spec.ts:79:1

# Error details

```
Error: The entire reading target and both corners remain usable inside every clipping ancestor

The entire reading target and both corners remain usable inside every clipping ancestor

expect(received).toMatchObject(expected)

- Expected  - 1
+ Received  + 1

  Object {
    "contained": true,
-   "hits": true,
+   "hits": false,
  }

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
```

# Test source

```ts
  1  | import { expect, type Locator } from "@playwright/test";
  2  | 
  3  | // Observe without moving the viewport: a later test scroll must not hide a
  4  | // production focus/selection bug. Keep both original corner hit checks.
  5  | export async function expectReadingTarget(target: Locator, hitTest = true) {
  6  |   await expect
  7  |     .poll(
  8  |       () =>
  9  |         target.evaluate((element, hitTest) => {
  10 |           const box = element.getBoundingClientRect();
  11 |           let left = 0,
  12 |             top = 0,
  13 |             right = innerWidth,
  14 |             bottom = innerHeight;
  15 |           for (
  16 |             let parent = element.parentElement;
  17 |             parent;
  18 |             parent = parent.parentElement
  19 |           ) {
  20 |             const style = getComputedStyle(parent),
  21 |               bounds = parent.getBoundingClientRect();
  22 |             if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
  23 |               left = Math.max(left, bounds.left + parent.clientLeft);
  24 |               right = Math.min(
  25 |                 right,
  26 |                 bounds.left + parent.clientLeft + parent.clientWidth,
  27 |               );
  28 |             }
  29 |             if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
  30 |               top = Math.max(top, bounds.top + parent.clientTop);
  31 |               bottom = Math.min(
  32 |                 bottom,
  33 |                 bounds.top + parent.clientTop + parent.clientHeight,
  34 |               );
  35 |             }
  36 |           }
  37 |           const corners = [
  38 |             [box.left + 1, box.top + 1],
  39 |             [box.right - 1, box.bottom - 1],
  40 |             [box.left + box.width / 2, box.top + box.height / 2],
  41 |           ].map(([x, y]) => {
  42 |             const painted = document.elementFromPoint(x, y);
  43 |             return {
  44 |               hit:
  45 |                 !hitTest ||
  46 |                 painted === element ||
  47 |                 (!!painted && element.contains(painted)),
  48 |               painted: painted?.tagName + "." + painted?.className,
  49 |             };
  50 |           });
  51 |           return {
  52 |             rect: box.toJSON(),
  53 |             clip: { left, top, right, bottom },
  54 |             corners,
  55 |             contained:
  56 |               box.width > 0 &&
  57 |               box.height > 0 &&
  58 |               box.left >= left &&
  59 |               box.top >= top &&
  60 |               box.right <= right &&
  61 |               box.bottom <= bottom,
  62 |             hits: corners.every((corner) => corner.hit),
  63 |           };
  64 |         }, hitTest),
  65 |       {
  66 |         message:
  67 |           "The entire reading target and both corners remain usable inside every clipping ancestor",
  68 |       },
  69 |     )
> 70 |     .toMatchObject({ contained: true, hits: true });
     |      ^ Error: The entire reading target and both corners remain usable inside every clipping ancestor
  71 | }
  72 | 
```