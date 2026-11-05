/** Screen-space cartography; never changes catalogue coordinates or entitlements. */
export type LabelBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  snap?: boolean;
};
export function placeGalaxyLabels(
  labels: LabelBox[],
  width: number,
  height: number,
  pixelRatio = 1,
  exclusions: Pick<LabelBox, "x" | "y" | "width" | "height">[] = [],
): Map<string, { x: number; y: number }> {
  const placed: Pick<LabelBox, "x" | "y" | "width" | "height">[] = [
    ...exclusions,
  ];
  const result = new Map<string, { x: number; y: number }>();
  const gap = 6;
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
    const offsets = [0, -1, 1, -2, 2];
    const candidates = offsets.map((row) => ({
      x: label.x,
      y: label.y + row * (label.height + gap),
    }));
    // A tall reading panel cannot be cleared by changing text rows. Keep the
    // selected name beside its nearest panel edge, without moving its star or
    // changing the player's camera. Ordinary density labels may be omitted.
    if (label.priority >= 3) {
      candidates.push(
        ...exclusions
          .filter(
            (p) =>
              label.x < p.x + p.width + gap &&
              label.x + label.width + gap > p.x &&
              label.y < p.y + p.height + gap &&
              label.y + label.height + gap > p.y,
          )
          .flatMap((p) => [
            {
              x: Math.ceil((p.x + p.width + gap) * pixelRatio) / pixelRatio,
              y: label.y,
            },
            {
              x:
                Math.floor((p.x - label.width - gap) * pixelRatio) / pixelRatio,
              y: label.y,
            },
          ])
          .sort((a, b) => Math.abs(a.x - label.x) - Math.abs(b.x - label.x)),
      );
    }
    for (const position of candidates) {
      const candidate = {
        ...label,
        x: Math.max(gap, Math.min(width - gap - label.width, position.x)),
        y: Math.max(gap, Math.min(height - gap - label.height, position.y)),
      };
      // Text sits on physical pixels, while stars retain their exact catalogue
      // projection. Subpixel camera round trips must not leave labels at a
      // slightly different paint origin after returning to the same viewport.
      if (label.snap !== false) {
        candidate.x = Math.max(
          gap,
          Math.min(
            width - gap - label.width,
            Math.round(candidate.x * pixelRatio) / pixelRatio,
          ),
        );
        candidate.y = Math.max(
          gap,
          Math.min(
            height - gap - label.height,
            Math.round(candidate.y * pixelRatio) / pixelRatio,
          ),
        );
      }
      if (
        placed.some(
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

type Options = { id: string; priority: number; snap?: boolean };
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
    // Foreground messages, commander cards and reading panels must not cut
    // through map labels.
    // Move text around their actual bounds, never the catalogue positions.
    const surface = root.closest(".galaxy-surface");
    const exclusions = [
      ...root.querySelectorAll<HTMLElement>("[data-map-label-exclusion]"),
      ...(root
        .closest(".route-planner")
        ?.querySelectorAll<HTMLElement>(".route-editor") ?? []),
      ...(surface?.querySelectorAll<HTMLElement>(
        ".acknowledgement:not([inert]), .command-rail:not([inert]) [aria-label='Campaign commanders'], .economy-panel, .campaign-records",
      ) ?? []),
    ]
      .filter((node) => getComputedStyle(node).visibility !== "hidden")
      .map((node) => {
        const box = node.getBoundingClientRect();
        return {
          x: box.x - bounds.x,
          y: box.y - bounds.y,
          width: box.width,
          height: box.height,
        };
      })
      .filter((box) => box.width > 0 && box.height > 0);
    const placements = placeGalaxyLabels(
      labels,
      bounds.width,
      bounds.height,
      window.devicePixelRatio || 1,
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
  changes.observe(root.closest(".galaxy-surface") ?? root, {
    attributes: true,
    attributeFilter: ["style", "inert"],
    subtree: true,
    childList: true,
    characterData: true,
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
