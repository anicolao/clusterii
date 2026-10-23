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
