import { expect, type Locator } from "@playwright/test";

// Observe without moving the viewport: a later test scroll must not hide a
// production focus/selection bug. Keep both original corner hit checks.
export async function expectReadingTarget(target: Locator, hitTest = true) {
  await expect
    .poll(
      () =>
        target.evaluate((element, hitTest) => {
          const box = element.getBoundingClientRect();
          let left = 0,
            top = 0,
            right = innerWidth,
            bottom = innerHeight;
          for (
            let parent = element.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            const style = getComputedStyle(parent),
              bounds = parent.getBoundingClientRect();
            if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
              left = Math.max(left, bounds.left + parent.clientLeft);
              right = Math.min(
                right,
                bounds.left + parent.clientLeft + parent.clientWidth,
              );
            }
            if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
              top = Math.max(top, bounds.top + parent.clientTop);
              bottom = Math.min(
                bottom,
                bounds.top + parent.clientTop + parent.clientHeight,
              );
            }
          }
          const corners = [
            [box.left + 1, box.top + 1],
            [box.right - 1, box.bottom - 1],
            [box.left + box.width / 2, box.top + box.height / 2],
          ].map(([x, y]) => {
            const painted = document.elementFromPoint(x, y);
            return {
              hit:
                !hitTest ||
                painted === element ||
                (!!painted && element.contains(painted)),
              painted: painted?.tagName + "." + painted?.className,
            };
          });
          return {
            rect: box.toJSON(),
            clip: { left, top, right, bottom },
            corners,
            contained:
              box.width > 0 &&
              box.height > 0 &&
              box.left >= left &&
              box.top >= top &&
              box.right <= right &&
              box.bottom <= bottom,
            hits: corners.every((corner) => corner.hit),
          };
        }, hitTest),
      {
        message:
          "The entire reading target and both corners remain usable inside every clipping ancestor",
      },
    )
    .toMatchObject({ contained: true, hits: true });
}
