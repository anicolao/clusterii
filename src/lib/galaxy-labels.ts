/** Screen-space cartography; never changes catalogue coordinates or entitlements. */
export type LabelBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  /** Projected selected-star glow radius in CSS pixels. */
  clearance?: number;
};
export function placeGalaxyLabels(
  labels: LabelBox[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const placed: LabelBox[] = [];
  const result = new Map<string, { x: number; y: number }>();
  const gap = 6;
  const markers = labels
    .filter((l): l is LabelBox & { clearance: number } => !!l.clearance)
    .map((l) => ({
      x: l.x + l.width / 2 - l.clearance,
      y: l.y + l.height / 2 - l.clearance,
      width: l.clearance * 2,
      height: l.clearance * 2,
    }));
  for (const label of [...labels].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id, "en"),
  )) {
    if (
      label.width <= 0 ||
      label.height <= 0 ||
      label.width > width - 2 * gap ||
      label.height > height - 2 * gap
    )
      continue;
    // Do not pull offscreen systems into view. Priority labels may move inward
    // at an edge, while their star/selection marker retains its exact position.
    const anchorX = label.x + label.width / 2;
    const anchorY = label.y + label.height / 2;
    if (anchorX < 0 || anchorX > width || anchorY < 0 || anchorY > height)
      continue;
    const candidates = label.clearance
      ? [
          [label.x, anchorY - label.clearance - gap - label.height],
          [label.x, anchorY + label.clearance + gap],
          [anchorX + label.clearance + gap, label.y],
          [anchorX - label.clearance - gap - label.width, label.y],
        ]
      : [0, -1, 1, -2, 2].map((row) => [
          label.x,
          label.y + row * (label.height + gap),
        ]);
    for (const [x, y] of candidates) {
      const candidate = {
        ...label,
        x: Math.max(gap, Math.min(width - gap - label.width, x)),
        y: Math.max(gap, Math.min(height - gap - label.height, y)),
      };
      if (
        [...placed, ...markers].some(
          (p) =>
            candidate.x < p.x + p.width + gap &&
            candidate.x + candidate.width + gap > p.x &&
            candidate.y < p.y + p.height + gap &&
            candidate.y + candidate.height + gap > p.y,
        )
      )
        continue;
      placed.push(candidate);
      result.set(label.id, {
        x: candidate.x - label.x,
        y: candidate.y - label.y,
      });
      break;
    }
  }
  return result;
}

type Options = { id: string; priority: number; clearance?: number };
type Entry = { node: HTMLElement; options: Options; x: number; y: number };
const managers = new WeakMap<HTMLElement, ReturnType<typeof createManager>>();
function createManager(root: HTMLElement) {
  const entries = new Set<Entry>();
  let frame = 0;
  let disposed = false;
  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(layout);
  }
  function layout() {
    frame = 0;
    const bounds = root.getBoundingClientRect();
    const labels = [...entries].map((e) => {
      const box = e.node.getBoundingClientRect();
      return {
        ...e.options,
        x: box.x - bounds.x - e.x,
        y: box.y - bounds.y - e.y,
        width: box.width,
        height: box.height,
      };
    });
    const placements = placeGalaxyLabels(labels, bounds.width, bounds.height);
    for (const e of entries) {
      const p = placements.get(e.options.id);
      e.x = p?.x ?? 0;
      e.y = p?.y ?? 0;
      e.node.style.translate = `${e.x}px ${e.y}px`;
      e.node.style.visibility = p ? "visible" : "hidden";
      e.node.dataset.labelPlaced = String(!!p);
    }
  }
  const resize = new ResizeObserver(schedule);
  resize.observe(root);
  const changes = new MutationObserver((records) => {
    if (
      records.some(
        (r) =>
          !(r.target instanceof HTMLElement) ||
          !r.target.hasAttribute("data-map-label"),
      )
    )
      schedule();
  });
  // HTML's projected wrapper transforms change on camera orbit/zoom. Ignore
  // our own label style writes, avoiding continuous render/observer loops.
  changes.observe(root, {
    attributes: true,
    attributeFilter: ["style"],
    subtree: true,
    childList: true,
  });
  void document.fonts.ready.then(schedule);
  return {
    add(entry: Entry) {
      entries.add(entry);
      resize.observe(entry.node);
      schedule();
    },
    update: schedule,
    remove(entry: Entry) {
      entries.delete(entry);
      resize.unobserve(entry.node);
      if (entries.size) schedule();
      else {
        disposed = true;
        resize.disconnect();
        changes.disconnect();
        cancelAnimationFrame(frame);
        managers.delete(root);
      }
    },
  };
}
export function galaxyLabel(node: HTMLElement, options: Options) {
  const root = node.closest<HTMLElement>("[data-galaxy-viewport]");
  if (!root) throw new Error("Galaxy labels require their chart viewport");
  node.dataset.mapLabel = options.id;
  const manager = managers.get(root) ?? createManager(root);
  managers.set(root, manager);
  const entry: Entry = { node, options, x: 0, y: 0 };
  manager.add(entry);
  return {
    update(next: Options) {
      entry.options = next;
      node.dataset.mapLabel = next.id;
      manager.update();
    },
    destroy() {
      manager.remove(entry);
    },
  };
}
