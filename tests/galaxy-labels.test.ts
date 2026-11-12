import { describe, expect, test } from "bun:test";
import { placeGalaxyLabels, type LabelBox } from "../src/lib/galaxy-labels";
const box = (id: string, x: number, y: number, priority = 0): LabelBox => ({
  id,
  x,
  y,
  priority,
  width: 100,
  height: 18,
});
function readable(labels: LabelBox[], width: number, height: number) {
  const placed = placeGalaxyLabels(labels, width, height);
  const boxes = labels
    .filter((l) => placed.has(l.id))
    .map((l) => ({
      ...l,
      x: l.x + placed.get(l.id)!.x,
      y: l.y + placed.get(l.id)!.y,
    }));
  for (const a of boxes) {
    expect(a.x).toBeGreaterThanOrEqual(6);
    expect(a.y).toBeGreaterThanOrEqual(6);
    expect(a.x + a.width).toBeLessThanOrEqual(width - 6);
    expect(a.y + a.height).toBeLessThanOrEqual(height - 6);
    for (const b of boxes.filter((b) => b.id !== a.id))
      expect(
        a.x >= b.x + b.width + 6 ||
          b.x >= a.x + a.width + 6 ||
          a.y >= b.y + b.height + 6 ||
          b.y >= a.y + a.height + 6,
      ).toBe(true);
  }
  return placed;
}
describe("galaxy label cartography", () => {
  test("route labels preserve clear projected paint origins while separating collisions", () => {
    const origin = { ...box("origin", 24.25, 145.375, 4), snap: false };
    expect(placeGalaxyLabels([origin], 393, 256).get(origin.id)).toEqual({
      x: 0,
      y: 0,
    });
    const waypoint = { ...box("waypoint", 40.125, 145.375, 4), snap: false };
    const original = structuredClone([origin, waypoint]);
    const placements = readable([origin, waypoint], 393, 256);
    expect(placements.size).toBe(2);
    expect(placements.get(origin.id)).toEqual({ x: 0, y: 0 });
    expect(placements.get(waypoint.id)!.y).not.toBe(0);
    expect([origin, waypoint]).toEqual(original);
    const covered = { ...box("route-end", 1100.25, 210.375, 4), snap: false };
    const editor = { x: 964, y: 12, width: 460, height: 540 };
    const offset = placeGalaxyLabels([covered], 1440, 566, 1, [editor]).get(
      covered.id,
    )!;
    expect(offset).toBeDefined();
    expect(covered.x + offset.x + covered.width + 6).toBeLessThanOrEqual(
      editor.x,
    );
  });
  test("selected name clears a tall reading panel without moving its anchor and restores on close", () => {
    for (const [width, height] of [
      [393, 852],
      [1440, 1000],
      [1280, 720],
      [3840, 2160],
    ]) {
      const panel = { x: 12, y: 100, width: width / 3, height: height - 120 };
      const label = box("selected", panel.x + panel.width - 70, 300, 3);
      const original = structuredClone(label);
      const otherPanel = {
        x: width - 110,
        y: 100,
        width: 100,
        height: height - 120,
      };
      const offset = placeGalaxyLabels([label], width, height, 1, [
        panel,
        otherPanel,
      ]).get("selected")!;
      expect(offset).toBeDefined();
      expect(label.x + offset.x).toBeGreaterThanOrEqual(
        panel.x + panel.width + 6,
      );
      expect(label.x + offset.x + label.width + 6).toBeLessThanOrEqual(
        otherPanel.x,
      );
      expect(label.y + offset.y).toBe(label.y);
      expect(label).toEqual(original);
      expect(placeGalaxyLabels([label], width, height).get("selected")).toEqual(
        { x: Math.round(label.x) - label.x, y: 0 },
      );
    }
  });
  test("selected label clears a real acknowledgement and returns when it closes", () => {
    const label = box("selected", 260, 100, 3);
    const original = structuredClone(label);
    const message = { x: 20, y: 112, width: 760, height: 24 };
    const deck = { x: 0, y: 0, width: 400, height: 90 };
    const offset = placeGalaxyLabels([label], 900, 600, 1, [message, deck]).get(
      "selected",
    )!;
    expect(offset).toBeDefined();
    expect(label.y + offset.y).toBeGreaterThanOrEqual(
      message.y + message.height + 6,
    );
    expect(label.y + offset.y).toBeGreaterThanOrEqual(deck.y + deck.height + 6);
    expect(label).toEqual(original);
    expect(placeGalaxyLabels([label], 900, 600).get("selected")).toEqual({
      x: 0,
      y: 0,
    });
  });
  test("resize round-trip projection noise preserves the physical text origin without changing catalogue anchors", () => {
    for (const pixelRatio of [1, 2]) {
      const positions = [133.35598754882812, 133.35597229003906].map((y) => {
        const label = {
          ...box("tupa", 290.99090576171875, y),
          width: 42.609375,
          height: 14,
        };
        const original = structuredClone(label);
        const offset = placeGalaxyLabels([label], 1024, 600, pixelRatio).get(
          "tupa",
        )!;
        expect(label).toEqual(original);
        return { x: label.x + offset.x, y: label.y + offset.y };
      });
      expect(positions[0]).toEqual(positions[1]);
      expect(positions[0].x * pixelRatio).toBeInteger();
      expect(positions[0].y * pixelRatio).toBeInteger();
    }
  });
  test("retained phone overlap separates home from Tupã without changing stars", () => {
    const labels = [box("tupa", 46, 155), box("tania", 11, 161, 2)];
    const original = structuredClone(labels);
    const p = readable(labels, 393, 794);
    expect(p.size).toBe(2);
    expect(p.get("tania")).toEqual({ x: 0, y: 0 });
    expect(p.get("tupa")!.y).not.toBe(0);
    expect(labels).toEqual(original);
    expect(placeGalaxyLabels([...labels].reverse(), 393, 794)).toEqual(p);
  });
  test("selected then home then owned retain priority in a crowded viewport", () => {
    const labels = Array.from({ length: 20 }, (_, i) =>
      box(`s${i}`, 10, 10, i === 19 ? 3 : i === 18 ? 2 : i === 17 ? 1 : 0),
    );
    const p = readable(labels, 150, 110);
    expect(p.has("s19")).toBe(true);
    expect(p.has("s18")).toBe(true);
    expect(p.has("s17")).toBe(true);
    expect(p.size).toBeLessThan(labels.length);
  });
  test("edges stay contained, offscreen anchors stay offscreen, resize recomputes", () => {
    const labels = [
      box("left", -30, 2, 3),
      box("right", 330, 790, 2),
      box("outside", 500, 50),
    ];
    const phone = readable(labels, 393, 820);
    expect(phone.has("left")).toBe(true);
    expect(phone.has("right")).toBe(true);
    expect(phone.has("outside")).toBe(false);
    const desktop = readable(labels, 1440, 1000);
    expect(desktop.has("outside")).toBe(true);
    expect(readable(labels, 393, 820)).toEqual(phone);
    expect(placeGalaxyLabels(labels, 80, 20).size).toBe(0);
    expect(
      placeGalaxyLabels(
        [{ ...box("behind-camera", 0, 0, 3), width: 0, height: 0 }],
        393,
        820,
      ).size,
    ).toBe(0);
  });
});
