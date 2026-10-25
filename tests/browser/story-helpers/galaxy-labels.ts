import { expect, type Page } from "@playwright/test";

export async function labelGeometry(page: Page) {
  return page.locator(".chart").evaluate((chart) => {
    const viewport = chart.getBoundingClientRect();
    const labels = [
      ...chart.querySelectorAll<HTMLElement>('[data-label-placed="true"]'),
    ]
      .map((node) => {
        const b = node.getBoundingClientRect();
        return {
          id: node.dataset.mapLabel!,
          text: node.textContent,
          x: b.x - viewport.x,
          y: b.y - viewport.y,
          width: b.width,
          height: b.height,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    const failures: string[] = [];
    for (const a of labels) {
      if (
        a.x < 5.9 ||
        a.y < 5.9 ||
        a.x + a.width > viewport.width - 5.9 ||
        a.y + a.height > viewport.height - 5.9
      )
        failures.push(`Edge: ${a.text}`);
      for (const b of labels.filter((b) => a.id < b.id))
        if (
          a.x < b.x + b.width + 5.9 &&
          a.x + a.width + 5.9 > b.x &&
          a.y < b.y + b.height + 5.9 &&
          a.y + a.height + 5.9 > b.y
        )
          failures.push(`Collision: ${a.text} / ${b.text}`);
    }
    return { labels, failures };
  });
}
export async function readableLabels(page: Page) {
  await expect
    .poll(async () => (await labelGeometry(page)).labels.length)
    .toBeGreaterThan(0);
  await expect
    .poll(async () => (await labelGeometry(page)).failures)
    .toEqual([]);
}

/** Visible selected label must be inside the chart and outside the real inspector. */
export async function selectedLabelClearance(page: Page) {
  return page.locator(".star-label").evaluate((label) => {
    const chart = label.closest("[data-galaxy-viewport]")!;
    const panel = chart.parentElement!.querySelector(".system-inspector")!;
    const rect = (el: Element) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    };
    const l = rect(label), c = rect(chart), p = rect(panel);
    return {
      label: l, chart: c, inspector: p,
      contained: l.left >= c.left && l.top >= c.top && l.right <= c.right && l.bottom <= c.bottom,
      occluded: l.left < p.right && l.right > p.left && l.top < p.bottom && l.bottom > p.top,
    };
  });
}
export async function unobscuredSelectedLabel(page: Page) {
  await expect.poll(async () => {
    const bounds = await selectedLabelClearance(page);
    return { contained: bounds.contained, occluded: bounds.occluded };
  }).toEqual({ contained: true, occluded: false });
}
