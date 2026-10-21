/** Read-only geometry audit: it never scrolls a primary action into view. */
export function assertScreenFit({ surface }: { surface: "game" | "document" }) {
  const failures: string[] = [];
  if (document.documentElement.scrollWidth > innerWidth)
    failures.push("Document overflows horizontally");
  if (surface === "game" && document.documentElement.scrollHeight > innerHeight)
    failures.push("Game document scrolls vertically");
  const rect = (e: Element) => e.getBoundingClientRect();
  const painted = (e: HTMLElement) => {
    const r = rect(e);
    const box = {
      left: Math.max(0, r.left),
      top: Math.max(0, r.top),
      right: Math.min(innerWidth, r.right),
      bottom: Math.min(innerHeight, r.bottom),
    };
    for (let parent = e.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent),
        clip = rect(parent);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        box.left = Math.max(box.left, clip.left + parent.clientLeft);
        box.right = Math.min(
          box.right,
          clip.left + parent.clientLeft + parent.clientWidth,
        );
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        box.top = Math.max(box.top, clip.top + parent.clientTop);
        box.bottom = Math.min(
          box.bottom,
          clip.top + parent.clientTop + parent.clientHeight,
        );
      }
    }
    return box;
  };
  const visible = (e: Element) => {
    const b = rect(e),
      s = getComputedStyle(e);
    return (
      e.checkVisibility({
        visibilityProperty: true,
        contentVisibilityAuto: true,
      }) &&
      b.width > 0 &&
      b.height > 0 &&
      s.visibility === "visible" &&
      s.display !== "none"
    );
  };
  const describe = (e: Element) =>
    e.getAttribute("aria-label") ||
    e.textContent?.trim().slice(0, 80) ||
    e.tagName;
  const targets = [
    ...document.querySelectorAll<HTMLElement>(
      'button,summary,a[href],input:not([type="hidden"]),select,textarea,[role="button"]',
    ),
  ].filter(visible);
  const audited: HTMLElement[] = [];
  for (const target of targets) {
    if (target.closest("[inert]")) continue;
    const b = rect(target);
    // Radio inputs use their real labelled hit surface; never a 1px hidden box.
    const hit =
      (target instanceof HTMLInputElement &&
        ["radio", "checkbox"].includes(target.type) &&
        target.labels?.[0]) ||
      target;
    const h = rect(hit);
    if (h.width < 44 || h.height < 44)
      failures.push(
        `Target under 44px: ${describe(hit)} (${h.width}×${h.height})`,
      );
    let scroll: HTMLElement | null = null;
    for (
      let parent = target.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent);
      if (
        (/auto|scroll/.test(style.overflowY) &&
          parent.scrollHeight > parent.clientHeight) ||
        (/auto|scroll/.test(style.overflowX) &&
          parent.scrollWidth > parent.clientWidth)
      ) {
        scroll = parent;
        break;
      }
    }
    const inViewport =
      b.left >= 0 &&
      b.top >= 0 &&
      b.right <= innerWidth + 0.1 &&
      b.bottom <= innerHeight + 0.1;
    if (!inViewport && !scroll && surface !== "document")
      failures.push(
        `Target outside viewport without a bounded scroller: ${describe(target)}`,
      );
    if (!inViewport) continue;
    const top = document.elementFromPoint(
      b.x + b.width / 2,
      b.y + b.height / 2,
    );
    if (
      !top ||
      !(target.contains(top) || hit.contains(top) || top === target)
    ) {
      // An offscreen row may be clipped by its declared bounded reading region.
      if (scroll) {
        const r = rect(scroll);
        if (
          b.top < r.top ||
          b.bottom > r.bottom ||
          b.left < r.left ||
          b.right > r.right
        )
          continue;
      }
      // Inactive scenes behind a modal are covered intentionally, not active targets.
      if (
        document.querySelector('dialog[open],[aria-modal="true"]') &&
        !target.closest('dialog[open],[aria-modal="true"]')
      )
        continue;
      failures.push(`Active target is occluded: ${describe(target)}`);
      continue;
    }
    if (hit instanceof HTMLElement && !audited.includes(hit)) audited.push(hit);
  }
  for (let i = 0; i < audited.length; i++)
    for (let j = i + 1; j < audited.length; j++) {
      const a = audited[i],
        b = audited[j];
      if (a.contains(b) || b.contains(a)) continue;
      const x = painted(a),
        y = painted(b),
        width = Math.min(x.right, y.right) - Math.max(x.left, y.left),
        height = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
      if (width > 1 && height > 1)
        failures.push(
          `Active targets overlap: ${describe(a)} / ${describe(b)}`,
        );
    }
  if (failures.length) throw new Error(failures.join("\n"));
}
