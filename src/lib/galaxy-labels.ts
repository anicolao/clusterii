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
export type LabelExclusion = Pick<LabelBox, "x" | "y" | "width" | "height">;
export function placeGalaxyLabels(
  labels: LabelBox[],
  width: number,
  height: number,
  exclusions: readonly LabelExclusion[] = [],
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
    // Fixed UI is measured in the same chart coordinate space. Keep ordinary
    // labels near their anchor; selected/focused subjects get a complete set of
    // obstacle-edge candidates so competing overlays cannot suppress the name
    // while a readable rectangle remains available.
    for (const area of exclusions)
      candidates.push(
        [label.x, area.y - gap - label.height],
        [label.x, area.y + area.height + gap],
        [area.x - gap - label.width, label.y],
        [area.x + area.width + gap, label.y],
      );
    if (label.priority >= 3) {
      const obstacles = [...exclusions, ...markers, ...placed];
      const xs = [
        label.x,
        gap,
        width - gap - label.width,
        ...obstacles.flatMap((p) => [
          p.x - gap - label.width,
          p.x + p.width + gap,
        ]),
      ];
      const ys = [
        label.y,
        gap,
        height - gap - label.height,
        ...obstacles.flatMap((p) => [
          p.y - gap - label.height,
          p.y + p.height + gap,
        ]),
      ];
      candidates.push(
        ...xs
          .flatMap((x) => ys.map((y) => [x, y]))
          .sort(
            (a, b) =>
              (a[0] - label.x) ** 2 +
              (a[1] - label.y) ** 2 -
              ((b[0] - label.x) ** 2 + (b[1] - label.y) ** 2),
          ),
      );
    }
    for (const [x, y] of candidates) {
      const candidate = {
        ...label,
        x: Math.max(gap, Math.min(width - gap - label.width, x)),
        y: Math.max(gap, Math.min(height - gap - label.height, y)),
      };
      if (
        [...placed, ...markers, ...exclusions].some(
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
  const scope = root.closest<HTMLElement>("[data-galaxy-label-scope]") ?? root;
  const observedOverlays = new Set<HTMLElement>();
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
    const overlays = [
      ...scope.querySelectorAll<HTMLElement>("[data-galaxy-label-exclusion]"),
    ].filter(
      (node) => (node.closest("[data-galaxy-label-scope]") ?? root) === scope,
    );
    for (const node of observedOverlays)
      if (!overlays.includes(node)) {
        resize.unobserve(node);
        observedOverlays.delete(node);
      }
    const exclusions: LabelExclusion[] = [];
    for (const node of overlays) {
      if (!observedOverlays.has(node)) {
        resize.observe(node);
        observedOverlays.add(node);
      }
      const box = node.getBoundingClientRect();
      if (
        !box.width ||
        !box.height ||
        getComputedStyle(node).visibility === "hidden" ||
        box.right <= bounds.left ||
        box.left >= bounds.right ||
        box.bottom <= bounds.top ||
        box.top >= bounds.bottom
      )
        continue;
      exclusions.push({
        x: box.x - bounds.x,
        y: box.y - bounds.y,
        width: box.width,
        height: box.height,
      });
    }
    const placements = placeGalaxyLabels(
      labels,
      bounds.width,
      bounds.height,
      exclusions,
    );
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
  if (scope !== root) resize.observe(scope);
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
  changes.observe(scope, {
    attributes: true,
    attributeFilter: ["style", "class", "hidden"],
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
