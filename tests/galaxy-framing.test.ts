import { expect, test } from "bun:test";
import { PerspectiveCamera, Vector3 } from "three";
import { generateGalaxy } from "../shared/galaxy";
import { galaxyOverview } from "../src/lib/galaxy-framing";

test("camera framing contains the unchanged authorized catalogue at phone, desktop, large and short map aspects", () => {
  const stars = generateGalaxy(4, "0123456789abcdef".repeat(4)).stars;
  const before = structuredClone(stars);
  for (const aspect of [393 / 280, 1000 / 700, 2700 / 1700, 890 / 470, 0.5]) {
    const frame = galaxyOverview(stars, aspect);
    const camera = new PerspectiveCamera(48, aspect, 0.1, 1000);
    camera.position.set(...frame.position);
    camera.lookAt(...frame.target);
    camera.updateMatrixWorld();
    const projected = stars.map((s) =>
      new Vector3(s.x / 10, s.y / 10, s.z / 10).project(camera),
    );
    for (const point of projected) {
      expect(Math.abs(point.x)).toBeLessThanOrEqual(0.880001);
      expect(Math.abs(point.y)).toBeLessThanOrEqual(0.880001);
      expect(point.z).toBeGreaterThan(-1);
      expect(point.z).toBeLessThan(1);
    }
    expect(
      Math.max(...projected.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])),
    ).toBeCloseTo(0.88, 5);
  }
  expect(stars).toEqual(before);
  const moved = stars.map((s) => ({ ...s, x: s.x + 500, z: s.z - 200 }));
  const original = galaxyOverview(stars, 1),
    shifted = galaxyOverview(moved, 1);
  expect(shifted.target[0] - original.target[0]).toBeCloseTo(50);
  expect(shifted.target[2] - original.target[2]).toBeCloseTo(-20);
  expect(() => galaxyOverview([], 1)).toThrow();
  expect(() => galaxyOverview(stars, 0)).toThrow();
});

import {
  fleetRouteFrame,
  fleetMarkerPosition,
} from "../src/lib/galaxy-framing";

test("traveling fleet stays on the framed route rather than escaping through world elevation", () => {
  const route = [
    { x: 0, y: 0, z: 0 },
    { x: 3.5, y: 0, z: 0 },
  ];
  for (const aspect of [393 / 280, 1440 / 540, 3840 / 900, 1280 / 320]) {
    const frame = fleetRouteFrame(route, aspect);
    const camera = new PerspectiveCamera(48, aspect, 0.01, 1000);
    camera.position.set(...frame.position);
    camera.lookAt(...frame.target);
    camera.updateMatrixWorld();
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const position = { x: 3.5 * fraction, y: 0, z: 0 };
      const marker = new Vector3(
        ...fleetMarkerPosition(position, true),
      ).project(camera);
      const real = new Vector3(position.x / 10, 0, 0).project(camera);
      expect(marker.distanceTo(real)).toBeLessThan(1e-10);
      expect(Math.abs(marker.x)).toBeLessThanOrEqual(0.68001);
      expect(Math.abs(marker.y)).toBeLessThanOrEqual(0.64001);
    }
  }
  expect(fleetMarkerPosition(route[0], false)).toEqual([0, 0.08, 0]);
  const frame = fleetRouteFrame(route, 1440 / 540);
  const camera = new PerspectiveCamera(48, 1440 / 540, 0.01, 1000);
  camera.position.set(...frame.position);
  camera.lookAt(...frame.target);
  camera.updateMatrixWorld();
  expect(new Vector3(0, 0.08, 0).project(camera).x).toBeLessThan(-1);
});
test("route camera fits actual inclined and reordered endpoints across viewport changes", () => {
  const points = [
    { x: 2, y: 0.3, z: 4 },
    { x: 2.1, y: 0.5, z: 7.5 },
    { x: 4, y: 0.2, z: 8 },
  ];
  const original = structuredClone(points);
  for (const aspect of [0.7, 1.5, 3, 4])
    for (const route of [points, points.toReversed(), [points[0], points[1]]]) {
      const f = fleetRouteFrame(route, aspect),
        camera = new PerspectiveCamera(48, aspect, 0.01, 1000);
      camera.position.set(...f.position);
      camera.lookAt(...f.target);
      camera.updateMatrixWorld();
      const projections = route.map((p) =>
        new Vector3(p.x / 10, p.y / 10, p.z / 10).project(camera),
      );
      for (const p of projections) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(0.68001);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(0.64001);
        expect(p.z).toBeGreaterThan(-1);
        expect(p.z).toBeLessThan(1);
      }
      expect(
        Math.max(...projections.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])),
      ).toBeGreaterThan(0.4);
    }
  expect(points).toEqual(original);
});
