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
