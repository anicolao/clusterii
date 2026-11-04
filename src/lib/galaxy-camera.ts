import { type PerspectiveCamera, Vector3 } from "three";

type Rect = { left: number; top: number; right: number; bottom: number };
export type ChartCenter = { x: number; y: number };

/** Keep ordinary framing unless the inspector covers the chart's center. */
export function unobscuredChartCenter(
  chart: Rect,
  inspector: Rect,
): ChartCenter {
  const width = chart.right - chart.left;
  const height = chart.bottom - chart.top;
  const x = (chart.left + chart.right) / 2;
  const y = (chart.top + chart.bottom) / 2;
  if (
    x <= inspector.left ||
    x >= inspector.right ||
    y <= inspector.top ||
    y >= inspector.bottom
  )
    return { x: 0.5, y: 0.5 };
  // DOMRect coordinates are prototype accessors; object spread would lose them.
  const bounds = {
    left: chart.left,
    top: chart.top,
    right: chart.right,
    bottom: chart.bottom,
  };
  const free = [
    { ...bounds, bottom: Math.max(chart.top, inspector.top) },
    { ...bounds, top: Math.min(chart.bottom, inspector.bottom) },
    { ...bounds, right: Math.max(chart.left, inspector.left) },
    { ...bounds, left: Math.min(chart.right, inspector.right) },
  ].sort(
    (a, b) =>
      (b.right - b.left) * (b.bottom - b.top) -
      (a.right - a.left) * (a.bottom - a.top),
  )[0];
  return {
    x: ((free.left + free.right) / 2 - chart.left) / width,
    y: ((free.top + free.bottom) / 2 - chart.top) / height,
  };
}

/** Pan camera and orbit pivot together; catalogue coordinates never move. */
export function frameChartTarget(
  camera: PerspectiveCamera,
  pivot: Vector3,
  center: ChartCenter,
) {
  const halfHeight =
    camera.position.distanceTo(pivot) *
    Math.tan((camera.getEffectiveFOV() * Math.PI) / 360);
  const pan = new Vector3(
    -(2 * center.x - 1) * halfHeight * camera.aspect,
    -(1 - 2 * center.y) * halfHeight,
    0,
  ).applyQuaternion(camera.quaternion);
  camera.position.add(pan);
  pivot.add(pan);
}
