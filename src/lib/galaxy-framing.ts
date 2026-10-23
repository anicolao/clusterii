import type { Star } from "../../shared/galaxy";

/** Frame real catalogue coordinates; never move a system or create a route. */
export function galaxyOverview(stars: readonly Star[], aspect: number) {
  if (!stars.length || !Number.isFinite(aspect) || aspect <= 0)
    throw new Error("A catalogue and positive viewport aspect are required");
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (const star of stars) {
    [star.x, star.y, star.z].forEach((value, i) => {
      low[i] = Math.min(low[i], value / 10);
      high[i] = Math.max(high[i], value / 10);
    });
  }
  const target = low.map((value, i) => (value + high[i]) / 2) as [
    number,
    number,
    number,
  ];
  const elevation = Math.PI * 0.36;
  const up = [0, Math.cos(elevation), -Math.sin(elevation)];
  const normal = [0, Math.sin(elevation), Math.cos(elevation)];
  const tangent = Math.tan((48 * Math.PI) / 360);
  let distance = 1;
  for (const star of stars) {
    const d = [
      star.x / 10 - target[0],
      star.y / 10 - target[1],
      star.z / 10 - target[2],
    ];
    const depth = d[1] * normal[1] + d[2] * normal[2];
    const vertical = d[1] * up[1] + d[2] * up[2];
    distance = Math.max(
      distance,
      depth + Math.abs(d[0]) / (tangent * aspect * 0.88),
      depth + Math.abs(vertical) / (tangent * 0.88),
    );
  }
  return {
    target,
    position: target.map((value, i) => value + normal[i] * distance) as [
      number,
      number,
      number,
    ],
  };
}

/** Orient the camera along real route endpoints, preserving every world position. */
export function fleetRouteFrame(
  points: readonly Pick<Star, "x" | "y" | "z">[],
  aspect: number,
) {
  if (!points.length || !Number.isFinite(aspect) || aspect <= 0)
    throw new Error("Route points and positive aspect required");
  const low = [Infinity, Infinity, Infinity],
    high = [-Infinity, -Infinity, -Infinity];
  for (const p of points)
    [p.x, p.y, p.z].forEach((v, i) => {
      low[i] = Math.min(low[i], v / 10);
      high[i] = Math.max(high[i], v / 10);
    });
  const target = low.map((v, i) => (v + high[i]) / 2) as [
    number,
    number,
    number,
  ];
  const first = points[0];
  let end = first,
    extent = 0;
  for (const p of points) {
    const length = Math.hypot(p.x - first.x, p.z - first.z);
    if (length > extent) {
      extent = length;
      end = p;
    }
  }
  const dx = extent ? (end.x - first.x) / extent : 1,
    dz = extent ? (end.z - first.z) / extent : 0;
  const elevation = Math.PI * 0.39,
    normal = [
      -dz * Math.cos(elevation),
      Math.sin(elevation),
      dx * Math.cos(elevation),
    ];
  const right = [dx, 0, dz],
    up = [
      dz * Math.sin(elevation),
      Math.cos(elevation),
      -dx * Math.sin(elevation),
    ];
  const tangent = Math.tan((48 * Math.PI) / 360);
  let distance = 0.18;
  for (const p of points) {
    const d = [
        p.x / 10 - target[0],
        p.y / 10 - target[1],
        p.z / 10 - target[2],
      ],
      dot = (v: number[]) => d.reduce((n, x, i) => n + x * v[i], 0);
    distance = Math.max(
      distance,
      dot(normal) + Math.abs(dot(right)) / (tangent * aspect * 0.68),
      dot(normal) + Math.abs(dot(up)) / (tangent * 0.64),
    );
  }
  return {
    target,
    distance,
    position: target.map((v, i) => v + normal[i] * distance) as [
      number,
      number,
      number,
    ],
  };
}
