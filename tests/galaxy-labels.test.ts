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
  });
});
