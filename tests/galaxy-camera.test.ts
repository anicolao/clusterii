import { describe, test, expect } from "bun:test";
import { PerspectiveCamera, Vector3 } from "three";
import { unobscuredChartCenter, frameChartTarget } from "../src/lib/galaxy-camera";
describe("home target framing", () => {
  test("measured phone inspector leaves target in the exposed upper chart", () => {
    const chart = { left: 0, top: 58, right: 393, bottom: 612 };
    const panel = { left: 12, top: 243.609375, right: 381, bottom: 840 };
    const center = unobscuredChartCenter(chart, panel);
    expect(center.x).toBe(0.5);
    expect(chart.top + center.y * (chart.bottom - chart.top)).toBeCloseTo(150.8046875);
    const camera = new PerspectiveCamera(48, 393 / 554, 0.1, 1000);
    const home = new Vector3(3, 0.2, -2), pivot = home.clone();
    camera.position.copy(home).add(new Vector3(0, 19, 15));
    camera.lookAt(pivot); camera.updateMatrixWorld();
    const distance = camera.position.distanceTo(pivot);
    frameChartTarget(camera, pivot, center);
    camera.lookAt(pivot); camera.updateMatrixWorld();
    const projected = home.clone().project(camera);
    expect((projected.x + 1) / 2).toBeCloseTo(center.x, 8);
    expect((1 - projected.y) / 2).toBeCloseTo(center.y, 8);
    expect(camera.position.distanceTo(pivot)).toBeCloseTo(distance, 8);
    expect(home.toArray()).toEqual([3, 0.2, -2]);
  });
  test("unoccluded desktop and short chart centers remain unchanged", () => {
    for (const right of [1024, 1152, 3072]) {
      const chart = { left: 0, top: 58, right, bottom: 720 };
      expect(unobscuredChartCenter(chart, { left: right - 50, top: 80, right: right + 200, bottom: 708 })).toEqual({ x: 0.5, y: 0.5 });
    }
  });
});
